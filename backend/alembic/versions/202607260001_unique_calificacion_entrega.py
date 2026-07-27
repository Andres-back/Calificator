"""Guarantee one grade per persisted submission.

Revision ID: 202607260001
Revises: 202607221921
"""
from __future__ import annotations

from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202607260001"
down_revision: str | None = "202607221921"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "uq_calificaciones_entrega_nonnull",
        "calificaciones",
        ["entrega_id"],
        unique=True,
        postgresql_where=sa.text("entrega_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_calificaciones_entrega_nonnull",
        table_name="calificaciones",
    )
