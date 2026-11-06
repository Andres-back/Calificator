"""Spec 147: guardar la decisión docente del empate del umbral, sin reescribir notas.

Revision ID: 202611040001
Revises: 202610300001
"""
from alembic import op
import sqlalchemy as sa

revision = '202611040001'
down_revision = '202610300001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Aditiva: las notas existentes quedan sin decisión; ningún valor se recalcula.
    op.add_column('calificaciones', sa.Column('redondeo_empate', sa.String(6), nullable=True))
    op.create_check_constraint(
        'ck_calificaciones_redondeo_empate', 'calificaciones',
        "redondeo_empate IS NULL OR redondeo_empate IN ('abajo','arriba')",
    )


def downgrade() -> None:
    op.drop_constraint('ck_calificaciones_redondeo_empate', 'calificaciones', type_='check')
    op.drop_column('calificaciones', 'redondeo_empate')
