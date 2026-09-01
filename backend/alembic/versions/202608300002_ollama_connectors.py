"""Add Ollama Cloud credential and local connector persistence.

Revision ID: 202608300002
Revises: 202608300001
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202608300002"
down_revision: Union[str, None] = "202608300001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ai_global_config", sa.Column("ollama_key_encrypted", sa.Text(), nullable=True))
    op.execute(
        "UPDATE ai_provider_settings SET base_url='https://ollama.com/api', "
        "allow_teacher_credentials=true, active=false "
        "WHERE id='ollama' AND (base_url IS NULL OR base_url LIKE 'http://ollama:%' OR base_url LIKE 'http://localhost:%')"
    )
    op.execute("UPDATE ai_provider_models SET active=false WHERE provider_id='ollama'")

    op.create_table(
        "profesor_ai_provider_models",
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_id", sa.String(60), nullable=False),
        sa.Column("model_id", sa.String(240), nullable=False),
        sa.Column("label", sa.String(240), nullable=False),
        sa.Column("capabilities", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("profesor_id", "provider_id", "model_id"),
    )

    op.create_table(
        "ollama_connectors",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("platform", sa.String(30), nullable=False, server_default="windows"),
        sa.Column("version", sa.String(40), nullable=True),
        sa.Column("secret_hash", sa.String(64), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("status", sa.String(30), nullable=False, server_default="disconnected"),
        sa.Column("last_seen_at", sa.DateTime(), nullable=True),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ollama_connectors_owner", "ollama_connectors", ["profesor_id", "active"])

    op.create_table(
        "ollama_pairing_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("connector_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["connector_id"], ["ollama_connectors.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code_hash", name="uq_ollama_pairing_codes_hash"),
    )
    op.create_index("ix_ollama_pairing_codes_owner", "ollama_pairing_codes", ["profesor_id", "expires_at"])

    op.create_table(
        "ollama_connector_models",
        sa.Column("connector_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("model_id", sa.String(240), nullable=False),
        sa.Column("capabilities", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("available", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["connector_id"], ["ollama_connectors.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("connector_id", "model_id"),
    )

    op.create_table(
        "ollama_connector_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("source_job_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connector_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("idempotency_key", sa.String(160), nullable=False),
        sa.Column("feature", sa.String(80), nullable=False),
        sa.Column("model_id", sa.String(240), nullable=False),
        sa.Column("payload_encrypted", sa.Text(), nullable=False),
        sa.Column("result_encrypted", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="waiting_connector"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("lease_token_hash", sa.String(64), nullable=True),
        sa.Column("lease_expires_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("error_code", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["source_job_id"], ["ai_jobs.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["connector_id"], ["ollama_connectors.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key", name="uq_ollama_connector_jobs_idempotency"),
    )
    op.create_index("ix_ollama_connector_jobs_claim", "ollama_connector_jobs", ["profesor_id", "status", "created_at"])
    op.create_index("ix_ollama_connector_jobs_source", "ollama_connector_jobs", ["source_job_id"])


def downgrade() -> None:
    op.drop_index("ix_ollama_connector_jobs_source", table_name="ollama_connector_jobs")
    op.drop_index("ix_ollama_connector_jobs_claim", table_name="ollama_connector_jobs")
    op.drop_table("ollama_connector_jobs")
    op.drop_table("ollama_connector_models")
    op.drop_index("ix_ollama_pairing_codes_owner", table_name="ollama_pairing_codes")
    op.drop_table("ollama_pairing_codes")
    op.drop_index("ix_ollama_connectors_owner", table_name="ollama_connectors")
    op.drop_table("ollama_connectors")
    op.drop_table("profesor_ai_provider_models")
    op.drop_column("ai_global_config", "ollama_key_encrypted")
