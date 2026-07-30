"""Add cost column to ai_usage_events for 2C.3.2 cost tracking.

Revision ID: 202607280003
Revises: 202607280002a
Create Date: 2026-07-28 14:00:00
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "202607280003"
down_revision: Union[str, None] = "202607280002a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_usage_events",
        sa.Column(
            "cost",
            sa.Numeric(12, 8),
            nullable=True,
            comment="Estimated cost in USD for this call",
        ),
    )
    op.create_index("idx_usage_cost", "ai_usage_events", ["cost"])


def downgrade() -> None:
    op.drop_index("idx_usage_cost", table_name="ai_usage_events")
    op.drop_column("ai_usage_events", "cost")
