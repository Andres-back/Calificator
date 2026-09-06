"""Persistence helpers for long-running AI jobs."""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.shared.enums import JobEstado
from app.core.logging import get_logger

logger = get_logger(__name__)


class JobOwnershipLost(RuntimeError):
    """Otro intento tomó el trabajo; esta ejecución ya no puede escribir."""


async def lock_owned_job(db: AsyncSession, job_id: UUID, claim_token: str) -> None:
    owner = await db.scalar(
        text("SELECT claim_token FROM ai_jobs WHERE id=CAST(:id AS uuid) "
             "AND estado='running' FOR UPDATE"),
        {"id": str(job_id)},
    )
    if owner != claim_token:
        raise JobOwnershipLost("La ejecución ya no es propietaria del trabajo")

JOB_FEATURES = {
    "presentacion": "presentaciones",
    "imagen": "generacion_imagenes",
    "calificacion_lote": "calificacion_foto",
    "calificacion_entrega": "calificacion_foto",
    "rag_ingest": "rag",
    "evaluacion_digitalizacion": "evaluacion_digitalizar",
}


async def _resolve_job_ai_config(
    db: AsyncSession,
    *,
    tipo: str,
    feature: str,
    user_id: UUID | None,
) -> dict[str, Any]:
    """Freeze the effective routes used by a job without serializing secrets."""
    from app.services.ai_configuration_resolver import resolve_ai_configuration

    if tipo not in {"calificacion_lote", "calificacion_entrega"}:
        return await resolve_ai_configuration(
            db, feature=feature, teacher_id=user_id
        )

    vision = await resolve_ai_configuration(
        db, feature="calificacion_foto", teacher_id=user_id
    )
    grading = await resolve_ai_configuration(
        db, feature="calificacion_texto", teacher_id=user_id
    )
    return {
        "schema_version": 2,
        "pipeline": "calificacion_foto",
        "vision": vision,
        "grading": grading,
    }


