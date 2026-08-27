from __future__ import annotations

from datetime import datetime
from uuid import UUID as PyUUID
from uuid import uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"
    __table_args__ = (
        CheckConstraint(
            "delivery_status IN ('pending', 'sending', 'sent', 'failed')",
            name="ck_password_reset_delivery_status",
        ),
        Index(
            "ix_password_reset_requests_user_created",
            "user_id",
            "created_at",
        ),
        Index(
            "uq_password_reset_requests_active_user",
            "user_id",
            unique=True,
            postgresql_where=text(
                "consumed_at IS NULL AND invalidated_at IS NULL"
            ),
        ),
    )

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    user_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    request_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    invalidated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    delivery_status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="pending", server_default="pending"
    )
    delivery_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    delivery_error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True
    )


class MailGlobalConfig(Base):
    __tablename__ = "mail_global_config"
    __table_args__ = (
        CheckConstraint("id = 1", name="ck_mail_global_config_singleton"),
    )

    id: Mapped[int] = mapped_column(
        SmallInteger, primary_key=True, default=1, server_default=text("1")
    )
    host: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    use_starttls: Mapped[bool] = mapped_column(nullable=False, default=True)
    username: Mapped[str] = mapped_column(String(320), nullable=False)
    from_email: Mapped[str] = mapped_column(String(320), nullable=False)
    password_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    updated_by: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    last_test_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    last_test_latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_test_error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    last_test_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )