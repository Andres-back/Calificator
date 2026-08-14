"""Backfill legacy AI usage into the canonical event ledger.

Revision ID: 202608130002
Revises: 202608130001
Create Date: 2026-08-13
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "202608130002"
down_revision: Union[str, None] = "202608130001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


LEGACY_REQUEST_PREFIX = "legacy-ai-usage:"


def upgrade() -> None:
    op.execute(
        f"""
        INSERT INTO ai_usage_events (
            id,
            request_id,
            feature,
            stage,
            provider,
            model,
            attempt_number,
            status,
            started_at,
            completed_at,
            latency_ms,
            input_tokens,
            output_tokens,
            image_count,
            error_code,
            cost,
            created_at
        )
        SELECT
            uuid_generate_v4(),
            '{LEGACY_REQUEST_PREFIX}' || id::text,
            COALESCE(NULLIF(tipo, ''), 'legacy'),
            'legacy',
            provider,
            model,
            1,
            CASE WHEN success THEN 'success' ELSE 'failed' END,
            created_at,
            created_at,
            latencia_ms,
            tokens_input,
            tokens_output,
            0,
            LEFT(error, 160),
            costo_estimado,
            created_at
        FROM ai_usage_logs
        ON CONFLICT (request_id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(
        f"DELETE FROM ai_usage_events WHERE request_id LIKE '{LEGACY_REQUEST_PREFIX}%'"
    )
