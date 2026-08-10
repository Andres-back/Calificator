"""Prefer OpenCode Go for grading and vision routing.

Revision ID: 202608100001
Revises: 202608090001
Create Date: 2026-08-10
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "202608100001"
down_revision: Union[str, None] = "202608090001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_FEATURES = ("calificacion_texto", "calificacion_foto", "vision_ocr")


def upgrade() -> None:
    features = ", ".join(f"'{feature}'" for feature in _FEATURES)
    op.execute(
        f"""
        UPDATE ai_feature_routing
        SET primary_provider = 'open_code',
            fallback_provider = NULL,
            updated_at = NOW()
        WHERE feature IN ({features})
        """
    )


def downgrade() -> None:
    features = ", ".join(f"'{feature}'" for feature in _FEATURES)
    op.execute(
        f"""
        UPDATE ai_feature_routing
        SET primary_provider = 'groq',
            fallback_provider = 'template',
            updated_at = NOW()
        WHERE feature IN ({features})
          AND primary_provider = 'open_code'
          AND fallback_provider IS NULL
        """
    )