"""Add pipeline_run_id column to ai_usage_events for grading pipeline tracing.

The grading orchestrator (orchestrator.py) already passes
``pipeline_run_id`` in its tracking dict and ``usage_logger`` tries to
insert it, but the column doesn't exist yet — every pipeline call
produces a non-blocking ProgrammingError. This adds the column so the
ledger captures the full pipeline run id (one grading call → 4 events:
vision, grader_a, grader_b, comparator).

Revision ID: 202607300001
Revises: 202607280003
Create Date: 2026-07-30 02:00:00
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "202607300001"
down_revision: Union[str, None] = "202607280003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_usage_events",
        sa.Column(
            "pipeline_run_id",
            sa.String(length=64),
            nullable=True,
            comment="UUID grouping all events from one grading pipeline run",
        ),
    )
    op.create_index(
        "idx_usage_pipeline_run",
        "ai_usage_events",
        ["pipeline_run_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_usage_pipeline_run", table_name="ai_usage_events")
    op.drop_column("ai_usage_events", "pipeline_run_id")
