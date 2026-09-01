"""Add modular roles and permissions.

Revision ID: 202608300001
Revises: 202608270002
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202608300001"
down_revision: Union[str, None] = "202608270002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_primary_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.execute("UPDATE users SET is_primary_admin = true WHERE rol = 'admin' AND estado = 'activo'")

    op.create_table(
        "authorization_roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("normalized_name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_system", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("normalized_name", name="uq_authorization_roles_normalized_name"),
    )
    op.create_table(
        "authorization_permissions",
        sa.Column("key", sa.String(100), nullable=False),
        sa.Column("module", sa.String(60), nullable=False),
        sa.Column("action", sa.String(40), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("risk", sa.String(20), server_default=sa.text("'normal'"), nullable=False),
        sa.Column("active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_index("ix_authorization_permissions_module", "authorization_permissions", ["module"])
    op.create_table(
        "authorization_role_permissions",
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("permission_key", sa.String(100), nullable=False),
        sa.Column("granted_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["authorization_roles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["permission_key"], ["authorization_permissions.key"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["granted_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("role_id", "permission_key"),
    )
    op.create_table(
        "authorization_user_roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("assigned_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("assigned_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("ended_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["authorization_roles.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["ended_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_authorization_user_roles_user_id", "authorization_user_roles", ["user_id"])
    op.create_index("ix_authorization_user_roles_role_id", "authorization_user_roles", ["role_id"])
    op.create_index("uq_authorization_user_roles_active_user", "authorization_user_roles", ["user_id"], unique=True, postgresql_where=sa.text("active = true"))
    op.create_table(
        "audit_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(60), nullable=True),
        sa.Column("entity_id", sa.String(120), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_events_event_created", "audit_events", ["event", "created_at"])
    op.create_index("ix_audit_events_entity", "audit_events", ["entity_type", "entity_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_events_entity", table_name="audit_events")
    op.drop_index("ix_audit_events_event_created", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_index("uq_authorization_user_roles_active_user", table_name="authorization_user_roles")
    op.drop_index("ix_authorization_user_roles_role_id", table_name="authorization_user_roles")
    op.drop_index("ix_authorization_user_roles_user_id", table_name="authorization_user_roles")
    op.drop_table("authorization_user_roles")
    op.drop_table("authorization_role_permissions")
    op.drop_index("ix_authorization_permissions_module", table_name="authorization_permissions")
    op.drop_table("authorization_permissions")
    op.drop_table("authorization_roles")
    op.drop_column("users", "is_primary_admin")
