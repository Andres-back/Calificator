"""Remove the retired external-editor identifier from presentations.

Revision ID: 202608140001
Revises: 202608130003
Create Date: 2026-08-14
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "202608140001"
down_revision: Union[str, None] = "202608130003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("presentaciones", "presenton_id")


def downgrade() -> None:
    op.add_column("presentaciones", sa.Column("presenton_id", sa.Text(), nullable=True))
