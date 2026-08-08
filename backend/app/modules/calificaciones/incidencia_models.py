"""Modelo SQLAlchemy: Incidencias de calificación."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CalificacionIncidencia(Base):
    __tablename__ = "calificacion_incidencias"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('imagen_no_usable','vision_failed','grader_error','discrepancia_alta','confianza_baja','docente_rechazo','solicitud_revision')",
            name="ck_incidencias_tipo",
        ),
        CheckConstraint(
            "estado IN ('abierta','resuelta')",
            name="ck_incidencias_estado",
        ),
    )

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()")
    )
    calificacion_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("calificaciones.id", ondelete="CASCADE"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="abierta")
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    resolucion: Mapped[str | None] = mapped_column(Text, nullable=True)
    resuelto_por: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )


Index("idx_incidencias_calificacion", CalificacionIncidencia.calificacion_id)
Index("idx_incidencias_estado", CalificacionIncidencia.estado)
