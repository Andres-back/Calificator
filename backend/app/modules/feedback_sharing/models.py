"""Persistencia aditiva de publicaciones, credenciales hash y cuota estable."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FeedbackDeliveryReview(Base):
    __tablename__ = 'feedback_delivery_reviews'
    __table_args__ = (
        UniqueConstraint('authorized_by', 'calificacion_id', 'request_id', name='uq_feedback_delivery_review_request'),
        CheckConstraint("scope IN ('summary','detail')", name='ck_feedback_delivery_review_scope'),
        CheckConstraint('length(feedback_text) BETWEEN 1 AND 6000', name='ck_feedback_delivery_review_text'),
        Index('ix_feedback_delivery_review_grade', 'calificacion_id', 'authorized_at'),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    calificacion_id: Mapped[UUID] = mapped_column(ForeignKey('calificaciones.id'))
    authorized_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))
    authorized_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.clock_timestamp())
    source_fingerprint: Mapped[str] = mapped_column(String(64))
    scope: Mapped[str] = mapped_column(String(20))
    feedback_text: Mapped[str] = mapped_column(Text)
    request_id: Mapped[UUID] = mapped_column()
    request_fingerprint: Mapped[str] = mapped_column(String(64))


class FeedbackPublication(Base):
    __tablename__ = "feedback_publications"
    __table_args__ = (
        UniqueConstraint("calificacion_id", "revision", name="uq_feedback_publication_revision"),
        CheckConstraint("revision >= 1", name="ck_feedback_publication_revision"),
        CheckConstraint("state IN ('authorized','suspended')", name="ck_feedback_publication_state"),
        Index("ix_feedback_publication_grade", "calificacion_id", "state"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    calificacion_id: Mapped[UUID] = mapped_column(ForeignKey("calificaciones.id"))
    estudiante_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    evaluacion_id: Mapped[UUID] = mapped_column(ForeignKey("evaluaciones.id"))
    materia_id: Mapped[UUID] = mapped_column(ForeignKey("materias.id"))
    authorized_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    breakdown_id: Mapped[UUID | None] = mapped_column(ForeignKey("calificacion_desgloses.id"), nullable=True)
    revision: Mapped[int] = mapped_column(Integer)
    schema_version: Mapped[int] = mapped_column(Integer, default=1)
    content_fingerprint: Mapped[str] = mapped_column(String(64))
    payload_json: Mapped[dict] = mapped_column(JSONB)
    evidence_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    state: Mapped[str] = mapped_column(String(20), default="authorized")
    authorized_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class FeedbackAccess(Base):
    __tablename__ = "feedback_accesses"
    __table_args__ = (
        UniqueConstraint("created_by", "creation_request_id", "calificacion_id", name="uq_feedback_access_creation"),
        CheckConstraint("state IN ('active','disabled','suspended')", name="ck_feedback_access_state"),
        CheckConstraint("version >= 1 AND credential_generation >= 1", name="ck_feedback_access_version"),
        Index("ix_feedback_access_publication", "publication_id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    publication_id: Mapped[UUID] = mapped_column(ForeignKey("feedback_publications.id"))
    calificacion_id: Mapped[UUID] = mapped_column(ForeignKey("calificaciones.id"))
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    creation_request_id: Mapped[UUID] = mapped_column()
    credential_digest: Mapped[str] = mapped_column(String(64), unique=True)
    credential_generation: Mapped[int] = mapped_column(Integer, default=1)
    version: Mapped[int] = mapped_column(Integer, default=1)
    state: Mapped[str] = mapped_column(String(20), default="active")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    disabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    operations_json: Mapped[dict] = mapped_column(JSONB, default=dict)


class FeedbackChatQuota(Base):
    __tablename__ = "feedback_chat_quotas"
    __table_args__ = (UniqueConstraint("estudiante_id", "evaluacion_id", name="uq_feedback_quota_subject"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    estudiante_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    evaluacion_id: Mapped[UUID] = mapped_column(ForeignKey("evaluaciones.id"))


class FeedbackChatRequest(Base):
    __tablename__ = "feedback_chat_requests"
    __table_args__ = (
        UniqueConstraint("access_id", "credential_generation", "client_request_id", name="uq_feedback_chat_request"),
        CheckConstraint("status IN ('queued','running','succeeded','failed','closed')", name="ck_feedback_chat_status"),
        Index("ix_feedback_chat_quota_window", "quota_id", "accepted_at"),
        Index("ix_feedback_chat_dispatch", "status", "dispatch_pending"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    access_id: Mapped[UUID] = mapped_column(ForeignKey("feedback_accesses.id"))
    publication_id: Mapped[UUID] = mapped_column(ForeignKey("feedback_publications.id"))
    quota_id: Mapped[UUID] = mapped_column(ForeignKey("feedback_chat_quotas.id"))
    credential_generation: Mapped[int] = mapped_column(Integer)
    client_request_id: Mapped[UUID] = mapped_column()
    request_fingerprint: Mapped[str] = mapped_column(String(64))
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    response: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="queued")
    error_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.clock_timestamp())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dispatch_pending: Mapped[bool] = mapped_column(Boolean, default=True)
