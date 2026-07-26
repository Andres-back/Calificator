"""Evaluaciones: politica_intento y intentos_permitidos

Revision ID: 202607221909
Revises: 202606290008
Create Date: 2026-07-22
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202607221909"
down_revision: str | None = "202606290008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "evaluaciones",
        sa.Column("politica_intento", sa.String(30), nullable=True),
    )
    op.add_column(
        "evaluaciones",
        sa.Column("intentos_permitidos", sa.Integer(), nullable=True),
    )
    op.create_check_constraint(
        "ck_evaluaciones_politica_intento",
        "evaluaciones",
        "politica_intento IN ('un_intento', 'multiples_intentos', 'mejor_puntaje', 'ultimo_intento', 'practica_libre')",
    )
    op.create_check_constraint(
        "ck_evaluaciones_intentos_permitidos",
        "evaluaciones",
        "intentos_permitidos IS NULL OR intentos_permitidos > 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_evaluaciones_politica_intento", "evaluaciones")
    op.drop_constraint("ck_evaluaciones_intentos_permitidos", "evaluaciones")
    op.drop_column("evaluaciones", "intentos_permitidos")
    op.drop_column("evaluaciones", "politica_intento")
