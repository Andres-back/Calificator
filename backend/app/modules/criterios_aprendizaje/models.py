"""Dominio versionado de criterios de aprendizaje.

Las tablas son aditivas: DBA, evaluaciones y desgloses históricos continúan
siendo fuentes válidas durante la transición.
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LearningCriterionSet(Base):
    __tablename__ = "learning_criterion_sets"
    __table_args__ = (
        CheckConstraint("estado IN ('activo','archivado')", name="ck_learning_criterion_set_estado"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    materia_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("materias.id", ondelete="RESTRICT"), nullable=False)
    profesor_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    titulo: Mapped[str] = mapped_column(String(180), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="activo", server_default="activo")
    current_version_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "learning_criterion_versions.id",
            name="fk_learning_criterion_sets_current_version",
            ondelete="RESTRICT",
            use_alter=True,
        ),
        nullable=True,
    )
    legacy_dba_personalizado_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("dba_personalizados.id", ondelete="RESTRICT"), nullable=True)
    legacy_evaluation_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluaciones.id", ondelete="RESTRICT"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


Index("idx_learning_criterion_sets_materia", LearningCriterionSet.materia_id, LearningCriterionSet.estado)
Index("idx_learning_criterion_sets_profesor", LearningCriterionSet.profesor_id)
Index("uq_learning_criterion_sets_legacy", LearningCriterionSet.legacy_dba_personalizado_id, unique=True, postgresql_where=LearningCriterionSet.legacy_dba_personalizado_id.is_not(None))
Index("uq_learning_criterion_sets_legacy_evaluation", LearningCriterionSet.legacy_evaluation_id, unique=True, postgresql_where=LearningCriterionSet.legacy_evaluation_id.is_not(None))


class LearningCriterionVersion(Base):
    __tablename__ = "learning_criterion_versions"
    __table_args__ = (
        UniqueConstraint("set_id", "version_number", name="uq_learning_criterion_version_number"),
        CheckConstraint("version_number >= 1", name="ck_learning_criterion_version_number"),
        CheckConstraint("estado IN ('borrador','procesando','requiere_revision','aprobada','sustituida')", name="ck_learning_criterion_version_estado"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    set_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("learning_criterion_sets.id", ondelete="RESTRICT"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="borrador", server_default="borrador")
    teacher_intent_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    generation_meta_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    coverage_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    source_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_by: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    approved_by: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


Index("idx_learning_criterion_versions_set", LearningCriterionVersion.set_id, LearningCriterionVersion.version_number)
Index("uq_learning_criterion_versions_draft", LearningCriterionVersion.set_id, unique=True, postgresql_where=LearningCriterionVersion.estado.in_(["borrador", "procesando", "requiere_revision"]))


class LearningCriterion(Base):
    __tablename__ = "learning_criteria"
    __table_args__ = (
        UniqueConstraint("version_id", "stable_key", name="uq_learning_criteria_key"),
        UniqueConstraint("version_id", "orden", name="uq_learning_criteria_order"),
        CheckConstraint("orden >= 1", name="ck_learning_criteria_order"),
        CheckConstraint("peso_porcentaje >= 0 AND peso_porcentaje <= 100", name="ck_learning_criteria_weight"),
        CheckConstraint("puntaje_maximo IS NULL OR puntaje_maximo >= 0", name="ck_learning_criteria_points"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    version_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("learning_criterion_versions.id", ondelete="RESTRICT"), nullable=False)
    stable_key: Mapped[str] = mapped_column(String(80), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    nombre: Mapped[str] = mapped_column(String(180), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    evidencia_esperada: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    peso_porcentaje: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("0"), server_default="0")
    puntaje_maximo: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    niveles_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    source_refs_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    official_standard_refs_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


Index("idx_learning_criteria_version_order", LearningCriterion.version_id, LearningCriterion.orden)


class LearningCriterionSource(Base):
    __tablename__ = "learning_criterion_sources"
    __table_args__ = (
        UniqueConstraint("version_id", "orden", name="uq_learning_criterion_source_order"),
        CheckConstraint("orden >= 1", name="ck_learning_criterion_source_order"),
        CheckConstraint("tipo IN ('foto','pdf','documento','texto','material_existente','estandar_oficial')", name="ck_learning_criterion_source_type"),
        CheckConstraint("extraction_status IN ('pendiente','procesando','lista','error','eliminada')", name="ck_learning_criterion_source_status"),
        CheckConstraint("size_bytes IS NULL OR size_bytes >= 0", name="ck_learning_criterion_source_size"),
        CheckConstraint("page_count IS NULL OR page_count >= 1", name="ck_learning_criterion_source_pages"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    version_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("learning_criterion_versions.id", ondelete="RESTRICT"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    private_file_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rag_source_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rag_sources.id", ondelete="RESTRICT"), nullable=True)
    reference_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    extraction_status: Mapped[str] = mapped_column(String(30), nullable=False, default="pendiente", server_default="pendiente")
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    visible_to_student: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


Index("idx_learning_criterion_sources_version", LearningCriterionSource.version_id, LearningCriterionSource.orden)
Index(
    "uq_learning_criterion_sources_hash",
    LearningCriterionSource.version_id,
    LearningCriterionSource.content_hash,
    unique=True,
    postgresql_where=(
        LearningCriterionSource.content_hash.is_not(None)
        & LearningCriterionSource.deleted_at.is_(None)
    ),
)


class LearningCriterionApplication(Base):
    __tablename__ = "learning_criterion_applications"
    __table_args__ = (
        CheckConstraint("target_type IN ('evaluacion','recurso')", name="ck_learning_criterion_application_target"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    version_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("learning_criterion_versions.id", ondelete="RESTRICT"), nullable=False)
    target_type: Mapped[str] = mapped_column(String(30), nullable=False)
    target_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    snapshot_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    snapshot_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    applied_by: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


Index("idx_learning_criterion_applications_target", LearningCriterionApplication.target_type, LearningCriterionApplication.target_id)
Index("uq_learning_criterion_applications_current", LearningCriterionApplication.target_type, LearningCriterionApplication.target_id, unique=True, postgresql_where=LearningCriterionApplication.is_current.is_(True))


class GradingComponentCriterion(Base):
    __tablename__ = "grading_component_criteria"
    __table_args__ = (
        UniqueConstraint("component_id", "application_id", "criterion_stable_key", name="uq_grading_component_criterion"),
        CheckConstraint("max_points >= 0", name="ck_grading_component_criterion_max"),
        CheckConstraint("awarded_points >= 0 AND awarded_points <= max_points", name="ck_grading_component_criterion_awarded"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    component_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("calificacion_componentes.id", ondelete="RESTRICT"), nullable=False)
    application_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("learning_criterion_applications.id", ondelete="RESTRICT"), nullable=False)
    criterion_stable_key: Mapped[str] = mapped_column(String(80), nullable=False)
    criterion_snapshot_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    max_points: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    awarded_points: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


Index("idx_grading_component_criteria_component", GradingComponentCriterion.component_id)
