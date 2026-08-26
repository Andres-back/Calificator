"""Persistence helpers for long-running AI jobs."""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.enums import JobEstado
from app.core.logging import get_logger

logger = get_logger(__name__)

JOB_FEATURES = {
    "presentacion": "presentaciones",
    "imagen": "generacion_imagenes",
    "calificacion_lote": "calificacion_foto",
    "rag_ingest": "rag",
    "evaluacion_digitalizacion": "evaluacion_digitalizar",
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
) -> UUID:
    created_id = job_id or uuid4()
    persisted_input = dict(input_json)
    feature = JOB_FEATURES.get(tipo)
    if feature and "_ai_config" not in persisted_input:
        try:
            from app.services.ai_configuration_resolver import resolve_ai_configuration

            persisted_input["_ai_config"] = await resolve_ai_configuration(
                db, feature=feature, teacher_id=user_id
            )
        except Exception as exc:
            logger.warning("AI configuration snapshot unavailable for %s: %s", tipo, type(exc).__name__)
    await db.execute(
        text(
            "INSERT INTO ai_jobs "
            "(id, user_id, tipo, estado, progreso, input_json, resultado_json) "
            "VALUES (:id, :user_id, :tipo, :estado, 0, CAST(:input_json AS jsonb), '{}'::jsonb)"
        ),
        {
            "id": str(created_id),
            "user_id": str(user_id) if user_id else None,
            "tipo": tipo,
            "estado": JobEstado.QUEUED.value,
            "input_json": _json_value(persisted_input),
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
            "error=NULL WHERE id=:id AND estado=:queued"
        ),
        {
            "id": str(job_id),
            "queued": JobEstado.QUEUED.value,
            "running": JobEstado.RUNNING.value,
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
            "resultado_json=COALESCE(resultado_json, '{}'::jsonb) || "
            "jsonb_build_object('claim_token', CAST(:claim_token AS text)) "
            "WHERE id=CAST(:id AS uuid) AND estado=:queued"
        ),
        {
            "id": str(job_id),
            "queued": JobEstado.QUEUED.value,
            "running": JobEstado.RUNNING.value,
            "claim_token": claim_token,
        },
    )
    return bool(result.rowcount)


async def get_job_claim_token(db: AsyncSession, job_id: UUID) -> str | None:
    value = await db.scalar(
        text(
            "SELECT resultado_json->>'claim_token' FROM ai_jobs "
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
            "UPDATE ai_jobs SET progreso=:progreso, resultado_json=CAST(:resultado AS jsonb) "
            "WHERE id=:id AND estado=:running"
        ),
        {
            "id": str(job_id),
            "running": JobEstado.RUNNING.value,
            "progreso": max(0, min(100, progreso)),
            "resultado": _json_value(resultado_json),
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
    if estado not in {JobEstado.SUCCESS.value, JobEstado.FAILED.value}:
        raise ValueError("finish_job only accepts success or failed states")
    result = await db.execute(
        text(
            "UPDATE ai_jobs SET estado=:estado, progreso=100, "
            "resultado_json=CAST(:resultado AS jsonb), error=:error, finished_at=NOW() "
            "WHERE id=:id AND estado<>:cancelled"
        ),
        {
            "id": str(job_id),
            "estado": estado,
            "resultado": _json_value(resultado_json),
            "error": error[:1000] if error else None,
            "cancelled": JobEstado.CANCELLED.value,
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
