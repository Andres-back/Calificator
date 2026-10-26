"""Optional editorial document; keep legacy content and grading snapshots intact."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '202610260001'
down_revision = '202610240003'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('evaluaciones', sa.Column('estructura_documento', postgresql.JSONB(), nullable=True))


def downgrade():
    raise RuntimeError('Conservar los documentos guardados. Retirar esta columna requiere respaldo y revisión explícita.')
