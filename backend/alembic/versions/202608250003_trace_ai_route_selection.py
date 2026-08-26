"""Trace sanitized AI routing decisions in the usage ledger.

Revision ID: 202608250003
Revises: 202608250002
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "202608250003"
down_revision: Union[str, None] = "202608250002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ai_usage_events", sa.Column("routing_origin", sa.String(30), nullable=True))
    op.add_column("ai_usage_events", sa.Column("config_hash", sa.String(64), nullable=True))
    op.add_column("ai_usage_events", sa.Column("config_version", sa.Integer(), nullable=True))
    op.add_column("ai_usage_events", sa.Column("fallback_used", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.create_index("idx_ai_usage_config_hash", "ai_usage_events", ["config_hash"])


def downgrade() -> None:
    op.drop_index("idx_ai_usage_config_hash", table_name="ai_usage_events")
    op.drop_column("ai_usage_events", "fallback_used")
    op.drop_column("ai_usage_events", "config_version")
    op.drop_column("ai_usage_events", "config_hash")
    op.drop_column("ai_usage_events", "routing_origin")