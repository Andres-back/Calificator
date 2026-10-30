"""Durable receipt for an explicitly confirmed deterministic score update."""
from datetime import datetime
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EvaluationScoreOperation(Base):
    __tablename__ = 'evaluacion_reparto_operaciones'
    __table_args__ = (
        UniqueConstraint('actor_id', 'request_id', name='uq_reparto_actor_request'),
        CheckConstraint('length(request_hash) = 64', name='ck_reparto_request_hash'),
    )
    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text('uuid_generate_v4()'))
    request_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    evaluacion_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey('evaluaciones.id'), nullable=False)
    actor_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    request_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    resultado_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
