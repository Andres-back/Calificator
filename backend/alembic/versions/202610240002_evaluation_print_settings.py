"""Optional versioned print settings; no academic backfill."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '202610240002'
down_revision = '202610240001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('evaluaciones', sa.Column('configuracion_impresion', JSONB(), nullable=True))


def downgrade():
    raise RuntimeError('Los formatos guardados se conservan. Retirar la columna requiere respaldo y revisión explícita.')
