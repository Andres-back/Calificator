"""Modelo para eventos de analítica (workspace, calificaciones, etc.)."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import DateTime, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AnalyticsEvento(Base):
    __tablename__ = "analytics_eventos"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()")
    )
    tipo: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    actor_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    evaluacion_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    calificacion_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())


Index("idx_analytics_tipo", AnalyticsEvento.tipo)
Index("idx_analytics_created", AnalyticsEvento.created_at)
