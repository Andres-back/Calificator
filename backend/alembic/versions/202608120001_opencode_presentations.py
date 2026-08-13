"""Use OpenCode Qwen for presentation planning.

Revision ID: 202608120001
Revises: 202608110001
Create Date: 2026-08-12
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "202608120001"
down_revision: Union[str, None] = "202608110001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE ai_feature_routing
        SET primary_provider = 'open_code',
            fallback_provider = 'groq',
            updated_at = NOW()
        WHERE feature IN ('presentaciones', 'presentations')
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE ai_feature_routing
        SET primary_provider = 'groq',
            fallback_provider = 'template',
            updated_at = NOW()
        WHERE feature IN ('presentaciones', 'presentations')
          AND primary_provider = 'open_code'
          AND fallback_provider = 'groq'
        """
    )
