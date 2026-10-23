"""Compatible API profiles, private credential revisions and server-side probes.

Revision ID: 202610230001
Revises: 202610220001
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202610230001"
down_revision = "202610220001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "ai_provider_models",
        sa.Column(
            "runtime_profile",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column(
        "ai_provider_models",
        sa.Column("verification_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "ai_provider_settings",
        sa.Column("credential_revision", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_table(
        "ai_api_credentials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("provider_id", sa.String(60), nullable=False, index=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("base_url", sa.Text(), nullable=False),
        sa.Column("secret_encrypted", sa.Text(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "provider_id", "version", name="uq_ai_api_credential_version"
        ),
    )
    op.create_table(
        "ai_api_model_checks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("provider_id", sa.String(60), nullable=False, index=True),
        sa.Column("profile_hash", sa.String(64), nullable=False),
        sa.Column(
            "credential_revision",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ai_api_credentials.id"),
            nullable=False,
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade():
    connection = op.get_bind()
    used = connection.execute(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM ai_api_credentials) OR "
            "EXISTS(SELECT 1 FROM ai_api_model_checks) OR "
            "EXISTS(SELECT 1 FROM ai_provider_models WHERE runtime_profile <> '{}'::jsonb)"
        )
    ).scalar()
    if used:
        raise RuntimeError(
            "No se eliminan perfiles ni revisiones de credenciales utilizados; revierta la configuración, no el esquema."
        )
    op.drop_table("ai_api_model_checks")
    op.drop_table("ai_api_credentials")
    op.drop_column("ai_provider_settings", "credential_revision")
    op.drop_column("ai_provider_models", "verification_id")
    op.drop_column("ai_provider_models", "runtime_profile")
