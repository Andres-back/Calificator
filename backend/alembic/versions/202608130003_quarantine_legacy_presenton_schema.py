"""Quarantine legacy Presenton tables outside the public schema.

Revision ID: 202608130003
Revises: 202608130002
Create Date: 2026-08-13
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "202608130003"
down_revision: Union[str, None] = "202608130002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


LEGACY_SCHEMA = "legacy_presenton"
LEGACY_TABLES = (
    "async_presentation_generation_tasks",
    "chat_history_messages",
    "imageasset",
    "keyvaluesqlmodel",
    "ollamapullstatus",
    "presentation_layout_codes",
    "presentations",
    "slides",
    "template_create_infos",
    "templates",
    "webhook_subscriptions",
)


def _move_if_present(source_schema: str, target_schema: str, table: str) -> None:
    op.execute(
        f"""
        DO $$
        BEGIN
            IF to_regclass('{source_schema}."{table}"') IS NOT NULL
               AND to_regclass('{target_schema}."{table}"') IS NULL THEN
                ALTER TABLE {source_schema}."{table}" SET SCHEMA {target_schema};
            END IF;
        END
        $$
        """
    )


def upgrade() -> None:
    op.execute(f"CREATE SCHEMA IF NOT EXISTS {LEGACY_SCHEMA}")
    op.execute(
        f"COMMENT ON SCHEMA {LEGACY_SCHEMA} IS "
        "'Legacy Presenton PostgreSQL tables; active Presenton uses SQLite'"
    )
    for table in LEGACY_TABLES:
        _move_if_present("public", LEGACY_SCHEMA, table)


def downgrade() -> None:
    for table in reversed(LEGACY_TABLES):
        _move_if_present(LEGACY_SCHEMA, "public", table)
    op.execute(f"DROP SCHEMA IF EXISTS {LEGACY_SCHEMA}")
