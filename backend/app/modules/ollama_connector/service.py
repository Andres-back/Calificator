from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ollama_connector.models import (
    OllamaConnector,
    OllamaConnectorJob,
    OllamaConnectorModel,
    OllamaPairingCode,
)
from app.modules.ollama_connector.schemas import ConnectorModelWrite
from app.services.ai_credentials_service import decrypt_ai_secret, encrypt_ai_secret
from app.core.logging import get_logger


PAIRING_TTL_MINUTES = 10
LEASE_SECONDS = 90
JOB_TTL_HOURS = 24
ALLOWED_CAPABILITIES = {"text", "vision", "embedding"}
logger = get_logger(__name__)


class LocalInferencePending(RuntimeError):
    """A durable local inference is waiting outside the web/worker process."""

    def __init__(self, connector_job_id: UUID) -> None:
        super().__init__("La inferencia local continúa en el computador vinculado")
        self.connector_job_id = connector_job_id


class LocalInferenceFailed(RuntimeError):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _pairing_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    raw = "".join(secrets.choice(alphabet) for _ in range(12))
    return raw[:4] + "-" + raw[4:8] + "-" + raw[8:]


async def create_pairing_code(db: AsyncSession, profesor_id: UUID) -> tuple[str, datetime]:
    now = _now()
    await db.execute(
        update(OllamaPairingCode)
        .where(OllamaPairingCode.profesor_id == profesor_id, OllamaPairingCode.used_at.is_(None))
        .values(expires_at=now)
    )
    code = _pairing_code()
    expires_at = now + timedelta(minutes=PAIRING_TTL_MINUTES)
    db.add(OllamaPairingCode(profesor_id=profesor_id, code_hash=_hash(code), expires_at=expires_at))
    await db.commit()
    return code, expires_at


async def pair_connector(
    db: AsyncSession,
    *,
    code: str,
    name: str,
    platform: str,
    version: str | None,
) -> tuple[OllamaConnector, str]:
    now = _now()
    pairing = await db.scalar(
        select(OllamaPairingCode)
        .where(
            OllamaPairingCode.code_hash == _hash(code.strip().upper()),
            OllamaPairingCode.used_at.is_(None),
            OllamaPairingCode.expires_at > now,
        )
        .with_for_update()
    )
    if not pairing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El código venció, ya fue usado o no es válido")
    token = secrets.token_urlsafe(40)
    connector = OllamaConnector(
        profesor_id=pairing.profesor_id,
        name=name.strip(),
        platform=platform,
        version=version,
        secret_hash=_hash(token),
        status="connected",
        last_seen_at=now,
    )
    db.add(connector)
    await db.flush()
    pairing.used_at = now
    pairing.connector_id = connector.id
    await db.commit()
    await db.refresh(connector)
    return connector, token


async def authenticate_connector(db: AsyncSession, token: str) -> OllamaConnector:
    connector = await db.scalar(
        select(OllamaConnector).where(
            OllamaConnector.secret_hash == _hash(token),
            OllamaConnector.active.is_(True),
            OllamaConnector.revoked_at.is_(None),
        )
    )
    if not connector:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Conector no autorizado")
    connector.status = "connected"
    connector.last_seen_at = _now()
    await db.flush()
    return connector


async def list_connectors(db: AsyncSession, profesor_id: UUID) -> list[dict]:
    connectors = list(
        await db.scalars(
            select(OllamaConnector)
            .where(OllamaConnector.profesor_id == profesor_id)
            .order_by(OllamaConnector.created_at.desc())
        )
    )
    result: list[dict] = []
    for connector in connectors:
        models = list(
            await db.scalars(
                select(OllamaConnectorModel).where(
                    OllamaConnectorModel.connector_id == connector.id,
                    OllamaConnectorModel.available.is_(True),
                )
            )
        )
        live = bool(connector.active and connector.last_seen_at and connector.last_seen_at >= _now() - timedelta(minutes=2))
        result.append(
            {
                "id": connector.id,
                "name": connector.name,
                "platform": connector.platform,
                "version": connector.version,
                "status": "connected" if live else ("revoked" if not connector.active else "disconnected"),
                "active": connector.active,
                "last_seen_at": connector.last_seen_at,
                "models": [
                    {"model_id": item.model_id, "capabilities": item.capabilities or ["text"]}
                    for item in models
                ],
            }
        )
    return result


async def revoke_connector(db: AsyncSession, *, connector_id: UUID, profesor_id: UUID) -> None:
    connector = await db.scalar(
        select(OllamaConnector)
        .where(OllamaConnector.id == connector_id, OllamaConnector.profesor_id == profesor_id)
        .with_for_update()
    )
    if not connector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conector no encontrado")
    connector.active = False
    connector.status = "revoked"
    connector.revoked_at = _now()
    connector.secret_hash = _hash(secrets.token_urlsafe(40))
    await db.execute(
        update(OllamaConnectorJob)
        .where(
            OllamaConnectorJob.connector_id == connector.id,
            OllamaConnectorJob.status.in_(["leased", "running"]),
        )
        .values(status="waiting_connector", connector_id=None, lease_token_hash=None, lease_expires_at=None)
    )
    await db.flush()
    has_alternative = await db.scalar(
        select(OllamaConnector.id).where(
            OllamaConnector.profesor_id == profesor_id,
            OllamaConnector.id != connector.id,
            OllamaConnector.active.is_(True),
            OllamaConnector.revoked_at.is_(None),
        ).limit(1)
    )
    resumed: list[dict[str, Any]] = []
    if not has_alternative:
        pending_jobs = list(
            await db.scalars(
                select(OllamaConnectorJob)
                .where(
                    OllamaConnectorJob.profesor_id == profesor_id,
                    OllamaConnectorJob.status.in_(["waiting_connector", "leased", "running"]),
                )
                .with_for_update(skip_locked=True)
            )
        )
        from app.modules.jobs import service as jobs_service

        for job in pending_jobs:
            job.status = "failed"
            job.error_code = "connector_revoked"
            job.completed_at = _now()
            job.connector_id = None
            job.lease_token_hash = None
            job.lease_expires_at = None
            if job.source_job_id:
                source = await jobs_service.resume_job_after_connector(
                    db,
                    source_job_id=job.source_job_id,
                    connector_job_id=job.id,
                )
                if source:
                    resumed.append(source)
    await db.commit()
    for source in resumed:
        try:
            jobs_service.dispatch_persisted_job(source)
        except Exception:  # noqa: BLE001
            logger.exception(
                "Could not republish source after connector revocation",
                extra={"source_job_id": str(source.get("id"))},
            )


async def replace_models(db: AsyncSession, connector: OllamaConnector, models: list[ConnectorModelWrite]) -> None:
    unique: dict[str, list[str]] = {}
    for model in models:
        capabilities = sorted(set(model.capabilities).intersection(ALLOWED_CAPABILITIES) or {"text"})
        unique[model.model_id.strip()] = capabilities
    await db.execute(delete(OllamaConnectorModel).where(OllamaConnectorModel.connector_id == connector.id))
    for model_id, capabilities in unique.items():
        db.add(OllamaConnectorModel(connector_id=connector.id, model_id=model_id, capabilities=capabilities, available=True))
    connector.status = "connected"
    connector.last_seen_at = _now()
    await db.commit()


async def enqueue_local_job(
    db: AsyncSession,
    *,
    profesor_id: UUID,
    feature: str,
    model_id: str,
    payload: dict,
    idempotency_key: str,
    source_job_id: UUID | None = None,
    commit: bool = True,
) -> OllamaConnectorJob:
    existing = await db.scalar(select(OllamaConnectorJob).where(OllamaConnectorJob.idempotency_key == idempotency_key))
    if existing:
        return existing
    job = OllamaConnectorJob(
        source_job_id=source_job_id,
        profesor_id=profesor_id,
        idempotency_key=idempotency_key,
        feature=feature,
        model_id=model_id,
        payload_encrypted=encrypt_ai_secret(json.dumps(payload, ensure_ascii=False)),
        status="waiting_connector",
        expires_at=_now() + timedelta(hours=JOB_TTL_HOURS),
    )
    db.add(job)
    if commit:
        await db.commit()
        await db.refresh(job)
    else:
        await db.flush()
    return job


