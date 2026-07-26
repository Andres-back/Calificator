"""Evaluaciones: tiempo_limite_minutos

Revision ID: 202607221920
Revises: 202607221909
Create Date: 2026-07-22
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202607221920"
down_revision: str | None = "202607221909"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "evaluaciones",
        sa.Column("tiempo_limite_minutos", sa.Integer(), nullable=True),
    )
    op.create_check_constraint(
        "ck_evaluaciones_tiempo_limite",
        "evaluaciones",
        "tiempo_limite_minutos IS NULL OR tiempo_limite_minutos > 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_evaluaciones_tiempo_limite", "evaluaciones")
    op.drop_column("evaluaciones", "tiempo_limite_minutos")
