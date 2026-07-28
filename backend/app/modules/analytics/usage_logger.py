"""Logging de uso de IA — ledger por llamada a proveedores."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal

logger = get_logger(__name__)

# Columnas de ai_usage_events según la migración existente
# Usamos SQL directo para evitar dependencia del modelo ORM


async def log_ai_usage(
    *,
    calificacion_id: str | UUID | None = None,
    evaluacion_id: str | UUID | None = None,
    request_id: str | None = None,
    pipeline_run_id: str | None = None,
    feature: str,
    stage: str | None = None,
    provider: str | None = None,
    model: str | None = None,
    attempt_number: int = 1,
    status: str = "started",
    started_at: datetime | None = None,
    completed_at: datetime | None = None,
    latency_ms: int | None = None,
    input_tokens: int | None = None,
    output_tokens: int | None = None,
    image_count: int = 0,
    error_code: str | None = None,
) -> str | None:
    """Registra una llamada a un proveedor de IA en el ledger.

    Crea su propia sesión de BD (fire-and-forget amigable).
    No interfiere con la operación principal en caso de error.
    Retorna el request_id generado, o None si falla.
    """
    rid = request_id or str(uuid.uuid4())
    now = datetime.utcnow()

    if started_at is None:
        started_at = now

    try:
        async with AsyncSessionLocal() as db:
            from sqlalchemy import text
            stmt = text("""
                INSERT INTO ai_usage_events
                    (id, request_id, pipeline_run_id, calificacion_id, evaluacion_id,
                     feature, stage, provider, model, attempt_number, status,
                     started_at, completed_at, latency_ms,
                     input_tokens, output_tokens, image_count, error_code)
                VALUES
                    (:id, :request_id, :pipeline_run_id, :calificacion_id, :evaluacion_id,
                     :feature, :stage, :provider, :model, :attempt_number, :status,
                     :started_at, :completed_at, :latency_ms,
                     :input_tokens, :output_tokens, :image_count, :error_code)
                ON CONFLICT (request_id) DO UPDATE SET
                    status = :status,
                    completed_at = :completed_at,
                    latency_ms = :latency_ms,
                    input_tokens = COALESCE(:input_tokens, ai_usage_events.input_tokens),
                    output_tokens = COALESCE(:output_tokens, ai_usage_events.output_tokens),
                    error_code = :error_code
            """)
            await db.execute(stmt, {
                "id": str(uuid.uuid4()),
                "request_id": rid,
                "pipeline_run_id": str(pipeline_run_id) if pipeline_run_id else None,
                "calificacion_id": str(calificacion_id) if calificacion_id else None,
                "evaluacion_id": str(evaluacion_id) if evaluacion_id else None,
                "feature": feature,
                "stage": stage,
                "provider": provider,
                "model": model,
                "attempt_number": attempt_number,
                "status": status,
                "started_at": started_at,
                "completed_at": completed_at,
                "latency_ms": latency_ms,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "image_count": image_count,
                "error_code": error_code,
            })
            await db.commit()
            logger.debug("ai_usage logged: %s %s/%s %s", rid, feature, stage, status)
            return rid
    except Exception as exc:
        logger.warning("Failed to log ai_usage (non-blocking): %s", exc)
        return None
