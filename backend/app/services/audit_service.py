"""Registro de auditoría para acciones críticas."""
from __future__ import annotations

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
}


async def audit(
    db: AsyncSession,
    *,
    event: str,
    user_id: UUID | None = None,
    metadata: dict | None = None,
) -> None:
    """
    Escribe un evento de auditoría en los logs estructurados.
    En el futuro se puede extender a una tabla audit_logs.
    """
    logger.info(
        "AUDIT event=%s user_id=%s metadata=%s",
        event,
        str(user_id) if user_id else "anonymous",
        metadata or {},
    )
