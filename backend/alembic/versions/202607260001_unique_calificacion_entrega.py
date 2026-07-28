"""Guarantee one grade per persisted submission.

Revision ID: 202607260001
Revises: 202607221921
"""
from __future__ import annotations

from typing import Sequence

from alembic import op

revision: str = "202607260001"
down_revision: str | None = "202607221921"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_calificaciones_entrega_nonnull
        ON calificaciones (entrega_id)
        WHERE entrega_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_calificaciones_entrega_nonnull")
