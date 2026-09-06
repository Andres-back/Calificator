from app.modules.admin_ai_config.usage_service import (
    enrich_feature_performance,
    mark_inefficient_models,
)


def test_small_sample_is_informational_not_inefficient() -> None:
    [row] = mark_inefficient_models([
        {"feature": "presentacion", "sample_size": 4, "p95_ms": 180_000},
    ])
    assert row["sample_sufficient"] is False
    assert row["inefficient"] is False


def test_compatible_but_slow_model_is_marked_without_replacing_it() -> None:
    rows = mark_inefficient_models([
        {"feature": "presentacion", "model": "fast", "sample_size": 12, "p95_ms": 40_000},
        {"feature": "presentacion", "model": "chosen", "sample_size": 10, "p95_ms": 75_000},
    ])
    assert rows[0]["inefficient"] is False
    assert rows[1]["inefficient"] is True
    assert rows[1]["model"] == "chosen"


def test_different_features_are_not_compared() -> None:
    rows = mark_inefficient_models([
        {"feature": "presentacion", "sample_size": 8, "p95_ms": 80_000},
        {"feature": "calificacion_foto", "sample_size": 8, "p95_ms": 20_000},
    ])
    assert all(row["inefficient"] is False for row in rows)


def test_route_keeps_explicit_compatible_model_and_hides_small_sample_percentiles() -> None:
    route = {
        "feature": "presentaciones",
        "primary_provider": "open_code",
        "primary_model": "chosen",
        "capability": "text",
    }
    [result] = enrich_feature_performance(
        [route],
        [{
            "provider_id": "open_code", "model_id": "chosen",
            "capabilities": ["text", "vision"], "recommended": False,
        }],
        {("open_code", "chosen"): [{
            "feature": "presentacion", "sample_size": 4,
            "p50_ms": 50_000, "p95_ms": 90_000,
            "sample_sufficient": False, "inefficient": False,
        }]},
    )
    assert result["primary_model"] == "chosen"
    assert result["sample_size"] == 4
    assert result["p50_ms"] is None
    assert result["p95_ms"] is None
    assert result["efficiency_warning"] is None
