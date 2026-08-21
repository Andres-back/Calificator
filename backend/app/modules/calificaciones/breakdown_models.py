"""Persistencia versionada para explicar y auditar calificaciones."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, SmallInteger, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CalificacionDesglose(Base):
    __tablename__ = "calificacion_desgloses"
    __table_args__ = (
        UniqueConstraint("calificacion_id", "version", name="uq_desglose_calificacion_version"),
        CheckConstraint("version >= 1", name="ck_desglose_version"),
        CheckConstraint("puntos_posibles > 0", name="ck_desglose_puntos_posibles"),
        CheckConstraint("nota_maxima > 0", name="ck_desglose_nota_maxima"),
        CheckConstraint("decimales BETWEEN 0 AND 4", name="ck_desglose_decimales"),
        CheckConstraint("cobertura_estado IN ('completa','incompleta','inconsistente')", name="ck_desglose_cobertura"),
        CheckConstraint("origen IN ('automatico','docente','manual')", name="ck_desglose_origen"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    calificacion_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("calificaciones.id", ondelete="CASCADE"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    pipeline_run_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    origen: Mapped[str] = mapped_column(String(20), nullable=False, default="automatico")
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    cobertura_estado: Mapped[str] = mapped_column(String(20), nullable=False, default="incompleta")
    puntos_obtenidos: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    puntos_posibles: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    nota_maxima: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    nota_base: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    ajuste_global: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False, default=Decimal("0"))
    nota_antes_redondeo: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    regla_redondeo: Mapped[str] = mapped_column(String(20), nullable=False, default="half_up")
    decimales: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=2)
    nota_final: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    requiere_revision: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    bloqueos_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    procedencia_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    creado_por: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    componentes: Mapped[list["CalificacionComponente"]] = relationship(
        "CalificacionComponente", back_populates="desglose", cascade="all, delete-orphan", order_by="CalificacionComponente.orden"
    )


Index("idx_desglose_calificacion", CalificacionDesglose.calificacion_id)
Index("uq_desglose_activo", CalificacionDesglose.calificacion_id, unique=True, postgresql_where=CalificacionDesglose.activo.is_(True))
Index("uq_desglose_pipeline_run", CalificacionDesglose.calificacion_id, CalificacionDesglose.pipeline_run_id, unique=True, postgresql_where=CalificacionDesglose.pipeline_run_id.is_not(None))


class CalificacionComponente(Base):
    __tablename__ = "calificacion_componentes"
    __table_args__ = (
        UniqueConstraint("desglose_id", "clave", name="uq_componente_desglose_clave"),
        CheckConstraint("orden >= 0", name="ck_componente_orden"),
        CheckConstraint("puntos_maximos > 0", name="ck_componente_maximo"),
        CheckConstraint("puntos_obtenidos IS NULL OR (puntos_obtenidos >= 0 AND puntos_obtenidos <= puntos_maximos)", name="ck_componente_puntos"),
        CheckConstraint("tipo IN ('pregunta','rubrica','manual')", name="ck_componente_tipo"),
        CheckConstraint("estado IN ('correcta','parcial','incorrecta','sin_respuesta','ilegible','no_evaluable','revision_pendiente')", name="ck_componente_estado"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    desglose_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("calificacion_desgloses.id", ondelete="CASCADE"), nullable=False)
    clave: Mapped[str] = mapped_column(String(160), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    numero: Mapped[str | None] = mapped_column(String(80), nullable=True)
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    respuesta_estudiante: Mapped[str | None] = mapped_column(Text, nullable=True)
    respuesta_referencia: Mapped[str | None] = mapped_column(Text, nullable=True)
    puntos_obtenidos: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)
    puntos_maximos: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    estado: Mapped[str] = mapped_column(String(30), nullable=False)
    explicacion_verificable: Mapped[str] = mapped_column(Text, nullable=False, default="")
    explicacion_estudiante: Mapped[str | None] = mapped_column(Text, nullable=True)
    origen: Mapped[str] = mapped_column(String(30), nullable=False)
    requiere_revision: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    evidencia_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    valoraciones_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    desglose: Mapped[CalificacionDesglose] = relationship("CalificacionDesglose", back_populates="componentes")


Index("idx_componente_desglose_orden", CalificacionComponente.desglose_id, CalificacionComponente.orden)


class CalificacionAjuste(Base):
    __tablename__ = "calificacion_ajustes"
    __table_args__ = (
        CheckConstraint("tipo IN ('componente','global','explicacion','resolucion')", name="ck_ajuste_tipo"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    calificacion_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("calificaciones.id", ondelete="CASCADE"), nullable=False)
    desglose_anterior_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("calificacion_desgloses.id"), nullable=False)
    desglose_nuevo_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("calificacion_desgloses.id"), nullable=False)
    componente_clave: Mapped[str | None] = mapped_column(String(160), nullable=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    valor_anterior_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    valor_nuevo_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    motivo_interno: Mapped[str] = mapped_column(Text, nullable=False)
    explicacion_estudiante: Mapped[str] = mapped_column(Text, nullable=False)
    actor_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())


Index("idx_ajuste_calificacion", CalificacionAjuste.calificacion_id, CalificacionAjuste.created_at)
