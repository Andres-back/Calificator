"""Nullable private evidence preparation; legacy submissions stay untouched."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202610270001"
down_revision = "202610260001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("entregas", sa.Column("evidencia_manifiesto", postgresql.JSONB(), nullable=True))
    op.execute("CREATE UNIQUE INDEX uq_entregas_scan_request ON entregas ((evidencia_manifiesto ->> 'request_id')) WHERE evidencia_manifiesto IS NOT NULL")


def downgrade():
    raise RuntimeError("Conservar originales y preparaciones. Retirar este manifiesto exige respaldo y revisión explícita.")
