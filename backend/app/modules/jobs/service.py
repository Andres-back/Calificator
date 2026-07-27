"""Persistence helpers for long-running AI jobs."""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.enums import JobEstado


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
            "input_json": _json_value(input_json),
        },
    )
    return created_id


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
