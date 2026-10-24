"""Add idempotent batch receipts and encrypted copies without academic backfill."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = '202610240001'
down_revision = '202610230002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('feedback_accesses', sa.Column('credential_encrypted', sa.Text(), nullable=True))
    op.create_table('feedback_delivery_batches',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('actor_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('evaluacion_id', UUID(as_uuid=True), sa.ForeignKey('evaluaciones.id'), nullable=False),
        sa.Column('request_id', UUID(as_uuid=True), nullable=False),
        sa.Column('request_fingerprint', sa.String(64), nullable=False),
        sa.Column('results_json', JSONB(), nullable=False),
        sa.Column('state', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('clock_timestamp()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), server_default=sa.text('clock_timestamp()'), nullable=False),
        sa.UniqueConstraint('actor_id', 'evaluacion_id', 'request_id', name='uq_feedback_delivery_batch_request'),
        sa.CheckConstraint("state IN ('completed','partial','failed')", name='ck_feedback_delivery_batch_state'))


def downgrade():
    op.drop_table('feedback_delivery_batches')
    op.drop_column('feedback_accesses', 'credential_encrypted')
