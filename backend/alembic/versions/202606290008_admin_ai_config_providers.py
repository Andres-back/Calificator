"""Admin AI config: provider_settings, feature_routing, global_limits, audit_logs

Revision ID: 202606290008
Revises: 202606290007
Create Date: 2026-07-08
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202606290008"
down_revision: str | None = "202606290007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_provider_settings",
        sa.Column("id", sa.String(60), nullable=False),
        sa.Column("tipo", sa.String(30), nullable=False, server_default="texto"),
        sa.Column("label", sa.String(100), nullable=True),
        sa.Column("base_url", sa.Text(), nullable=True),
        sa.Column("model", sa.String(200), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="99"),
        sa.Column("timeout_seconds", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("max_retries", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("priority > 0", name="ck_ai_provider_priority_positive"),
        sa.CheckConstraint("timeout_seconds > 0", name="ck_ai_provider_timeout_positive"),
        sa.CheckConstraint("max_retries >= 0", name="ck_ai_provider_retries_non_negative"),
    )
    op.create_index("idx_ai_providers_tipo", "ai_provider_settings", ["tipo"])
    op.create_index("idx_ai_providers_active", "ai_provider_settings", ["active", "priority"])

    op.create_table(
        "ai_feature_routing",
        sa.Column("feature", sa.String(60), nullable=False),
        sa.Column("label", sa.String(100), nullable=True),
        sa.Column("primary_provider", sa.String(60), nullable=True),
        sa.Column("fallback_provider", sa.String(60), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("feature"),
    )

    op.create_table(
        "ai_global_limits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("max_requests_per_profesor_day", sa.Integer(), nullable=False, server_default="200"),
        sa.Column("max_requests_per_estudiante_day", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("max_images_per_day", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("max_presentations_per_day", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("max_tokens_per_request", sa.Integer(), nullable=False, server_default="4096"),
        sa.Column("max_concurrency", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("rate_limit_message", sa.Text(), server_default="Has superado el limite diario. Intenta de nuevo manana."),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("max_requests_per_profesor_day >= 0", name="ck_limits_profesor_non_negative"),
        sa.CheckConstraint("max_requests_per_estudiante_day >= 0", name="ck_limits_estudiante_non_negative"),
        sa.CheckConstraint("max_images_per_day >= 0", name="ck_limits_images_non_negative"),
    )
    op.execute("INSERT INTO ai_global_limits (id, max_requests_per_profesor_day, max_requests_per_estudiante_day) VALUES (1, 200, 50)")

    op.create_table(
        "ai_config_audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("admin_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("action", sa.String(60), nullable=False),
        sa.Column("entity", sa.String(60), nullable=False),
        sa.Column("entity_id", sa.String(120), nullable=True),
        sa.Column("field_name", sa.String(100), nullable=True),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("result", sa.String(20), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_ai_audit_admin", "ai_config_audit_logs", ["admin_id"])
    op.create_index("idx_ai_audit_entity", "ai_config_audit_logs", ["entity", "entity_id"])
    op.create_index("idx_ai_audit_created", "ai_config_audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("ai_config_audit_logs")
    op.drop_table("ai_global_limits")
    op.drop_table("ai_feature_routing")
    op.drop_table("ai_provider_settings")
