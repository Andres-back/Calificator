"""Entidades aisladas para estudios autorizados de impacto."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ImpactStudy(Base):
    __tablename__ = "impacto_studies"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    owner_admin_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False,
    )
    previous_study_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("impacto_studies.id", ondelete="RESTRICT"), nullable=True,
    )
    nombre: Mapped[str] = mapped_column(String(180), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    synthetic_only: Mapped[bool] = mapped_column(nullable=False, default=True, server_default=text("true"))
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    protocol_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    participants_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    access_grants_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    import_batches_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    authorization_reference: Mapped[str | None] = mapped_column(String(500), nullable=True)
    retention_policy_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    retention_audit_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


Index("idx_impact_studies_owner", ImpactStudy.owner_admin_id)
Index("idx_impact_studies_state", ImpactStudy.estado)


class ImpactObservation(Base):
    __tablename__ = "impacto_observations"
    __table_args__ = (
        UniqueConstraint("study_id", "external_id", "revision", name="uq_impact_observation_revision"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    study_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("impacto_studies.id", ondelete="RESTRICT"), nullable=False,
    )
    import_batch_id: Mapped[str] = mapped_column(String(100), nullable=False)
    external_id: Mapped[str] = mapped_column(String(120), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    supersedes_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("impacto_observations.id", ondelete="RESTRICT"), nullable=True,
    )
    teacher_pseudonym: Mapped[str] = mapped_column(String(80), nullable=False)
    work_key: Mapped[str] = mapped_column(String(120), nullable=False)
    response_key: Mapped[str | None] = mapped_column(String(120), nullable=True)
    evaluation_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("evaluaciones.id", ondelete="RESTRICT"), nullable=True,
    )
    grade_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("calificaciones.id", ondelete="RESTRICT"), nullable=True,
    )
    condition: Mapped[str] = mapped_column(String(20), nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    payload_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    missing_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    exclusion_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_by: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())


Index("idx_impact_observations_study", ImpactObservation.study_id, ImpactObservation.created_at)
Index("idx_impact_observations_teacher", ImpactObservation.study_id, ImpactObservation.teacher_pseudonym)
Index("idx_impact_observations_work", ImpactObservation.study_id, ImpactObservation.work_key)
