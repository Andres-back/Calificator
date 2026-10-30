"""Add score-update receipts; never recalculate or remove academic history.

Revision ID: 202610300001
Revises: 202610290001
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '202610300001'
down_revision = '202610290001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('evaluacion_reparto_operaciones',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('request_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('evaluacion_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('evaluaciones.id'), nullable=False),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('request_json', postgresql.JSONB, nullable=False),
        sa.Column('resultado_json', postgresql.JSONB, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('actor_id', 'request_id', name='uq_reparto_actor_request'),
        sa.CheckConstraint('length(request_hash) = 64', name='ck_reparto_request_hash'))
    # Widen the existing domain; no row or previous value is rewritten.
    op.drop_constraint('ck_ajuste_tipo', 'calificacion_ajustes', type_='check')
    op.create_check_constraint('ck_ajuste_tipo', 'calificacion_ajustes', "tipo IN ('componente','global','explicacion','resolucion','reparto')")


def downgrade() -> None:
    raise RuntimeError('Conservar los recibos y ajustes de reparto; requiere una migración de recuperación revisada.')
