"""Complete AI model catalog for image and embedding routes.

Revision ID: 202608250002
Revises: 202608250001
"""
from typing import Sequence, Union

from alembic import op

revision: str = "202608250002"
down_revision: Union[str, None] = "202608250001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO ai_provider_models
            (provider_id, model_id, label, capabilities, recommended, active)
        VALUES
            ('openai', 'gpt-4.1-mini', 'GPT-4.1 mini', ARRAY['text'], true, true),
            ('openai', 'text-embedding-3-small', 'Text Embedding 3 Small', ARRAY['embedding'], true, true),
            ('cloudflare_image', '@cf/bytedance/stable-diffusion-xl-lightning', 'Cloudflare SDXL Lightning', ARRAY['image'], true, true)
        ON CONFLICT (provider_id, model_id) DO NOTHING
    """)
    op.execute("""
        UPDATE ai_feature_routing
        SET primary_model = 'text-embedding-3-small'
        WHERE feature IN ('rag', 'embeddings') AND primary_provider = 'openai'
    """)


def downgrade() -> None:
    op.execute("""
        DELETE FROM ai_provider_models
        WHERE (provider_id, model_id) IN (
            ('openai', 'gpt-4.1-mini'),
            ('openai', 'text-embedding-3-small'),
            ('cloudflare_image', '@cf/bytedance/stable-diffusion-xl-lightning')
        )
    """)