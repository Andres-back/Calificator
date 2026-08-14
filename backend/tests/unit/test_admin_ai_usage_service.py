import asyncio
from decimal import Decimal
from types import SimpleNamespace

from app.modules.admin_ai_config.usage_service import (
    get_recent_provider_errors,
    get_usage_summary,
)


class FakeResult:
    def __init__(self, rows):
        self.rows = rows

    def fetchone(self):
        return self.rows[0]

    def __iter__(self):
        return iter(self.rows)


class FakeDB:
    def __init__(self):
        self.queries: list[str] = []

    async def execute(self, statement, params=None):
        sql = str(statement)
        self.queries.append(sql)
        if "status IN" in sql:
            return FakeResult(
                [
                    SimpleNamespace(
                        provider="open_code",
                        error="timeout",
                        occurred_at="2026-08-13 10:20:30",
                    ),
                    SimpleNamespace(
                        provider="open_code",
                        error="older",
                        occurred_at="2026-08-12 10:20:30",
                    ),
                ]
            )
        if "GROUP BY provider" in sql:
            return FakeResult(
                [SimpleNamespace(provider="open_code", calls=3, cost=Decimal("0.25"))]
            )
        return FakeResult(
            [
                SimpleNamespace(
                    total_calls=3,
                    tokens_in=120,
                    tokens_out=45,
                    total_cost=Decimal("0.25"),
                )
            ]
        )


def test_usage_summary_reads_canonical_event_ledger() -> None:
    db = FakeDB()

    result = asyncio.run(get_usage_summary(db))

    assert result == {
        "total_calls": 3,
        "total_tokens_input": 120,
        "total_tokens_output": 45,
        "total_cost": 0.25,
        "by_provider": [{"provider": "open_code", "calls": 3, "cost": 0.25}],
    }
    assert all("ai_usage_events" in query for query in db.queries)
    assert all("ai_usage_logs" not in query for query in db.queries)


def test_recent_errors_keeps_latest_error_per_provider() -> None:
    db = FakeDB()

    result = asyncio.run(get_recent_provider_errors(db))

    assert result == {
        "open_code": {"error": "timeout", "at": "2026-08-13 10:20:30"}
    }
    assert "ai_usage_events" in db.queries[0]
