"""Registro de auditoría para acciones críticas."""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger

logger = get_logger(__name__)

AUDIT_EVENTS = {
    "login",
    "register",
    "create_evaluacion",
    "calificacion_sugerida",
    "nota_ajustada",
    "nota_confirmada",
    "export_report",
    "ai_error",
    "api_key_updated",
    "password_reset_created",
    "password_reset_limited",
    "password_reset_consumed",
}


async def audit(
    db: AsyncSession,
    *,
    event: str,
    user_id: UUID | None = None,
    metadata: dict | None = None,
) -> None:
    """Registra un evento sanitizado en log y persistencia independiente."""
    safe_metadata = _sanitize_metadata(metadata or {})
    logger.info(
        "AUDIT event=%s user_id=%s metadata=%s",
        event,
        str(user_id) if user_id else "anonymous",
        safe_metadata,
    )
    try:
        from app.db.session import AsyncSessionLocal

        async with AsyncSessionLocal() as audit_db:
            entity_type, entity_id = _entity_from(event, safe_metadata)
            await audit_db.execute(
                text(
                    "INSERT INTO audit_events (actor_id, event, entity_type, entity_id, metadata) "
                    "VALUES (:actor, :event, :entity_type, :entity_id, CAST(:metadata AS jsonb))"
                ),
                {
                    "actor": str(user_id) if user_id else None,
                    "event": event[:100],
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "metadata": json.dumps(safe_metadata, ensure_ascii=False),
                },
            )
            await audit_db.commit()
    except Exception as exc:  # pragma: no cover - despliegues parciales conservan el log
        logger.warning("Persistent audit unavailable for %s: %s", event, type(exc).__name__)


def _sanitize_metadata(value: Any) -> Any:
    if isinstance(value, dict):
        result: dict[str, Any] = {}
        for key, item in value.items():
            normalized = str(key).lower()
            if any(blocked in normalized for blocked in ("password", "secret", "token", "api_key")):
                continue
            result[str(key)[:80]] = _sanitize_metadata(item)
        return result
    if isinstance(value, (list, tuple, set)):
        return [_sanitize_metadata(item) for item in list(value)[:100]]
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return str(value)[:500]


def _entity_from(event: str, metadata: dict[str, Any]) -> tuple[str | None, str | None]:
    if metadata.get("role_id"):
        return "authorization_role", str(metadata["role_id"])[:120]
    if metadata.get("target_user_id"):
        return "user", str(metadata["target_user_id"])[:120]
    if event.startswith("password_reset"):
        return "password_reset", None
    return None, None
