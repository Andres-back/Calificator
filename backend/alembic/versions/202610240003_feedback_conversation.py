"""Add isolated browser continuity without assigning legacy conversations."""
from alembic import op
import sqlalchemy as sa

revision = '202610240003'
down_revision = '202610240002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('feedback_chat_requests', sa.Column('conversation_digest', sa.String(64), nullable=True))
    op.create_index('ix_feedback_chat_conversation', 'feedback_chat_requests', ['access_id', 'publication_id', 'credential_generation', 'conversation_digest', 'accepted_at', 'id'])


def downgrade():
    raise RuntimeError('Conservar el historial. Retirar continuidad requiere respaldo y revisión explícita.')
