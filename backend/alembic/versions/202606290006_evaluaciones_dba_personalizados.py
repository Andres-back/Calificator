"""Fase C: DBA personalizados en evaluaciones

Revision ID: 202606290006
Revises: 202606290005
Create Date: 2026-07-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202606290006"
down_revision = "202606290005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "evaluaciones",
        sa.Column(
            "dba_personalizado_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("evaluaciones", "dba_personalizado_ids")
