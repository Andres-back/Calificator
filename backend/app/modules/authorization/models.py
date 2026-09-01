from datetime import datetime
from uuid import UUID as PyUUID
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AuthorizationRole(Base):
    __tablename__ = "authorization_roles"
    __table_args__ = (UniqueConstraint("normalized_name", name="uq_authorization_roles_normalized_name"),)

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default=text("1"))
    created_by: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    permissions: Mapped[list["AuthorizationRolePermission"]] = relationship(back_populates="role", cascade="all, delete-orphan")
    assignments: Mapped[list["AuthorizationUserRole"]] = relationship(back_populates="role")


class AuthorizationPermission(Base):
    __tablename__ = "authorization_permissions"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    module: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    risk: Mapped[str] = mapped_column(String(20), nullable=False, default="normal", server_default=text("'normal'"))
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))


class AuthorizationRolePermission(Base):
    __tablename__ = "authorization_role_permissions"

    role_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("authorization_roles.id", ondelete="CASCADE"), primary_key=True)
    permission_key: Mapped[str] = mapped_column(String(100), ForeignKey("authorization_permissions.key", ondelete="RESTRICT"), primary_key=True)
    granted_by: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    role: Mapped[AuthorizationRole] = relationship(back_populates="permissions")
    permission: Mapped[AuthorizationPermission] = relationship()


class AuthorizationUserRole(Base):
    __tablename__ = "authorization_user_roles"
    __table_args__ = (
        Index("uq_authorization_user_roles_active_user", "user_id", unique=True, postgresql_where=text("active = true")),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("authorization_roles.id", ondelete="RESTRICT"), nullable=False, index=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    assigned_by: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    ended_by: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    role: Mapped[AuthorizationRole] = relationship(back_populates="assignments")


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_events_event_created", "event", "created_at"),
        Index("ix_audit_events_entity", "entity_type", "entity_id"),
    )

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    actor_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    event: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(60), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