def _json_value(value: dict[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


async def create_job(
    db: AsyncSession,
    *,
    user_id: UUID | None,
    tipo: str,
    input_json: dict[str, Any],
    job_id: UUID | None = None,
    parent_job_id: UUID | None = None,
    entrega_id: UUID | None = None,
    stage: str | None = None,
) -> UUID:
    created_id = job_id or uuid4()
    persisted_input = dict(input_json)
    feature = JOB_FEATURES.get(tipo)
    if feature and "_ai_config" not in persisted_input:
        try:
            persisted_input["_ai_config"] = await _resolve_job_ai_config(
                db,
                tipo=tipo,
                feature=feature,
                user_id=user_id,
            )
        except Exception as exc:
            logger.warning("AI configuration snapshot unavailable for %s: %s", tipo, type(exc).__name__)
    await db.execute(
        text(
            "INSERT INTO ai_jobs "
            "(id, user_id, tipo, estado, progreso, input_json, resultado_json, "
            "parent_job_id, entrega_id, stage, attempt_count) "
            "VALUES (:id, :user_id, :tipo, :estado, 0, CAST(:input_json AS jsonb), "
            "'{}'::jsonb, :parent_job_id, :entrega_id, :stage, 0)"
        ),
        {
            "id": str(created_id),
            "user_id": str(user_id) if user_id else None,
            "tipo": tipo,
            "estado": JobEstado.QUEUED.value,
            "input_json": _json_value(persisted_input),
            "parent_job_id": str(parent_job_id) if parent_job_id else None,
            "entrega_id": str(entrega_id) if entrega_id else None,
            "stage": stage,
        },
    )
    return created_id


async def get_job_input(db: AsyncSession, job_id: UUID) -> dict[str, Any]:
    """Return the immutable job input, including its sanitized AI snapshot."""
    statement = text(
        "SELECT input_json FROM ai_jobs WHERE id=CAST(:id AS uuid)"
    ).bindparams(id=job_id)
    value = await db.scalar(statement)
    return dict(value) if isinstance(value, dict) else {}


async def get_job_result(db: AsyncSession, job_id: UUID) -> dict[str, Any]:
    value = await db.scalar(
        text("SELECT resultado_json FROM ai_jobs WHERE id=CAST(:id AS uuid)"),
        {"id": str(job_id)},
    )
    return dict(value) if isinstance(value, dict) else {}


async def mark_job_waiting_connector(
    db: AsyncSession,
    job_id: UUID,
    *,
    connector_job_id: UUID,
    stage: str,
) -> bool:
    """Suspend a running job without making it terminal.

    The public job remains ``running`` so clients keep showing background work,
    while ``pipeline_status`` records the durable suspension point.  The
    connector callback is the only writer allowed to move this exact suspension
    back to ``queued``.
    """
    result = await db.execute(
        text(
            "UPDATE ai_jobs SET lease_expires_at=NULL, resultado_json="
            "COALESCE(resultado_json, '{}'::jsonb) || "
            "jsonb_build_object('pipeline_status', 'waiting_connector', "
            "'connector_job_id', CAST(:connector_job_id AS text), "
            "'connector_stage', CAST(:stage AS text)) "
            "WHERE id=CAST(:id AS uuid) AND estado=:running"
        ),
        {
            "id": str(job_id),
            "running": JobEstado.RUNNING.value,
            "connector_job_id": str(connector_job_id),
            "stage": stage[:80],
        },
    )
    return bool(result.rowcount)


async def resume_job_after_connector(
    db: AsyncSession,
    *,
    source_job_id: UUID,
    connector_job_id: UUID,
) -> dict[str, Any] | None:
    """Atomically make one suspended source job eligible for redelivery.

    Matching the connector id prevents a late or duplicated callback from
    waking a newer suspension point.  The returned payload contains no secret;
    encrypted connector output remains in ``ollama_connector_jobs``.
    """
    row = await db.execute(
        text(
            "UPDATE ai_jobs SET estado=:queued, started_at=NULL, error=NULL, claim_token=NULL, lease_expires_at=NULL, "
            "resultado_json=(COALESCE(resultado_json, '{}'::jsonb) - 'claim_token') || "
            "jsonb_build_object('pipeline_status', 'connector_completed', "
            "'connector_job_id', CAST(:connector_job_id AS text), "
            "'recovery_enqueued_at', NULL) "
            "WHERE id=CAST(:id AS uuid) AND estado=:running "
            "AND resultado_json->>'pipeline_status'='waiting_connector' "
            "AND resultado_json->>'connector_job_id'=CAST(:connector_job_id AS text) "
            "RETURNING id, user_id, tipo, input_json"
        ),
        {
            "id": str(source_job_id),
            "connector_job_id": str(connector_job_id),
            "running": JobEstado.RUNNING.value,
            "queued": JobEstado.QUEUED.value,
        },
    )
    value = row.mappings().first()
    return dict(value) if value else None


def dispatch_persisted_job(job: dict[str, Any]) -> bool:
    """Republish a supported persisted job using only its durable input."""
    from app.workers.worker import celery_app

    job_id = str(job.get("id") or "")
    job_type = str(job.get("tipo") or "")
    user_id = str(job.get("user_id") or "") or None
    payload = job.get("input_json")
    payload = payload if isinstance(payload, dict) else {}
    if not job_id:
        return False

    if job_type == "calificacion_lote":
        if not payload.get("evaluacion_id") or not (
            payload.get("entrega_ids") or payload.get("estudiante_ids")
        ):
            return False
        celery_app.send_task(
            "tasks.grade_batch",
            kwargs={
                "evaluacion_id": str(payload["evaluacion_id"]),
                "estudiante_ids": [str(item) for item in payload.get("estudiante_ids") or []],
                "entrega_ids": [str(item) for item in payload.get("entrega_ids") or []],
                "job_id": job_id,
                "profesor_id": user_id,
            },
            queue="grading",
        )
        return True

    if job_type == "calificacion_entrega":
        entrega_ids = payload.get("entrega_ids") or []
        if not payload.get("evaluacion_id") or len(entrega_ids) != 1:
            return False
        celery_app.send_task(
            "tasks.grade_delivery",
            kwargs={
                "evaluacion_id": str(payload["evaluacion_id"]),
                "entrega_id": str(entrega_ids[0]),
                "job_id": job_id,
                "profesor_id": user_id,
            },
            queue="grading",
        )
        return True

    if job_type == "evaluacion_digitalizacion":
        required = {
            "materia_id", "file_key", "filename", "nombre", "nota_maxima", "modalidad"
        }
        if not user_id or not required.issubset(payload):
            return False
        celery_app.send_task(
            "tasks.digitalize_evaluation",
            kwargs={
                "job_id": job_id,
                "user_id": user_id,
                "materia_id": str(payload["materia_id"]),
                "file_key": str(payload["file_key"]),
                "filename": str(payload["filename"]),
                "nombre": str(payload["nombre"]),
                "descripcion": payload.get("descripcion"),
                "nota_maxima": str(payload["nota_maxima"]),
                "modalidad": str(payload["modalidad"]),
            },
            queue="digitalization",
        )
        return True

    if job_type == "presentacion":
        presentation_id = payload.get("presentacion_id")
        if not presentation_id:
            return False
        celery_app.send_task(
            "tasks.generate_presentation",
            args=[str(presentation_id)],
            queue="presentations",
        )
        return True

    logger.warning("Unsupported persisted AI job type for dispatch: %s", job_type)
    return False

async def get_job_queue_time_ms(db: AsyncSession, job_id: UUID) -> int:
    """Devuelve solo duración técnica; nunca consulta el contenido del trabajo."""
    statement = text(
        "SELECT GREATEST(0, EXTRACT(EPOCH FROM (NOW() - created_at)) * 1000) "
        "FROM ai_jobs WHERE id=CAST(:id AS uuid)"
    ).bindparams(id=job_id)
    value = await db.scalar(statement)
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0


async def get_job_state(db: AsyncSession, job_id: UUID) -> str | None:
    return await db.scalar(
        text("SELECT estado FROM ai_jobs WHERE id=:id"),
        {"id": str(job_id)},
    )


async def mark_job_running(db: AsyncSession, job_id: UUID) -> bool:
    result = await db.execute(
        text(
            "UPDATE ai_jobs SET estado=:running, started_at=COALESCE(started_at, NOW()), "
            "error=NULL, attempt_count=attempt_count+1, heartbeat_at=NOW(), "
            "lease_expires_at=NOW() + (:lease_seconds * INTERVAL '1 second') "
            "WHERE id=:id AND estado IN (:queued, :retrying)"
        ),
        {
            "id": str(job_id),
            "queued": JobEstado.QUEUED.value,
            "running": JobEstado.RUNNING.value,
            "retrying": JobEstado.RETRYING.value,
            "lease_seconds": max(60, settings.AI_JOB_LEASE_SECONDS),
        },
    )
    return bool(result.rowcount)


async def claim_job_running(
    db: AsyncSession,
    job_id: UUID,
    *,
    claim_token: str,
) -> bool:
    """Atomically claim a queued job for one Celery delivery.

    The token lets the same Celery message resume after worker loss while a duplicate
    message with a different id must not execute the grading pipeline concurrently.
    """
    result = await db.execute(
        text(
            "UPDATE ai_jobs SET estado=:running, "
            "started_at=COALESCE(started_at, NOW()), error=NULL, "
            "attempt_count=attempt_count+1, claim_token=CAST(:claim_token AS text), heartbeat_at=NOW(), "
            "lease_expires_at=NOW() + (:lease_seconds * INTERVAL '1 second'), "
            "resultado_json=COALESCE(resultado_json, '{}'::jsonb) || "
            "jsonb_build_object('claim_token', CAST(:claim_token AS text)) "
            "WHERE id=CAST(:id AS uuid) AND estado IN (:queued, :retrying)"
        ),
        {
            "id": str(job_id),
            "queued": JobEstado.QUEUED.value,
            "running": JobEstado.RUNNING.value,
            "retrying": JobEstado.RETRYING.value,
            "claim_token": claim_token,
            "lease_seconds": max(60, settings.AI_JOB_LEASE_SECONDS),
        },
    )
    return bool(result.rowcount)


async def get_job_claim_token(db: AsyncSession, job_id: UUID) -> str | None:
    value = await db.scalar(
        text(
            "SELECT COALESCE(claim_token, resultado_json->>'claim_token') FROM ai_jobs "
            "WHERE id=CAST(:id AS uuid)"
        ),
        {"id": str(job_id)},
    )
    return str(value) if value else None


async def claim_stale_queued_jobs(
    db: AsyncSession,
    *,
    tipo: str,
    stale_seconds: int,
    limit: int,
) -> list[dict[str, Any]]:
    """Lease stale queued jobs for republication without changing their state.

    ``recovery_enqueued_at`` throttles repeated publication while the original job id
    remains the source of truth. Running and terminal jobs are never selected.
    """
    rows = await db.execute(
        text(
            "WITH candidates AS ("
            " SELECT id FROM ai_jobs"
            " WHERE tipo=:tipo AND estado=:queued AND started_at IS NULL"
            " AND created_at <= NOW() - (:stale_seconds * INTERVAL '1 second')"
            " AND (resultado_json->>'recovery_enqueued_at' IS NULL"
            "      OR CAST(resultado_json->>'recovery_enqueued_at' AS timestamptz)"
            "         <= NOW() - (:stale_seconds * INTERVAL '1 second'))"
            " ORDER BY created_at ASC LIMIT :limit FOR UPDATE SKIP LOCKED"
            ")"
            " UPDATE ai_jobs AS job SET resultado_json="
            " COALESCE(job.resultado_json, '{}'::jsonb) ||"
            " jsonb_build_object('recovery_enqueued_at', NOW())"
            " FROM candidates WHERE job.id=candidates.id"
            " RETURNING job.id, job.user_id, job.input_json"
        ),
        {
            "tipo": tipo,
            "queued": JobEstado.QUEUED.value,
            "stale_seconds": max(60, stale_seconds),
            "limit": max(1, min(100, limit)),
        },
    )
    return [dict(row) for row in rows.mappings().all()]


async def update_job_progress(
    db: AsyncSession,
    job_id: UUID,
    *,
    progreso: int,
    resultado_json: dict[str, Any],
) -> bool:
    result = await db.execute(
        text(
            "UPDATE ai_jobs SET progreso=:progreso, resultado_json=CAST(:resultado AS jsonb), "
            "stage=COALESCE(CAST(:stage AS text), stage), "
            "heartbeat_at=NOW(), lease_expires_at=NOW() + (:lease_seconds * INTERVAL '1 second') "
            "WHERE id=:id AND estado=:running "
            "AND (CAST(:claim_token AS text) IS NULL OR claim_token=:claim_token)"
        ),
        {
            "id": str(job_id),
            "running": JobEstado.RUNNING.value,
            "progreso": max(0, min(100, progreso)),
            "resultado": _json_value(resultado_json),
            "stage": resultado_json.get("stage"),
            "lease_seconds": max(60, settings.AI_JOB_LEASE_SECONDS),
            "claim_token": resultado_json.get("claim_token"),
        },
    )
    return bool(result.rowcount)


async def finish_job(
    db: AsyncSession,
    job_id: UUID,
    *,
    estado: str,
    resultado_json: dict[str, Any],
    error: str | None = None,
) -> bool:
    if estado not in {JobEstado.SUCCESS.value, JobEstado.FAILED.value, JobEstado.REQUIRES_REVIEW.value, JobEstado.FAILED_PERMANENT.value}:
        raise ValueError("finish_job only accepts terminal result states")
    result = await db.execute(
        text(
            "UPDATE ai_jobs SET estado=:estado, progreso=100, "
            "resultado_json=CAST(:resultado AS jsonb), error=:error, finished_at=NOW(), "
            "heartbeat_at=NOW(), lease_expires_at=NULL "
            "WHERE id=:id AND estado IN ('queued','running','retrying') "
            "AND (CAST(:claim_token AS text) IS NULL OR claim_token=:claim_token)"
        ),
        {
            "id": str(job_id),
            "estado": estado,
            "resultado": _json_value(resultado_json),
            "error": error[:1000] if error else None,
            "claim_token": resultado_json.get("claim_token"),
        },
    )
    finished = bool(result.rowcount)
    if finished:
        parent_id = await db.scalar(
            text("SELECT parent_job_id FROM ai_jobs WHERE id=CAST(:id AS uuid)"),
            {"id": str(job_id)},
        )
        if parent_id:
            await aggregate_parent_job(db, UUID(str(parent_id)))
    return finished


async def aggregate_parent_job(db: AsyncSession, parent_job_id: UUID) -> dict[str, int | str]:
    """Resume hijos sin consultar ni copiar evidencia."""
    # Serializa el recuento: dos hijos que terminan juntos no deben dejar
    # un resumen obsoleto después de que ambos hayan hecho commit.
    await db.execute(
        text("SELECT id FROM ai_jobs WHERE id=CAST(:id AS uuid) FOR UPDATE"),
        {"id": str(parent_job_id)},
    )
    row = (
        await db.execute(
            text(
                "SELECT COUNT(*) AS total, "
                "COUNT(*) FILTER (WHERE estado='success') AS success, "
                "COUNT(*) FILTER (WHERE estado IN ('failed','failed_permanent','requires_review')) AS failed, "
                "COUNT(*) FILTER (WHERE estado='cancelled') AS cancelled, "
                "COUNT(*) FILTER (WHERE estado IN ('queued','running','retrying')) AS active "
                "FROM ai_jobs WHERE parent_job_id=CAST(:id AS uuid)"
            ),
            {"id": str(parent_job_id)},
        )
    ).mappings().one()
    total = int(row["total"] or 0)
    success = int(row["success"] or 0)
    failed = int(row["failed"] or 0)
    cancelled = int(row["cancelled"] or 0)
    active = int(row["active"] or 0)
    completed = success + failed + cancelled
    progress = round((completed / total) * 100) if total else 0
    if total and active == 0:
        state = JobEstado.SUCCESS.value if success > 0 else JobEstado.FAILED.value
    else:
        state = JobEstado.RUNNING.value
    payload = {
        "status": state,
        "total": total,
        "processed": success,
        "failed": failed,
        "cancelled": cancelled,
        "active": active,
    }
    await db.execute(
        text(
            "UPDATE ai_jobs SET estado=:state, progreso=:progress, "
            "resultado_json=CAST(:payload AS jsonb), "
            "started_at=COALESCE(started_at, NOW()), "
            "finished_at=CASE WHEN :active=0 AND :total>0 THEN NOW() ELSE NULL END "
            "WHERE id=CAST(:id AS uuid) AND estado<>:cancelled_state"
        ),
        {
            "id": str(parent_job_id),
            "state": state,
            "progress": progress,
            "payload": _json_value(payload),
            "active": active,
            "total": total,
            "cancelled_state": JobEstado.CANCELLED.value,
        },
    )
    return payload


async def claim_recoverable_jobs(
    db: AsyncSession,
    *,
    tipo: str,
    queued_seconds: int,
    limit: int,
) -> list[dict[str, Any]]:
    """Reclama jobs no publicados o con lease vencido, nunca inferencias vivas."""
    rows = await db.execute(
        text(
            "WITH candidates AS ("
            " SELECT id FROM ai_jobs WHERE tipo=:tipo "
            " AND attempt_count < :max_attempts AND ("
            "   (estado=:queued AND created_at <= NOW() - (:queued_seconds * INTERVAL '1 second'))"
            "   OR (estado=:running AND lease_expires_at IS NOT NULL AND lease_expires_at < NOW()"
            "       AND COALESCE(resultado_json->>'pipeline_status','')<>'waiting_connector')"
            "   OR (estado=:retrying AND (lease_expires_at IS NULL OR lease_expires_at < NOW()))"
            " ) ORDER BY created_at ASC LIMIT :limit FOR UPDATE SKIP LOCKED"
            ") UPDATE ai_jobs AS job SET estado=:retrying, claim_token=NULL, "
            "lease_expires_at=NOW() + (:queued_seconds * INTERVAL '1 second'), "
            "resultado_json=(COALESCE(job.resultado_json, '{}'::jsonb) - 'claim_token') || "
            "jsonb_build_object('pipeline_status','retrying','recovery_enqueued_at',NOW()) "
            "FROM candidates WHERE job.id=candidates.id "
            "RETURNING job.id, job.user_id, job.tipo, job.parent_job_id, job.entrega_id, job.input_json"
        ),
        {
            "tipo": tipo,
            "queued": JobEstado.QUEUED.value,
            "running": JobEstado.RUNNING.value,
            "retrying": JobEstado.RETRYING.value,
            "max_attempts": max(1, settings.AI_JOB_MAX_ATTEMPTS),
            "queued_seconds": max(30, queued_seconds),
            "limit": max(1, min(100, limit)),
        },
    )
    return [dict(row) for row in rows.mappings().all()]


async def heartbeat_job(
    db: AsyncSession,
    job_id: UUID,
    *,
    claim_token: str | None = None,
    stage: str | None = None,
) -> bool:
    """Renueva el lease sin interrumpir una inferencia que sigue activa."""
    result = await db.execute(
        text(
            "UPDATE ai_jobs SET heartbeat_at=NOW(), "
            "lease_expires_at=NOW() + (:lease_seconds * INTERVAL '1 second'), "
            "stage=COALESCE(:stage, stage) WHERE id=CAST(:id AS uuid) "
            "AND estado=:running AND (CAST(:claim_token AS text) IS NULL OR claim_token=:claim_token) "
            "AND COALESCE(resultado_json->>'pipeline_status','')<>'waiting_connector'"
        ),
        {
            "id": str(job_id),
            "running": JobEstado.RUNNING.value,
            "claim_token": claim_token,
            "stage": stage,
            "lease_seconds": max(60, settings.AI_JOB_LEASE_SECONDS),
        },
    )
    return bool(result.rowcount)


async def fail_exhausted_jobs(
    db: AsyncSession, *, tipo: str, limit: int,
) -> list[dict[str, Any]]:
    """Cierra workers abandonados tras agotar recuperaciones, no inferencias vivas."""
    rows = await db.execute(
        text(
            "WITH candidates AS ("
            " SELECT id FROM ai_jobs WHERE tipo=:tipo AND attempt_count>=:attempts"
            " AND estado IN ('running','retrying')"
            " AND lease_expires_at IS NOT NULL AND lease_expires_at<NOW()"
            " AND COALESCE(resultado_json->>'pipeline_status','')<>'waiting_connector'"
            " ORDER BY created_at LIMIT :limit FOR UPDATE SKIP LOCKED"
            ") UPDATE ai_jobs AS job SET estado='requires_review', stage='requires_review',"
            " finished_at=NOW(), lease_expires_at=NULL, claim_token=NULL, progreso=100,"
            " error='Se agotaron los intentos de recuperación. La evidencia sigue guardada.',"
            " resultado_json=(COALESCE(job.resultado_json,'{}'::jsonb)-'claim_token') ||"
            " jsonb_build_object('pipeline_status','failed','terminal_reason','worker_recovery_exhausted')"
            " FROM candidates WHERE job.id=candidates.id"
            " RETURNING job.id, job.entrega_id, job.parent_job_id"
        ),
        {"tipo": tipo, "attempts": max(1, settings.AI_JOB_MAX_ATTEMPTS),
         "limit": max(1, min(100, limit))},
    )
    return [dict(row) for row in rows.mappings().all()]


async def mark_job_retrying(db: AsyncSession, job_id: UUID, *, error: str) -> bool:
    result = await db.execute(
        text(
            "UPDATE ai_jobs SET estado=:retrying, error=:error, claim_token=NULL, "
            "lease_expires_at=NULL, resultado_json=COALESCE(resultado_json, '{}'::jsonb) || "
            "jsonb_build_object('pipeline_status','retrying') "
            "WHERE id=CAST(:id AS uuid) AND estado IN (:queued, :retrying)"
        ),
        {
            "id": str(job_id),
            "queued": JobEstado.QUEUED.value,
            "retrying": JobEstado.RETRYING.value,
            "error": error[:1000],
        },
    )
    return bool(result.rowcount)


async def release_job_for_retry(
    db: AsyncSession,
    job_id: UUID,
    *,
    claim_token: str,
    resultado_json: dict[str, Any],
    error: str,
    delay_seconds: int,
) -> bool:
    """Release a claimed job for delayed retry without discarding partial results."""
    result = await db.execute(
        text(
            "UPDATE ai_jobs SET estado=:retrying, stage='retrying', "
            "resultado_json=CAST(:resultado AS jsonb), error=:error, "
            "claim_token=NULL, heartbeat_at=NOW(), "
            "lease_expires_at=NOW() + (:delay * INTERVAL '1 second') "
            "WHERE id=CAST(:id AS uuid) AND estado=:running AND claim_token=:claim_token"
        ),
        {
            "id": str(job_id),
            "running": JobEstado.RUNNING.value,
            "retrying": JobEstado.RETRYING.value,
            "claim_token": claim_token,
            "resultado": _json_value({**resultado_json, "pipeline_status": "retrying"}),
            "error": error[:1000],
            "delay": max(1, delay_seconds),
        },
    )
    return bool(result.rowcount)


async def finish_cancelled_job(
    db: AsyncSession,
    job_id: UUID,
    *,
    progreso: int,
    resultado_json: dict[str, Any],
) -> bool:
    result = await db.execute(
        text(
            "UPDATE ai_jobs SET progreso=:progreso, resultado_json=CAST(:resultado AS jsonb), "
            "finished_at=COALESCE(finished_at, NOW()) "
            "WHERE id=:id AND estado=:cancelled"
        ),
        {
            "id": str(job_id),
            "cancelled": JobEstado.CANCELLED.value,
            "progreso": max(0, min(100, progreso)),
            "resultado": _json_value(resultado_json),
        },
    )
    return bool(result.rowcount)
