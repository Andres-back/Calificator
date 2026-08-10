"""Publish generated materials as classroom support resources.

Revision ID: 202608090001
Revises: 202608080003
Create Date: 2026-08-09
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "202608090001"
down_revision: Union[str, None] = "202608080003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "materiales_generados",
        sa.Column("asignacion_tipo", sa.String(length=30), nullable=True),
    )
    op.add_column(
        "materiales_generados",
        sa.Column(
            "publicado_estudiantes",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "materiales_generados",
        sa.Column("fecha_publicacion", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "materiales_generados",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_check_constraint(
        "ck_materiales_asignacion_tipo",
        "materiales_generados",
        "asignacion_tipo IS NULL OR asignacion_tipo IN ('apoyo', 'actividad')",
    )
    op.create_index(
        "idx_materiales_materia_publicados",
        "materiales_generados",
        ["materia_id", "publicado_estudiantes"],
    )


def downgrade() -> None:
    op.drop_index("idx_materiales_materia_publicados", table_name="materiales_generados")
    op.drop_constraint(
        "ck_materiales_asignacion_tipo",
        "materiales_generados",
        type_="check",
    )
    op.drop_column("materiales_generados", "updated_at")
    op.drop_column("materiales_generados", "fecha_publicacion")
    op.drop_column("materiales_generados", "publicado_estudiantes")
    op.drop_column("materiales_generados", "asignacion_tipo")