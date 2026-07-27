"""Modelo: refuerzos pedagógicos generados por Xali."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class XaliRefuerzo(Base):
    """Refuerzo pedagógico generado por Xali a partir de criterios con dificultad."""
    __tablename__ = "xali_refuerzos"
    __table_args__ = (
        CheckConstraint("tipo IN ('actividad','explicacion','ejercicio','plan_clase')", name="ck_refuerzos_tipo"),
        CheckConstraint("estado IN ('borrador','aprobado','guardado','descartado')", name="ck_refuerzos_estado"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    profesor_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    materia_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("materias.id"), nullable=True)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="borrador")
    criterio_nombre: Mapped[str | None] = mapped_column(String(220), nullable=True)
    contexto_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    contenido_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    prompt_usado: Mapped[str | None] = mapped_column(Text, nullable=True)
    modelo: Mapped[str | None] = mapped_column(String(60), nullable=True)
    material_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
