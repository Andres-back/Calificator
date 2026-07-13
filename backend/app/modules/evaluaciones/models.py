from datetime import datetime
from decimal import Decimal
from uuid import uuid4
from uuid import UUID as PyUUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.shared.enums import BlueprintNivelContexto, EvaluacionEstado, EvaluacionModalidad, EvaluacionTipoOrigen


class Evaluacion(Base):
    __tablename__ = "evaluaciones"
    __table_args__ = (
        CheckConstraint(
            "tipo_origen IN ('nativa', 'externa_digitalizada', 'sorpresa')",
            name="ck_evaluaciones_tipo_origen",
        ),
        CheckConstraint(
            "estado IN ('borrador', 'publicada', 'en_calificacion', 'pendiente_revision', 'cerrada')",
            name="ck_evaluaciones_estado",
        ),
        CheckConstraint(
            "modalidad IN ('online', 'fisica', 'mixta')",
            name="ck_evaluaciones_modalidad",
        ),
    )

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    materia_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("materias.id"),
        nullable=False,
    )
    profesor_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    nombre: Mapped[str] = mapped_column(String(220), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    tipo_origen: Mapped[str] = mapped_column(String(40), nullable=False)
    nota_maxima: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("5.0"))
    estado: Mapped[str] = mapped_column(String(40), nullable=False, default=EvaluacionEstado.BORRADOR.value)
    modalidad: Mapped[str | None] = mapped_column(String(20), nullable=True)
    fecha_publicacion: Mapped[datetime | None] = mapped_column(DateTime)
    dba_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    dba_personalizado_ids: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    metas_profesor: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    criterios: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    preguntas: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    respuestas_esperadas: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    materia: Mapped["Materia"] = relationship("Materia", back_populates="evaluaciones")  # type: ignore[name-defined]
    profesor: Mapped["User"] = relationship("User", back_populates="evaluaciones")  # type: ignore[name-defined]
    blueprint: Mapped["EvaluacionBlueprint | None"] = relationship(
        "EvaluacionBlueprint",
        back_populates="evaluacion",
        cascade="all, delete-orphan",
        lazy="selectin",
        uselist=False,
    )


Index("idx_evaluaciones_materia", Evaluacion.materia_id)
Index("idx_evaluaciones_profesor", Evaluacion.profesor_id)
Index("idx_evaluaciones_estado", Evaluacion.estado)


class EvaluacionBlueprint(Base):
    __tablename__ = "evaluacion_blueprints"
    __table_args__ = (
        UniqueConstraint("evaluacion_id", name="uq_evaluacion_blueprints_evaluacion"),
        CheckConstraint(
            "nivel_contexto IN ('completo', 'reconstruido', 'minimo')",
            name="ck_evaluacion_blueprints_nivel_contexto",
        ),
    )

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    evaluacion_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evaluaciones.id", ondelete="CASCADE"),
        nullable=False,
    )
    nivel_contexto: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=BlueprintNivelContexto.COMPLETO.value,
    )
    dba: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    metas: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    criterios: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    preguntas: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    respuestas_esperadas: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    errores_comunes: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    contexto_rag: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    reglas_feedback: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    evaluacion: Mapped[Evaluacion] = relationship("Evaluacion", back_populates="blueprint")


Index("idx_evaluacion_blueprints_evaluacion", EvaluacionBlueprint.evaluacion_id)
