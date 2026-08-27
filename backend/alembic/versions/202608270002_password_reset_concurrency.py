"""Harden password reset concurrency indexes.

Revision ID: 202608270002
Revises: 202608270001
"""

from typing import Sequence, Union

from alembic import op

revision: str = "202608270002"
down_revision: Union[str, None] = "202608270001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_password_reset_requests_user_created",
        "password_reset_requests",
        ["user_id", "created_at"],
    )
    op.create_index(
        "uq_password_reset_requests_active_user",
        "password_reset_requests",
        ["user_id"],
        unique=True,
        postgresql_where=(
            "consumed_at IS NULL AND invalidated_at IS NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_password_reset_requests_active_user",
        table_name="password_reset_requests",
    )
    op.drop_index(
        "ix_password_reset_requests_user_created",
        table_name="password_reset_requests",
    )