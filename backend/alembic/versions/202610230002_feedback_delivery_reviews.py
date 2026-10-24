"""Explicit delivery reviews, no academic backfill or changes."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '202610230002'
down_revision = '202610230001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('feedback_delivery_reviews',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('calificacion_id', UUID(as_uuid=True), sa.ForeignKey('calificaciones.id'), nullable=False),
        sa.Column('authorized_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('authorized_at', sa.DateTime(timezone=True), server_default=sa.text('clock_timestamp()'), nullable=False),
        sa.Column('source_fingerprint', sa.String(64), nullable=False),
        sa.Column('scope', sa.String(20), nullable=False),
        sa.Column('feedback_text', sa.Text(), nullable=False),
        sa.Column('request_id', UUID(as_uuid=True), nullable=False),
        sa.Column('request_fingerprint', sa.String(64), nullable=False),
        sa.UniqueConstraint('authorized_by', 'calificacion_id', 'request_id', name='uq_feedback_delivery_review_request'),
        sa.CheckConstraint("scope IN ('summary','detail')", name='ck_feedback_delivery_review_scope'),
        sa.CheckConstraint('length(feedback_text) BETWEEN 1 AND 6000', name='ck_feedback_delivery_review_text'))
    op.create_index('ix_feedback_delivery_review_grade', 'feedback_delivery_reviews', ['calificacion_id', 'authorized_at'])


def downgrade():
    op.drop_index('ix_feedback_delivery_review_grade', table_name='feedback_delivery_reviews')
    op.drop_table('feedback_delivery_reviews')
