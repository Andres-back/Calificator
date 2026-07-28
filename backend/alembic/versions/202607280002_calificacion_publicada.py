"""Permite el estado publicada en calificaciones.

Revision ID: 202607280002
Revises: 202607280001
Create Date: 2026-07-28 12:00:00
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "202607280002"
down_revision: Union[str, None] = "202607280001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE calificaciones "
        "DROP CONSTRAINT IF EXISTS ck_calificaciones_estado"
    )
    op.execute(
        "ALTER TABLE calificaciones "
        "ADD CONSTRAINT ck_calificaciones_estado "
        "CHECK (estado IN ("
        "'sugerida','confirmada','ajustada','requiere_revision','publicada','anulada'"
        "))"
    )


def downgrade() -> None:
    # El esquema anterior no podía representar una nota publicada.
    # La conserva como decisión confirmada antes de restaurar la restricción.
    op.execute(
        "UPDATE calificaciones "
        "SET estado='confirmada' "
        "WHERE estado='publicada'"
    )
    op.execute(
        "ALTER TABLE calificaciones "
        "DROP CONSTRAINT IF EXISTS ck_calificaciones_estado"
    )
    op.execute(
        "ALTER TABLE calificaciones "
        "ADD CONSTRAINT ck_calificaciones_estado "
        "CHECK (estado IN ("
        "'sugerida','confirmada','ajustada','requiere_revision','anulada'"
        "))"
    )
