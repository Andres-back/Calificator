"""Unify generated materials with the evaluation lifecycle.

Revision ID: 202608010001
Revises: 202607300001
Create Date: 2026-08-01
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "202608010001"
down_revision: Union[str, None] = "202607300001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "evaluaciones",
        sa.Column(
            "material_origen_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.add_column(
        "evaluaciones",
        sa.Column("tipo_actividad", sa.String(length=60), nullable=True),
    )
    op.add_column(
        "evaluaciones",
        sa.Column(
            "recepcion_habilitada",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_foreign_key(
        "fk_evaluaciones_material_origen",
        "evaluaciones",
        "materiales_generados",
        ["material_origen_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.execute(
        "UPDATE evaluaciones SET recepcion_habilitada = true "
        "WHERE estado IN ('publicada', 'en_calificacion', 'pendiente_revision')"
    )
    op.create_index(
        "uq_evaluaciones_material_origen_nonnull",
        "evaluaciones",
        ["material_origen_id"],
        unique=True,
        postgresql_where=sa.text("material_origen_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_evaluaciones_material_origen_nonnull",
        table_name="evaluaciones",
    )
    op.drop_constraint(
        "fk_evaluaciones_material_origen",
        "evaluaciones",
        type_="foreignkey",
    )
    op.drop_column("evaluaciones", "recepcion_habilitada")
    op.drop_column("evaluaciones", "tipo_actividad")
    op.drop_column("evaluaciones", "material_origen_id")
