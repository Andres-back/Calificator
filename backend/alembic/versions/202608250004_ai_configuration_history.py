"""Version global AI configuration publications for safe restoration.

Revision ID: 202608250004
Revises: 202608250003
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202608250004"
down_revision: Union[str, None] = "202608250003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_configuration_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("reason", sa.String(40), nullable=False, server_default="publication"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_ai_configuration_versions_created",
        "ai_configuration_versions",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_ai_configuration_versions_created", table_name="ai_configuration_versions")
    op.drop_table("ai_configuration_versions")