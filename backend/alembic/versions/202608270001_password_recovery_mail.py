"""Add password recovery, SMTP configuration and session revocation.

Revision ID: 202608270001
Revises: 202608260002
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202608270001"
down_revision: Union[str, None] = "202608260002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("auth_version", sa.Integer(), server_default=sa.text("1"), nullable=False),
    )

    op.create_table(
        "password_reset_requests",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("uuid_generate_v4()"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("request_fingerprint", sa.String(length=64), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
        sa.Column("invalidated_at", sa.DateTime(), nullable=True),
        sa.Column(
            "delivery_status",
            sa.String(length=16),
            server_default="pending",
            nullable=False,
        ),
        sa.Column(
            "delivery_attempts",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("delivery_error_code", sa.String(length=80), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "delivery_status IN ('pending', 'sending', 'sent', 'failed')",
            name="ck_password_reset_delivery_status",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        "ix_password_reset_requests_user_id",
        "password_reset_requests",
        ["user_id"],
    )
    op.create_index(
        "ix_password_reset_requests_expires_at",
        "password_reset_requests",
        ["expires_at"],
    )
    op.create_index(
        "ix_password_reset_requests_created_at",
        "password_reset_requests",
        ["created_at"],
    )

    op.create_table(
        "mail_global_config",
        sa.Column(
            "id",
            sa.SmallInteger(),
            server_default=sa.text("1"),
            nullable=False,
        ),
        sa.Column("host", sa.String(length=255), nullable=False),
        sa.Column("port", sa.Integer(), nullable=False),
        sa.Column("use_starttls", sa.Boolean(), nullable=False),
        sa.Column("username", sa.String(length=320), nullable=False),
        sa.Column("from_email", sa.String(length=320), nullable=False),
        sa.Column("password_encrypted", sa.Text(), nullable=False),
        sa.Column(
            "updated_by",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("last_test_status", sa.String(length=20), nullable=True),
        sa.Column("last_test_latency_ms", sa.Integer(), nullable=True),
        sa.Column("last_test_error_code", sa.String(length=80), nullable=True),
        sa.Column("last_test_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("id = 1", name="ck_mail_global_config_singleton"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("mail_global_config")
    op.drop_index(
        "ix_password_reset_requests_created_at",
        table_name="password_reset_requests",
    )
    op.drop_index(
        "ix_password_reset_requests_expires_at",
        table_name="password_reset_requests",
    )
    op.drop_index(
        "ix_password_reset_requests_user_id",
        table_name="password_reset_requests",
    )
    op.drop_table("password_reset_requests")
    op.drop_column("users", "auth_version")