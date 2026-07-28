"""Une las ramas de incidencias y unicidad de calificaciones.

Revision ID: 202607280000
Revises: 202607260001, 202607270001
Create Date: 2026-07-28 08:55:00
"""
from __future__ import annotations

from typing import Sequence, Union


revision: str = "202607280000"
down_revision: Union[str, tuple[str, str], None] = ("202607260001", "202607270001")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
