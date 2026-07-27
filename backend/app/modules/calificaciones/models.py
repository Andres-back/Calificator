"""Modelos SQLAlchemy: Entrega y Calificacion."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey, Index,
    Numeric, String, Text, UniqueConstraint, func, text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.shared.enums import CalificacionEstado, EntregaEstado, EntregaTipo


class Entrega(Base):
    __tablename__ = "entregas"
    __table_args__ = (
        CheckConstraint("tipo IN ('online','foto','pdf','captura','opcion_multiple','interactiva','mixta')", name="ck_entregas_tipo"),
        CheckConstraint(
            "estado IN ('pendiente','en_progreso','recibida','procesando','calificada','revisada','requiere_reintento')",
            name="ck_entregas_estado",
        ),
    )

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()")
    )
    evaluacion_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("evaluaciones.id", ondelete="CASCADE"), nullable=False
    )
    estudiante_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    materia_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("materias.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    respuesta_texto: Mapped[str | None] = mapped_column(Text, nullable=True)
    archivo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    visual_text_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    estado: Mapped[str] = mapped_column(String(40), nullable=False, default=EntregaEstado.PENDIENTE.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    calificacion: Mapped["Calificacion | None"] = relationship(
        "Calificacion", back_populates="entrega", uselist=False
    )


Index("idx_entregas_evaluacion", Entrega.evaluacion_id)
Index("idx_entregas_estudiante", Entrega.estudiante_id)
Index("idx_entregas_materia", Entrega.materia_id)


class Calificacion(Base):
    __tablename__ = "calificaciones"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('sugerida','confirmada','ajustada','requiere_revision','anulada')",
            name="ck_calificaciones_estado",
        ),
    )

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()")
    )
    evaluacion_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluaciones.id"), nullable=False)
    entrega_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("entregas.id"), nullable=True
    )
    estudiante_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    materia_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("materias.id"), nullable=False)
    profesor_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    nota_sugerida: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    nota_confirmada: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    confianza: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    resultado_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    revisado_por_docente: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    estado: Mapped[str] = mapped_column(String(40), nullable=False, default=CalificacionEstado.SUGERIDA.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    entrega: Mapped[Entrega | None] = relationship("Entrega", back_populates="calificacion")


Index("idx_calificaciones_estudiante_materia", Calificacion.estudiante_id, Calificacion.materia_id)
Index("idx_calificaciones_evaluacion", Calificacion.evaluacion_id)
Index(
    "uq_calificaciones_entrega_nonnull",
    Calificacion.entrega_id,
    unique=True,
    postgresql_where=Calificacion.entrega_id.is_not(None),
)


class SalonSesion(Base):
    """Persiste una sesión de Modo Salón para sobrevivir reinicios del servidor."""
    __tablename__ = "salon_sesiones"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, comment="hex UUID sin guiones")
    evaluacion_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("evaluaciones.id", ondelete="CASCADE"), nullable=False
    )
    profesor_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="activa")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )


class SalonSesionEstudiante(Base):
    """Estado por estudiante dentro de una sesión de Modo Salón."""
    __tablename__ = "salon_sesion_estudiantes"
    __table_args__ = (
        UniqueConstraint("sesion_id", "estudiante_id", name="uq_salon_sesion_estudiante"),
    )

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()")
    )
    sesion_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("salon_sesiones.id", ondelete="CASCADE"), nullable=False
    )
    estudiante_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    error_msg: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )


Index("idx_sse_sesion", SalonSesionEstudiante.sesion_id)
Index("idx_sse_estudiante", SalonSesionEstudiante.estudiante_id)


Index("idx_salon_sesiones_evaluacion", SalonSesion.evaluacion_id)
Index("idx_salon_sesiones_profesor", SalonSesion.profesor_id)
