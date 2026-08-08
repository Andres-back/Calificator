"""Allow student review requests as grading incidents.

Revision ID: 202608080002
Revises: 202608080001
Create Date: 2026-08-08
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "202608080002"
down_revision: Union[str, None] = "202608080001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_incidencias_tipo", "calificacion_incidencias", type_="check")
    op.create_check_constraint(
        "ck_incidencias_tipo",
        "calificacion_incidencias",
        "tipo IN ('imagen_no_usable','vision_failed','grader_error','discrepancia_alta','confianza_baja','docente_rechazo','solicitud_revision')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_incidencias_tipo", "calificacion_incidencias", type_="check")
    op.create_check_constraint(
        "ck_incidencias_tipo",
        "calificacion_incidencias",
        "tipo IN ('imagen_no_usable','vision_failed','grader_error','discrepancia_alta','confianza_baja','docente_rechazo')",
    )
