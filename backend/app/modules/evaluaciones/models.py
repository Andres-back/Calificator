from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import uuid4
from uuid import UUID as PyUUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.shared.enums import BlueprintNivelContexto, EvaluacionEstado

if TYPE_CHECKING:
    from app.modules.materias.models import Materia
    from app.modules.users.models import User


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
        CheckConstraint(
            "politica_intento IN ('un_intento', 'multiples_intentos', 'mejor_puntaje', 'ultimo_intento', 'practica_libre')",
            name="ck_evaluaciones_politica_intento",
        ),
        CheckConstraint(
            "intentos_permitidos IS NULL OR intentos_permitidos > 0",
            name="ck_evaluaciones_intentos_permitidos",
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
    # La tabla materiales_generados se administra con SQL/Alembic y no forma
    # parte de Base.metadata; la FK real ON DELETE SET NULL vive en la migracion.
    material_origen_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    tipo_actividad: Mapped[str | None] = mapped_column(String(60), nullable=True)
    recepcion_habilitada: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    politica_intento: Mapped[str | None] = mapped_column(String(30), nullable=True)
    intentos_permitidos: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    fecha_publicacion: Mapped[datetime | None] = mapped_column(DateTime)
    fecha_limite_entrega: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    tiempo_limite_minutos: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
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
    configuracion_impresion: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    estructura_documento: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    contenido_version_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evaluacion_contenido_versiones.id", name="fk_evaluaciones_contenido_version", use_alter=True),
        nullable=True,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    materia: Mapped["Materia"] = relationship("Materia", back_populates="evaluaciones")
    profesor: Mapped["User"] = relationship("User", back_populates="evaluaciones")
    blueprint: Mapped["EvaluacionBlueprint | None"] = relationship(
        "EvaluacionBlueprint",
        back_populates="evaluacion",
        cascade="all, delete-orphan",
        lazy="selectin",
        uselist=False,
    )

    @property
    def lectura(self) -> str | None:
        from app.modules.evaluaciones.reading_service import evaluation_reading
        return evaluation_reading(self)


Index("idx_evaluaciones_materia", Evaluacion.materia_id)
Index("idx_evaluaciones_profesor", Evaluacion.profesor_id)
Index("idx_evaluaciones_estado", Evaluacion.estado)
Index("idx_evaluaciones_deleted_at", Evaluacion.deleted_at)
Index("idx_evaluaciones_fecha_limite_entrega", Evaluacion.fecha_limite_entrega)
Index(
    "uq_evaluaciones_material_origen_nonnull",
    Evaluacion.material_origen_id,
    unique=True,
    postgresql_where=Evaluacion.material_origen_id.is_not(None),
)


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


class EvaluacionRecurso(Base):
    """Private durable bytes; an accepted replacement always gets a new ID."""

    __tablename__ = "evaluacion_recursos"
    __table_args__ = (
        UniqueConstraint("propietario_id", "request_key", name="uq_evaluacion_recursos_request"),
        UniqueConstraint("storage_key", name="uq_evaluacion_recursos_storage"),
        CheckConstraint("evaluacion_id IS NOT NULL OR borrador_id IS NOT NULL", name="ck_evaluacion_recursos_scope"),
        CheckConstraint("estado IN ('staged','ready','failed','retired')", name="ck_evaluacion_recursos_estado"),
        CheckConstraint("origen IN ('importado','subido','ia')", name="ck_evaluacion_recursos_origen"),
        CheckConstraint("clase IN ('original','pagina','imagen','dibujo','render_tabla','render_grafica','formula')", name="ck_evaluacion_recursos_clase"),
        CheckConstraint("seguridad_contenido IN ('privado_original','pendiente_revision','publicable_confirmado')", name="ck_evaluacion_recursos_seguridad"),
        CheckConstraint("clase != 'original' OR seguridad_contenido = 'privado_original'", name="ck_evaluacion_recursos_original_privado"),
        CheckConstraint("bytes_size > 0 AND length(sha256) = 64", name="ck_evaluacion_recursos_integridad"),
        CheckConstraint("(ancho IS NULL OR ancho > 0) AND (alto IS NULL OR alto > 0) AND (paginas IS NULL OR paginas > 0)", name="ck_evaluacion_recursos_dimensiones"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    propietario_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    materia_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("materias.id"), nullable=False)
    evaluacion_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluaciones.id"), nullable=True)
    borrador_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    # ai_jobs is SQL-managed; follow the existing non-ORM job-reference contract.
    job_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    request_key: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    clase: Mapped[str] = mapped_column(String(30), nullable=False)
    origen: Mapped[str] = mapped_column(String(20), nullable=False)
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    mime: Mapped[str] = mapped_column(String(100), nullable=False)
    bytes_size: Mapped[int] = mapped_column(Integer, nullable=False)
    ancho: Mapped[int | None] = mapped_column(Integer, nullable=True)
    alto: Mapped[int | None] = mapped_column(Integer, nullable=True)
    paginas: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="staged")
    seguridad_contenido: Mapped[str] = mapped_column(String(30), nullable=False, default="pendiente_revision")
    procedencia_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


Index("idx_evaluacion_recursos_scope", EvaluacionRecurso.evaluacion_id, EvaluacionRecurso.materia_id)
Index("idx_evaluacion_recursos_cleanup", EvaluacionRecurso.estado, EvaluacionRecurso.created_at)


class EvaluacionContenidoVersion(Base):
    """Immutable content snapshot, including private answer keys and criteria."""

    __tablename__ = "evaluacion_contenido_versiones"
    __table_args__ = (
        UniqueConstraint("evaluacion_id", "numero_version", name="uq_evaluacion_contenido_numero"),
        CheckConstraint("numero_version > 0 AND schema_version = 1", name="ck_evaluacion_contenido_version"),
        CheckConstraint("length(content_hash) = 64", name="ck_evaluacion_contenido_hash"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    evaluacion_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluaciones.id"), nullable=False)
    numero_version: Mapped[int] = mapped_column(Integer, nullable=False)
    autor_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    previous_version_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluacion_contenido_versiones.id"), nullable=True)
    source_resource_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluacion_recursos.id"), nullable=True)
    motivo: Mapped[str] = mapped_column(String(500), nullable=False)
    origen: Mapped[str] = mapped_column(String(40), nullable=False)
    snapshot_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    coverage_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    recurso_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    legacy_baseline: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


Index("idx_evaluacion_contenido_evaluacion", EvaluacionContenidoVersion.evaluacion_id)
