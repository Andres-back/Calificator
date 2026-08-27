"""Use the verified OpenCode model for untouched photo-grading routes.

Revision ID: 202608260001
Revises: 202608250004
"""
from typing import Sequence, Union

from alembic import op

revision: str = "202608260001"
down_revision: Union[str, None] = "202608250004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        UPDATE ai_provider_models
        SET capabilities = ARRAY['vision', 'text'], recommended = true
        WHERE provider_id = 'open_code'
          AND model_id = 'deepseek-v4-flash-vision-exp'
    """)
    op.execute("""
        UPDATE ai_feature_routing
        SET primary_model = 'deepseek-v4-flash-vision-exp',
            config_version = 2,
            updated_at = NOW()
        WHERE feature = 'calificacion_foto'
          AND primary_provider = 'open_code'
          AND primary_model = 'qwen3.7-plus'
          AND config_version = 1
          AND updated_by IS NULL
    """)
    op.execute("""
        UPDATE ai_feature_routing
        SET primary_model = 'deepseek-v4-flash-vision-exp',
            config_version = 2,
            updated_at = NOW()
        WHERE feature = 'calificacion_texto'
          AND primary_provider = 'open_code'
          AND primary_model = 'deepseek-v4-flash'
          AND config_version = 1
          AND updated_by IS NULL
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE ai_feature_routing
        SET primary_model = 'qwen3.7-plus',
            config_version = 1,
            updated_at = NOW()
        WHERE feature = 'calificacion_foto'
          AND primary_provider = 'open_code'
          AND primary_model = 'deepseek-v4-flash-vision-exp'
          AND config_version = 2
          AND updated_by IS NULL
    """)
    op.execute("""
        UPDATE ai_feature_routing
        SET primary_model = 'deepseek-v4-flash',
            config_version = 1,
            updated_at = NOW()
        WHERE feature = 'calificacion_texto'
          AND primary_provider = 'open_code'
          AND primary_model = 'deepseek-v4-flash-vision-exp'
          AND config_version = 2
          AND updated_by IS NULL
    """)
    op.execute("""
        UPDATE ai_provider_models
        SET capabilities = ARRAY['vision'], recommended = false
        WHERE provider_id = 'open_code'
          AND model_id = 'deepseek-v4-flash-vision-exp'
    """)
