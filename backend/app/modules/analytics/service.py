"""Servicio de analítica — registro de eventos del workspace."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.modules.analytics.models import AnalyticsEvento

logger = get_logger(__name__)


async def registrar_evento(
    db: AsyncSession,
    tipo: str,
    actor_id: UUID | None = None,
    evaluacion_id: UUID | None = None,
    calificacion_id: UUID | None = None,
    metadata_json: dict | None = None,
) -> None:
    """Registra un evento de analítica sin bloqueo."""
    evento = AnalyticsEvento(
        tipo=tipo,
        actor_id=actor_id,
        evaluacion_id=evaluacion_id,
        calificacion_id=calificacion_id,
        metadata_json=metadata_json or {},
    )
    db.add(evento)
    await db.commit()
    logger.debug("Analytics event: %s (actor=%s)", tipo, actor_id)