async def request_local_inference(
    db: AsyncSession,
    *,
    profesor_id: UUID,
    source_job_id: UUID,
    stage: str,
    feature: str,
    model_id: str,
    payload: dict,
) -> dict:
    """Return the stored result or suspend the source job at one stable stage."""
    idempotency_key = f"{source_job_id}:{stage}"[:160]
    job = await db.scalar(
        select(OllamaConnectorJob).where(
            OllamaConnectorJob.idempotency_key == idempotency_key,
            OllamaConnectorJob.profesor_id == profesor_id,
        )
    )
    if job and job.status == "completed" and job.result_encrypted:
        value = json.loads(decrypt_ai_secret(job.result_encrypted))
        if isinstance(value, dict):
            return value
        raise LocalInferenceFailed("Ollama local devolvió un resultado inválido")
    if job and job.status == "failed":
        raise LocalInferenceFailed(
            f"Ollama local no completó la etapa: {job.error_code or 'local_inference_failed'}"
        )
    if not job:
        job = await enqueue_local_job(
            db,
            profesor_id=profesor_id,
            feature=feature,
            model_id=model_id,
            payload=payload,
            idempotency_key=idempotency_key,
            source_job_id=source_job_id,
            commit=False,
        )

    from app.modules.jobs import service as jobs_service

    await jobs_service.mark_job_waiting_connector(
        db,
        source_job_id,
        connector_job_id=job.id,
        stage=stage,
    )
    await db.commit()
    raise LocalInferencePending(job.id)


