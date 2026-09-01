from datetime import datetime
from uuid import UUID as PyUUID
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class OllamaConnector(Base):
    __tablename__ = "ollama_connectors"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    profesor_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    platform: Mapped[str] = mapped_column(String(30), nullable=False, default="windows", server_default="windows")
    version: Mapped[str | None] = mapped_column(String(40), nullable=True)
    secret_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="disconnected", server_default="disconnected")
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    models: Mapped[list["OllamaConnectorModel"]] = relationship(back_populates="connector", cascade="all, delete-orphan")


class OllamaPairingCode(Base):
    __tablename__ = "ollama_pairing_codes"
    __table_args__ = (UniqueConstraint("code_hash", name="uq_ollama_pairing_codes_hash"),)

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    profesor_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    connector_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("ollama_connectors.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())


class OllamaConnectorModel(Base):
    __tablename__ = "ollama_connector_models"

    connector_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ollama_connectors.id", ondelete="CASCADE"), primary_key=True)
    model_id: Mapped[str] = mapped_column(String(240), primary_key=True)
    capabilities: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    connector: Mapped[OllamaConnector] = relationship(back_populates="models")


class OllamaConnectorJob(Base):
    __tablename__ = "ollama_connector_jobs"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_ollama_connector_jobs_idempotency"),
        Index("ix_ollama_connector_jobs_claim", "profesor_id", "status", "created_at"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    # ai_jobs se administra mediante SQL explícito y migraciones, no como
    # modelo ORM. La migración conserva la FK real; aquí evitamos registrar
    # una referencia ORM hacia una tabla ausente de Base.metadata.
    source_job_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    profesor_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    connector_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("ollama_connectors.id", ondelete="SET NULL"), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(160), nullable=False)
    feature: Mapped[str] = mapped_column(String(80), nullable=False)
    model_id: Mapped[str] = mapped_column(String(240), nullable=False)
    payload_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    result_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="waiting_connector", server_default="waiting_connector")
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    lease_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
