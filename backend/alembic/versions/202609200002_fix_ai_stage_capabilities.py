"""Align persisted granular AI route capabilities with their contracts.

Revision ID: 202609200002
Revises: 202609200001
"""

from typing import Sequence, Union

from alembic import op

revision: str = "202609200002"
down_revision: Union[str, None] = "202609200001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _set_capability(feature: str, capability: str) -> None:
    op.execute(f"""
        UPDATE ai_feature_routing
        SET capability = '{capability}',
            config_version = config_version + 1,
            updated_at = NOW()
        WHERE feature = '{feature}'
          AND capability IS DISTINCT FROM '{capability}'
    """)


def upgrade() -> None:
    _set_capability("calificacion.extraccion", "vision")
    _set_capability("digitalizacion.extraccion", "vision")
    _set_capability("presentaciones.imagenes", "image")


def downgrade() -> None:
    _set_capability("calificacion.extraccion", "text")
    _set_capability("digitalizacion.extraccion", "text")
    _set_capability("presentaciones.imagenes", "text")
