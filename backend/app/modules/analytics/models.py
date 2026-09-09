"""Modelo para eventos de analítica (workspace, calificaciones, etc.)."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AnalyticsEvento(Base):
    __tablename__ = "analytics_eventos"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()")
    )
    tipo: Mapped[str] = mapped_column(String(60), nullable=False)
    actor_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    evaluacion_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    calificacion_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())


Index("idx_analytics_tipo", AnalyticsEvento.tipo)
Index("idx_analytics_created", AnalyticsEvento.created_at)


class AnalyticsWorkSession(Base):
    __tablename__ = "analytics_work_sessions"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4,
    )
    actor_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False,
    )
    condicion: Mapped[str] = mapped_column(String(20), nullable=False)
    fase: Mapped[str] = mapped_column(String(30), nullable=False)
    evaluacion_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("evaluaciones.id", ondelete="RESTRICT"), nullable=True,
    )
    calificacion_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("calificaciones.id", ondelete="RESTRICT"), nullable=True,
    )
    batch_job_id: Mapped[PyUUID | None] = mapped_column(
        # ai_jobs se administra con SQL explícito y no tiene mapper ORM. La
        # migración conserva la FK RESTRICT en PostgreSQL.
        UUID(as_uuid=True), nullable=True,
    )
    study_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    owner_token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    intervals_json: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"),
    )
    duracion_confirmada_ms: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0, server_default="0")
    incertidumbre_ms: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0, server_default="0")
    origen: Mapped[str] = mapped_column(String(20), nullable=False, default="observado")
    motivo_ajuste: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


Index("idx_work_sessions_actor_started", AnalyticsWorkSession.actor_id, AnalyticsWorkSession.started_at)
Index("idx_work_sessions_evaluation", AnalyticsWorkSession.evaluacion_id)
Index("idx_work_sessions_study", AnalyticsWorkSession.study_id)
Index(
    "uq_work_sessions_actor_open",
    AnalyticsWorkSession.actor_id,
    unique=True,
    postgresql_where=text("estado IN ('active','paused')"),
)
