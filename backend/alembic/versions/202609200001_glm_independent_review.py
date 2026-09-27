"""Use GLM 5.3 Flash for independent grading review.

Revision ID: 202609200001
Revises: 202609190001
"""

from typing import Sequence, Union

from alembic import op

revision: str = "202609200001"
down_revision: Union[str, None] = "202609190001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO ai_provider_models
            (provider_id, model_id, label, capabilities, recommended, active)
        VALUES
            ('open_code', 'glm-5.3-flash', 'GLM 5.3 Flash',
             ARRAY['text', 'vision'], true, true)
        ON CONFLICT (provider_id, model_id) DO UPDATE
        SET label = EXCLUDED.label,
            capabilities = EXCLUDED.capabilities,
            recommended = true,
            active = true
    """)
    op.execute("""
        UPDATE ai_feature_routing
        SET primary_model = 'glm-5.3-flash',
            capability = 'text',
            config_version = config_version + 1,
            updated_at = NOW()
        WHERE feature IN (
            'calificacion.verificacion',
            'calificacion.revision_adicional'
        )
          AND primary_provider = 'open_code'
          AND primary_model = 'deepseek-v4-flash-vision-exp'
          AND updated_by IS NULL
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE ai_feature_routing
        SET primary_model = 'deepseek-v4-flash-vision-exp',
            capability = 'text',
            config_version = config_version + 1,
            updated_at = NOW()
        WHERE feature IN (
            'calificacion.verificacion',
            'calificacion.revision_adicional'
        )
          AND primary_provider = 'open_code'
          AND primary_model = 'glm-5.3-flash'
          AND updated_by IS NULL
    """)
    op.execute("""
        UPDATE ai_provider_models
        SET recommended = false
        WHERE provider_id = 'open_code'
          AND model_id = 'glm-5.3-flash'
    """)
