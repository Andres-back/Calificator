"""Use Qwen3 Embedding as the institutional RAG space.

Revision ID: 202609170001
Revises: 202609100001
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "202609170001"
down_revision: Union[str, None] = "202609100001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("DROP INDEX IF EXISTS idx_rag_chunks_embedding_hnsw")
    # Los embeddings son datos derivados. Se conservan fuente, texto y propiedad,
    # pero se invalida el vector histórico incompatible de 1536 dimensiones.
    op.execute("ALTER TABLE rag_chunks DROP COLUMN IF EXISTS embedding_vec")
    op.execute("ALTER TABLE rag_chunks ADD COLUMN embedding_vec vector(1024)")
    op.add_column(
        "rag_chunks", sa.Column("embedding_provider", sa.String(60), nullable=True)
    )
    op.add_column(
        "rag_chunks", sa.Column("embedding_model", sa.String(200), nullable=True)
    )
    op.add_column(
        "rag_chunks", sa.Column("embedding_dimensions", sa.Integer(), nullable=True)
    )
    op.add_column(
        "rag_chunks",
        sa.Column("embedding_space_version", sa.String(300), nullable=True),
    )
    op.create_check_constraint(
        "ck_rag_chunks_embedding_dimensions",
        "rag_chunks",
        "embedding_dimensions IS NULL OR embedding_dimensions = 1024",
    )
    op.execute(
        "CREATE INDEX idx_rag_chunks_embedding_hnsw "
        "ON rag_chunks USING hnsw (embedding_vec vector_cosine_ops)"
    )
    op.execute(
        "CREATE INDEX idx_rag_chunks_embedding_space "
        "ON rag_chunks (embedding_provider, embedding_model, embedding_dimensions)"
    )

    op.execute("""
        INSERT INTO ai_provider_settings
            (id, tipo, label, base_url, model, active, priority, timeout_seconds,
             max_retries, allow_teacher_credentials, allow_institutional_fallback,
             config_version)
        VALUES
            ('ollama_internal', 'embedding', 'Qwen Embedding institucional',
             'http://ollama:11434', 'qwen3-embedding:0.6b', true, 1, 30,
             1, false, false, 1)
        ON CONFLICT (id) DO UPDATE SET
            tipo=EXCLUDED.tipo,
            label=EXCLUDED.label,
            base_url=EXCLUDED.base_url,
            model=EXCLUDED.model,
            active=true,
            timeout_seconds=EXCLUDED.timeout_seconds,
            allow_teacher_credentials=false,
            allow_institutional_fallback=false,
            config_version=ai_provider_settings.config_version + 1,
            updated_at=now()
    """)
    op.execute("""
        INSERT INTO ai_provider_models
            (provider_id, model_id, label, capabilities, recommended, active)
        VALUES
            ('ollama_internal', 'qwen3-embedding:0.6b', 'Qwen3 Embedding 0.6B',
             ARRAY['embedding'], true, true)
        ON CONFLICT (provider_id, model_id) DO UPDATE SET
            label=EXCLUDED.label,
            capabilities=EXCLUDED.capabilities,
            recommended=true,
            active=true,
            updated_at=now()
    """)
    op.execute("""
        UPDATE ai_feature_routing
        SET primary_provider='ollama_internal',
            primary_model='qwen3-embedding:0.6b',
            fallback_provider=NULL,
            fallback_model=NULL,
            capability='embedding',
            rollout_enabled=true,
            config_version=config_version + 1,
            updated_at=now()
        WHERE feature IN ('rag', 'embeddings')
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE ai_feature_routing
        SET primary_provider='openai',
            primary_model='text-embedding-3-small',
            fallback_provider=NULL,
            fallback_model=NULL,
            config_version=config_version + 1,
            updated_at=now()
        WHERE feature IN ('rag', 'embeddings')
    """)
    op.execute(
        "DELETE FROM ai_provider_models "
        "WHERE provider_id='ollama_internal' AND model_id='qwen3-embedding:0.6b'"
    )
    op.execute("DELETE FROM ai_provider_settings WHERE id='ollama_internal'")
    op.execute("DROP INDEX IF EXISTS idx_rag_chunks_embedding_space")
    op.execute("DROP INDEX IF EXISTS idx_rag_chunks_embedding_hnsw")
    op.drop_constraint(
        "ck_rag_chunks_embedding_dimensions", "rag_chunks", type_="check"
    )
    op.drop_column("rag_chunks", "embedding_space_version")
    op.drop_column("rag_chunks", "embedding_dimensions")
    op.drop_column("rag_chunks", "embedding_model")
    op.drop_column("rag_chunks", "embedding_provider")
    op.execute("ALTER TABLE rag_chunks DROP COLUMN IF EXISTS embedding_vec")
    op.execute("ALTER TABLE rag_chunks ADD COLUMN embedding_vec vector(1536)")
    op.execute(
        "CREATE INDEX idx_rag_chunks_embedding_hnsw "
        "ON rag_chunks USING hnsw (embedding_vec vector_cosine_ops)"
    )
