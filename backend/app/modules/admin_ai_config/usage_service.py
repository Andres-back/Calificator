"""Read administrative usage metrics from the canonical AI event ledger."""
from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

MIN_PERFORMANCE_SAMPLE = 5
INEFFICIENT_RATIO = 1.5
INEFFICIENT_DELTA_MS = 5_000


def mark_inefficient_models(
    rows: list[dict[str, Any]],
    *,
    min_sample: int = MIN_PERFORMANCE_SAMPLE,
) -> list[dict[str, Any]]:
    """Mark only statistically usable rows; never turn a small sample into advice."""
    best_by_feature: dict[str, int] = {}
    for row in rows:
        sample_size = int(row.get("sample_size") or 0)
        p95_ms = row.get("p95_ms")
        row["sample_sufficient"] = sample_size >= min_sample
        row["inefficient"] = False
        if sample_size >= min_sample and p95_ms is not None:
            feature = str(row.get("feature") or "")
            best_by_feature[feature] = min(
                int(p95_ms), best_by_feature.get(feature, int(p95_ms))
            )
    for row in rows:
        if not row["sample_sufficient"] or row.get("p95_ms") is None:
            continue
        best = best_by_feature.get(str(row.get("feature") or ""))
        p95_ms = int(row["p95_ms"])
        row["inefficient"] = bool(
            best is not None
            and p95_ms >= int(best * INEFFICIENT_RATIO)
            and p95_ms - best >= INEFFICIENT_DELTA_MS
        )
    return rows


async def get_model_performance(
    db: AsyncSession,
    *,
    min_sample: int = MIN_PERFORMANCE_SAMPLE,
) -> dict[tuple[str, str], list[dict[str, Any]]]:
    """Return anonymous 30-day latency/success aggregates by function and model."""
    result = await db.execute(
        text(
            "SELECT feature, "
            "CASE WHEN provider='opencode' THEN 'open_code' ELSE provider END AS provider_id, "
            "model, COUNT(*) AS total_calls, "
            "COUNT(*) FILTER (WHERE status='success' AND latency_ms IS NOT NULL) AS sample_size, "
            "ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms) "
            "FILTER (WHERE status='success' AND latency_ms IS NOT NULL))::integer AS p50_ms, "
            "ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) "
            "FILTER (WHERE status='success' AND latency_ms IS NOT NULL))::integer AS p95_ms, "
            "ROUND(100.0 * COUNT(*) FILTER (WHERE status='success') / NULLIF(COUNT(*), 0), 1) AS success_rate "
            "FROM ai_usage_events WHERE provider IS NOT NULL AND model IS NOT NULL "
            "AND created_at >= NOW() - INTERVAL '30 days' "
            "GROUP BY feature, provider_id, model"
        )
    )
    rows = mark_inefficient_models(
        [
            {
                "feature": str(row.feature),
                "provider_id": str(row.provider_id),
                "model": str(row.model),
                "sample_size": int(row.sample_size or 0),
                "p50_ms": int(row.p50_ms) if row.p50_ms is not None else None,
                "p95_ms": int(row.p95_ms) if row.p95_ms is not None else None,
                "success_rate": float(row.success_rate) if row.success_rate is not None else None,
            }
            for row in result
        ],
        min_sample=min_sample,
    )
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in rows:
        key = (row.pop("provider_id"), row.pop("model"))
        grouped.setdefault(key, []).append(row)
    return grouped


def enrich_feature_performance(
    features: list[dict[str, Any]],
    models: list[dict[str, Any]],
    performance: dict[tuple[str, str], list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    """Attach safe guidance while preserving every explicit routing choice."""
    aliases = {
        "presentaciones": {"presentaciones", "presentacion"},
        "calificacion_foto": {"calificacion_foto", "grading"},
    }
    catalog = {
        (str(model.get("provider_id")), str(model.get("model_id"))): model
        for model in models
    }
    enriched: list[dict[str, Any]] = []
    for feature in features:
        key = (
            str(feature.get("primary_provider") or ""),
            str(feature.get("primary_model") or ""),
        )
        model = catalog.get(key)
        names = aliases.get(
            str(feature.get("feature") or ""),
            {str(feature.get("feature") or "")},
        )
        metric = next(
            (item for item in performance.get(key, []) if item.get("feature") in names),
            None,
        )
        sufficient = bool(metric and metric.get("sample_sufficient"))
        warning = None
        if metric and metric.get("inefficient"):
            warning = "Rendimiento inferior al mejor modelo observado para esta función."
        enriched.append({
            **feature,
            "recommended_for_feature": bool(model and model.get("recommended")),
            "sample_size": int(metric.get("sample_size") or 0) if metric else 0,
            "p50_ms": int(metric["p50_ms"]) if sufficient and metric.get("p50_ms") is not None else None,
            "p95_ms": int(metric["p95_ms"]) if sufficient and metric.get("p95_ms") is not None else None,
            "efficiency_warning": warning,
        })
    return enriched


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
