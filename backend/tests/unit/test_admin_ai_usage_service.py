import asyncio
from types import SimpleNamespace

from app.modules.admin_ai_config.usage_service import get_control_center_usage


class _Result:
    def __init__(self, rows):
        self.rows = rows

    def fetchall(self):
        return self.rows


class _DB:
    def __init__(self, rows):
        self.rows = rows
        self.statement = ""
        self.params = {}

    async def execute(self, statement, params):
        self.statement = str(statement)
        self.params = params
        return _Result(self.rows)


def test_usage_filters_are_parameterized_and_unmeasured_times_remain_null():
    db = _DB([SimpleNamespace(
        feature="grading", stage="grading_primary", provider="open_code",
        model="qwen3.7-plus", sample_size=7, successes=6, failures=1,
        p50_ms=18_000, p95_ms=42_000, last_observed_at=None,
        fallback_calls=1,
    )])

    result = asyncio.run(get_control_center_usage(
        db,
        days=120,
        feature="grading",
        stage="grading_primary",
        provider="open_code",
        model="qwen3.7-plus",
        status="success",
    ))

    assert result["period_days"] == 90
    assert result["sample_size"] == 7
    assert result["rows"][0]["queue_ms"] is None
    assert result["rows"][0]["human_review_ms"] is None
    assert db.params["feature"] == "grading"
    assert db.params["status"] == "success"
    assert "feature = :feature" in db.statement
    assert "status = :status" in db.statement
