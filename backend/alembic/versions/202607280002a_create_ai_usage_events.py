"""Create the AI usage event ledger required by later migrations.

Revision ID: 202607280002a
Revises: 202607280002
Create Date: 2026-07-30 20:40:00
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202607280002a"
down_revision: Union[str, None] = "202607280002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_usage_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("calificacion_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("evaluacion_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("feature", sa.String(length=80), nullable=False),
        sa.Column("stage", sa.String(length=80), nullable=True),
        sa.Column("provider", sa.String(length=80), nullable=True),
        sa.Column("model", sa.String(length=160), nullable=True),
        sa.Column("attempt_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("image_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_code", sa.String(length=160), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_id", name="uq_ai_usage_events_request_id"),
    )
    op.create_index(
        "idx_usage_evaluacion",
        "ai_usage_events",
        ["evaluacion_id"],
    )
    op.create_index(
        "idx_usage_created_at",
        "ai_usage_events",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_usage_created_at", table_name="ai_usage_events")
    op.drop_index("idx_usage_evaluacion", table_name="ai_usage_events")
    op.drop_table("ai_usage_events")