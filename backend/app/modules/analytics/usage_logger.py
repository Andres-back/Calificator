"""Logging de uso de IA — ledger por llamada a proveedores."""
from __future__ import annotations

import re
import uuid
from datetime import datetime
from uuid import UUID


from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal
from app.services.ai_pricing import estimate_cost

logger = get_logger(__name__)

CANONICAL_STAGES = {
    "extraction", "structure", "key_repair", "grading_primary",
    "grading_secondary", "targeted_recheck", "consolidation",
    "compat_usage_logger", "other",
}


def _safe_stage(value: str | None) -> str | None:
    if value is None:
        return None
    return value if value in CANONICAL_STAGES else "other"


def _safe_error_code(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.lower()
    if "timeout" in normalized or "timed out" in normalized:
        return "provider_timeout"
    if "429" in normalized or "rate" in normalized:
        return "rate_limited"
    if "401" in normalized or "403" in normalized or "credential" in normalized:
        return "provider_auth_failed"
    http_status = re.search(r"\b(?:http[_ ]?)?([45]\d{2})\b", normalized)
    if http_status:
        return f"http_{http_status.group(1)}"
    return "provider_error"


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
    routing_origin: str | None = None,
    config_hash: str | None = None,
    config_version: int | None = None,
    fallback_used: bool = False,
) -> str | None:
    """Registra una llamada a un proveedor de IA en el ledger.

    Crea su propia sesión de BD (fire-and-forget amigable).
    No interfiere con la operación principal en caso de error.
    Retorna el request_id generado, o None si falla.
    """
    rid = request_id or str(uuid.uuid4())
    stage = _safe_stage(stage)
    error_code = _safe_error_code(error_code)
    now = datetime.utcnow()

    if started_at is None:
        started_at = now

    # Calculate estimated cost from token counts
    estimated_cost = await estimate_cost(
        provider=provider,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
    )

    try:
        async with AsyncSessionLocal() as db:
            from sqlalchemy import text
            stmt = text("""
                INSERT INTO ai_usage_events
                    (id, request_id, pipeline_run_id, calificacion_id, evaluacion_id,
                     feature, stage, provider, model, attempt_number, status,
                     started_at, completed_at, latency_ms,
                     input_tokens, output_tokens, image_count, error_code, cost,
                     routing_origin, config_hash, config_version, fallback_used)
                VALUES
                    (:id, :request_id, :pipeline_run_id, :calificacion_id, :evaluacion_id,
                     :feature, :stage, :provider, :model, :attempt_number, :status,
                     :started_at, :completed_at, :latency_ms,
                     :input_tokens, :output_tokens, :image_count, :error_code, :cost,
                     :routing_origin, :config_hash, :config_version, :fallback_used)
                ON CONFLICT (request_id) DO UPDATE SET
                    status = :status,
                    completed_at = :completed_at,
                    latency_ms = :latency_ms,
                    input_tokens = COALESCE(:input_tokens, ai_usage_events.input_tokens),
                    output_tokens = COALESCE(:output_tokens, ai_usage_events.output_tokens),
                    error_code = :error_code,
                    cost = COALESCE(:cost, ai_usage_events.cost),
                    routing_origin = COALESCE(:routing_origin, ai_usage_events.routing_origin),
                    config_hash = COALESCE(:config_hash, ai_usage_events.config_hash),
                    config_version = COALESCE(:config_version, ai_usage_events.config_version),
                    fallback_used = ai_usage_events.fallback_used OR :fallback_used
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
                "cost": float(estimated_cost) if estimated_cost is not None else None,
                "routing_origin": routing_origin[:30] if routing_origin else None,
                "config_hash": config_hash[:64] if config_hash else None,
                "config_version": config_version,
                "fallback_used": bool(fallback_used),
            })
            await db.commit()
            logger.debug("ai_usage logged: %s %s/%s %s", rid, feature, stage, status)
            return rid
    except Exception as exc:
        logger.warning("Failed to log ai_usage (non-blocking): %s", exc)
        return None