async def claim_job(db: AsyncSession, connector: OllamaConnector) -> tuple[OllamaConnectorJob, str, dict] | None:
    now = _now()
    await db.execute(
        update(OllamaConnectorJob)
        .where(
            OllamaConnectorJob.profesor_id == connector.profesor_id,
            OllamaConnectorJob.status.in_(["leased", "running"]),
            OllamaConnectorJob.lease_expires_at < now,
        )
        .values(status="waiting_connector", connector_id=None, lease_token_hash=None, lease_expires_at=None)
    )
    available_models = select(OllamaConnectorModel.model_id).where(
        OllamaConnectorModel.connector_id == connector.id,
        OllamaConnectorModel.available.is_(True),
    )
    job = await db.scalar(
        select(OllamaConnectorJob)
        .where(
            OllamaConnectorJob.profesor_id == connector.profesor_id,
            OllamaConnectorJob.status == "waiting_connector",
            OllamaConnectorJob.expires_at > now,
            OllamaConnectorJob.model_id.in_(available_models),
        )
        .order_by(OllamaConnectorJob.created_at)
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    if not job:
        await db.commit()
        return None
    lease_token = secrets.token_urlsafe(32)
    job.connector_id = connector.id
    job.status = "leased"
    job.attempts += 1
    job.lease_token_hash = _hash(lease_token)
    job.lease_expires_at = now + timedelta(seconds=LEASE_SECONDS)
    connector.last_seen_at = now
    await db.commit()
    payload = json.loads(decrypt_ai_secret(job.payload_encrypted))
    return job, lease_token, payload


def _validate_lease(job: OllamaConnectorJob, connector: OllamaConnector, lease_token: str) -> None:
    if (
        job.connector_id != connector.id
        or job.status not in {"leased", "running"}
        or not job.lease_token_hash
        or not secrets.compare_digest(job.lease_token_hash, _hash(lease_token))
        or not job.lease_expires_at
        or job.lease_expires_at <= _now()
    ):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El lease venció o pertenece a otro conector")


async def heartbeat_job(db: AsyncSession, connector: OllamaConnector, job_id: UUID, lease_token: str) -> None:
    job = await db.scalar(select(OllamaConnectorJob).where(OllamaConnectorJob.id == job_id).with_for_update())
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajo no encontrado")
    _validate_lease(job, connector, lease_token)
    job.status = "running"
    job.lease_expires_at = _now() + timedelta(seconds=LEASE_SECONDS)
    connector.last_seen_at = _now()
    await db.commit()


async def complete_job(db: AsyncSession, connector: OllamaConnector, job_id: UUID, lease_token: str, result: dict) -> bool:
    job = await db.scalar(select(OllamaConnectorJob).where(OllamaConnectorJob.id == job_id).with_for_update())
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajo no encontrado")
    if job.profesor_id != connector.profesor_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajo no encontrado")
    if job.status == "completed":
        return False
    _validate_lease(job, connector, lease_token)
    job.result_encrypted = encrypt_ai_secret(json.dumps(result, ensure_ascii=False))
    job.status = "completed"
    job.completed_at = _now()
    job.lease_expires_at = None
    job.lease_token_hash = None
    connector.last_seen_at = _now()
    resumed_job: dict | None = None
    if job.source_job_id:
        from app.modules.jobs import service as jobs_service

        resumed_job = await jobs_service.resume_job_after_connector(
            db,
            source_job_id=job.source_job_id,
            connector_job_id=job.id,
        )
    await db.commit()
    if resumed_job:
        try:
            jobs_service.dispatch_persisted_job(resumed_job)
        except Exception:  # noqa: BLE001
            # The source remains queued and is therefore recoverable.  Never
            # turn a valid local result into a terminal failure because Redis
            # was briefly unavailable during the callback.
            logger.exception(
                "Could not immediately republish connector source job",
                extra={"source_job_id": str(job.source_job_id)},
            )
    return True


async def fail_job(db: AsyncSession, connector: OllamaConnector, job_id: UUID, lease_token: str, error_code: str) -> None:
    job = await db.scalar(select(OllamaConnectorJob).where(OllamaConnectorJob.id == job_id).with_for_update())
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajo no encontrado")
    if job.profesor_id != connector.profesor_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajo no encontrado")
    _validate_lease(job, connector, lease_token)
    job.status = "failed"
    job.error_code = error_code
    job.completed_at = _now()
    job.lease_expires_at = None
    job.lease_token_hash = None
    connector.last_seen_at = _now()
    resumed_job: dict | None = None
    if job.source_job_id:
        from app.modules.jobs import service as jobs_service

        resumed_job = await jobs_service.resume_job_after_connector(
            db,
            source_job_id=job.source_job_id,
            connector_job_id=job.id,
        )
    await db.commit()
    if resumed_job:
        try:
            jobs_service.dispatch_persisted_job(resumed_job)
        except Exception:  # noqa: BLE001
            logger.exception(
                "Could not immediately republish failed connector source job",
                extra={"source_job_id": str(job.source_job_id)},
            )


async def expire_local_jobs(db: AsyncSession) -> list[dict[str, Any]]:
    """Fail expired connector work and release each suspended source job."""
    jobs = list(
        await db.scalars(
            select(OllamaConnectorJob)
            .where(
                OllamaConnectorJob.status.in_(["waiting_connector", "leased", "running"]),
                OllamaConnectorJob.expires_at <= _now(),
            )
            .with_for_update(skip_locked=True)
        )
    )
    resumed: list[dict[str, Any]] = []
    from app.modules.jobs import service as jobs_service

    for job in jobs:
        job.status = "failed"
        job.error_code = "local_job_expired"
        job.completed_at = _now()
        job.lease_expires_at = None
        job.lease_token_hash = None
        if job.source_job_id:
            source = await jobs_service.resume_job_after_connector(
                db,
                source_job_id=job.source_job_id,
                connector_job_id=job.id,
            )
            if source:
                resumed.append(source)
    await db.commit()
    return resumed
