"""Teacher AI configuration and capability-aware model catalog.

Revision ID: 202608250001
Revises: 202608210001
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202608250001"
down_revision: Union[str, None] = "202608240001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ai_provider_settings", sa.Column("allow_teacher_credentials", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("ai_provider_settings", sa.Column("allow_institutional_fallback", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("ai_provider_settings", sa.Column("config_version", sa.Integer(), nullable=False, server_default="1"))

    op.add_column("ai_feature_routing", sa.Column("capability", sa.String(30), nullable=False, server_default="text"))
    op.add_column("ai_feature_routing", sa.Column("primary_model", sa.String(200), nullable=True))
    op.add_column("ai_feature_routing", sa.Column("fallback_model", sa.String(200), nullable=True))
    op.add_column("ai_feature_routing", sa.Column("rollout_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("ai_feature_routing", sa.Column("config_version", sa.Integer(), nullable=False, server_default="1"))

    op.execute("""
        INSERT INTO ai_provider_settings (id, tipo, label, base_url, model, active, priority, timeout_seconds, max_retries, allow_teacher_credentials, allow_institutional_fallback, config_version)
        VALUES ('openai', 'texto', 'OpenAI', 'https://api.openai.com/v1', 'gpt-4.1-mini', true, 1, 60, 2, true, true, 1)
        ON CONFLICT (id) DO NOTHING
    """)

    op.create_table(
        "ai_provider_models",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("provider_id", sa.String(60), nullable=False),
        sa.Column("model_id", sa.String(200), nullable=False),
        sa.Column("label", sa.String(200), nullable=False),
        sa.Column("capabilities", postgresql.ARRAY(sa.String(30)), nullable=False, server_default=sa.text("ARRAY['text']::varchar[]")),
        sa.Column("recommended", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("max_context_tokens", sa.Integer(), nullable=True),
        sa.Column("config_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_id", "model_id", name="uq_ai_provider_model"),
    )
    op.create_index("idx_ai_provider_models_provider", "ai_provider_models", ["provider_id", "active"])
    op.execute("""
        INSERT INTO ai_provider_models (provider_id, model_id, label, capabilities, recommended, active) VALUES
        ('openai', 'gpt-4.1-mini', 'GPT-4.1 mini', ARRAY['text'], true, true),
        ('open_code', 'deepseek-v4-flash', 'DeepSeek V4 Flash', ARRAY['text'], true, true),
        ('open_code', 'qwen3.7-plus', 'Qwen 3.7 Plus', ARRAY['text','vision'], true, true),
        ('open_code', 'qwen3.6-plus', 'Qwen 3.6 Plus', ARRAY['text','vision'], false, true),
        ('open_code', 'mimo-v2.5', 'MiMo 2.5', ARRAY['text','vision'], false, true),
        ('open_code', 'deepseek-v4-flash-vision-exp', 'DeepSeek V4 Vision', ARRAY['vision'], false, true),
        ('groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B', ARRAY['text'], true, true),
        ('ollama', 'llama3.1:8b', 'Llama 3.1 8B local', ARRAY['text'], true, true),
        ('openai_image', 'gpt-image-2', 'GPT Image 2', ARRAY['image'], true, true)
        ON CONFLICT (provider_id, model_id) DO NOTHING
    """)

    op.add_column("profesor_ai_configs", sa.Column("mode", sa.String(20), nullable=False, server_default="institutional"))
    op.add_column("profesor_ai_configs", sa.Column("allow_institutional_fallback", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("profesor_ai_configs", sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("profesor_ai_configs", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))

    op.create_table(
        "profesor_ai_credentials",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_id", sa.String(60), nullable=False),
        sa.Column("secret_encrypted", sa.Text(), nullable=False),
        sa.Column("account_id_encrypted", sa.Text(), nullable=True),
        sa.Column("last_four", sa.String(4), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_test_status", sa.String(20), nullable=True),
        sa.Column("last_test_latency_ms", sa.Integer(), nullable=True),
        sa.Column("last_test_http_code", sa.Integer(), nullable=True),
        sa.Column("last_test_error_code", sa.String(80), nullable=True),
        sa.Column("last_test_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("profesor_id", "provider_id", name="uq_profesor_ai_credential_provider"),
    )
    op.create_index("idx_profesor_ai_credentials_owner", "profesor_ai_credentials", ["profesor_id"])

    op.create_table(
        "profesor_ai_feature_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("feature", sa.String(60), nullable=False),
        sa.Column("provider_id", sa.String(60), nullable=True),
        sa.Column("model_id", sa.String(200), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("config_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("profesor_id", "feature", name="uq_profesor_ai_feature_preference"),
    )
    op.create_index("idx_profesor_ai_preferences_owner", "profesor_ai_feature_preferences", ["profesor_id"])

    op.execute("UPDATE ai_feature_routing SET primary_model = p.model FROM ai_provider_settings p WHERE p.id = ai_feature_routing.primary_provider AND ai_feature_routing.primary_model IS NULL")
    op.execute("UPDATE ai_feature_routing SET capability = CASE WHEN feature IN ('calificacion_foto','evaluacion_digitalizar','vision_ocr') THEN 'vision' WHEN feature = 'generacion_imagenes' THEN 'image' WHEN feature IN ('rag','embeddings') THEN 'embedding' ELSE 'text' END")
    op.execute("UPDATE ai_feature_routing SET primary_model = 'qwen3.7-plus' WHERE feature IN ('calificacion_foto','evaluacion_digitalizar','vision_ocr','presentaciones') AND primary_provider = 'open_code'")
    op.execute("UPDATE ai_provider_settings SET allow_teacher_credentials = true WHERE id IN ('openai','open_code','groq','openai_image')")


def downgrade() -> None:
    op.drop_table("profesor_ai_feature_preferences")
    op.drop_table("profesor_ai_credentials")
    op.drop_column("profesor_ai_configs", "version")
    op.drop_column("profesor_ai_configs", "active")
    op.drop_column("profesor_ai_configs", "allow_institutional_fallback")
    op.drop_column("profesor_ai_configs", "mode")
    op.drop_table("ai_provider_models")
    op.drop_column("ai_feature_routing", "config_version")
    op.drop_column("ai_feature_routing", "rollout_enabled")
    op.drop_column("ai_feature_routing", "fallback_model")
    op.drop_column("ai_feature_routing", "primary_model")
    op.drop_column("ai_feature_routing", "capability")
    op.drop_column("ai_provider_settings", "config_version")
    op.drop_column("ai_provider_settings", "allow_institutional_fallback")
    op.drop_column("ai_provider_settings", "allow_teacher_credentials")
