"""Support one manual grade per student and evaluation.

Revision ID: 202608110001
Revises: 202608100001
Create Date: 2026-08-11
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "202608110001"
down_revision: Union[str, None] = "202608100001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("evaluaciones", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("evaluaciones", sa.Column("fecha_limite_entrega", sa.DateTime(timezone=True), nullable=True))
    op.create_index("idx_evaluaciones_deleted_at", "evaluaciones", ["deleted_at"])
    op.create_index("idx_evaluaciones_fecha_limite_entrega", "evaluaciones", ["fecha_limite_entrega"])
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS
            uq_calificaciones_manual_evaluacion_estudiante
        ON calificaciones (evaluacion_id, estudiante_id)
        WHERE entrega_id IS NULL
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS uq_calificaciones_manual_evaluacion_estudiante
        """
    )
    op.drop_index("idx_evaluaciones_fecha_limite_entrega", table_name="evaluaciones")
    op.drop_index("idx_evaluaciones_deleted_at", table_name="evaluaciones")
    op.drop_column("evaluaciones", "fecha_limite_entrega")
    op.drop_column("evaluaciones", "deleted_at")
