"""Read administrative usage metrics from the canonical AI event ledger."""
from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_usage_summary(db: AsyncSession) -> dict[str, Any]:
    totals = await db.execute(
        text(
            "SELECT COUNT(*) AS total_calls, "
            "COALESCE(SUM(input_tokens), 0) AS tokens_in, "
            "COALESCE(SUM(output_tokens), 0) AS tokens_out, "
            "COALESCE(SUM(cost), 0) AS total_cost "
            "FROM ai_usage_events"
        )
    )
    total_row = totals.fetchone()

    by_provider = await db.execute(
        text(
            "SELECT provider, COUNT(*) AS calls, COALESCE(SUM(cost), 0) AS cost "
            "FROM ai_usage_events "
            "WHERE provider IS NOT NULL "
            "GROUP BY provider ORDER BY calls DESC"
        )
    )

    return {
        "total_calls": int(total_row.total_calls or 0),
        "total_tokens_input": int(total_row.tokens_in or 0),
        "total_tokens_output": int(total_row.tokens_out or 0),
        "total_cost": float(total_row.total_cost or 0),
        "by_provider": [
            {
                "provider": row.provider,
                "calls": int(row.calls or 0),
                "cost": float(row.cost or 0),
            }
            for row in by_provider
        ],
    }


async def get_recent_provider_errors(
    db: AsyncSession,
    *,
    limit: int = 50,
) -> dict[str, dict[str, Any]]:
    rows = await db.execute(
        text(
            "SELECT provider, error_code AS error, "
            "COALESCE(completed_at, created_at) AS occurred_at "
            "FROM ai_usage_events "
            "WHERE status IN ('failed', 'timeout') "
            "AND provider IS NOT NULL "
            "ORDER BY COALESCE(completed_at, created_at) DESC "
            "LIMIT :limit"
        ),
        {"limit": limit},
    )

    latest: dict[str, dict[str, Any]] = {}
    for row in rows:
        if row.provider and row.provider not in latest:
            latest[row.provider] = {
                "error": row.error,
                "at": str(row.occurred_at)[:19] if row.occurred_at else None,
            }
    return latest
