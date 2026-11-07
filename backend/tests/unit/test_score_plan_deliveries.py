"""Spec 155: the score editor learns whether direct edits could affect grades."""
from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.modules.evaluaciones import score_service


class FakeDB:
    def __init__(self, result: bool) -> None:
        self.result = result
        self.statements: list[str] = []
        self.commits = 0

    async def scalar(self, statement, params=None):
        self.statements.append(str(statement))
        self.params = params
        return self.result

    async def commit(self) -> None:
        self.commits += 1


@pytest.mark.parametrize("exists", [True, False])
def test_read_score_plan_reports_deliveries_without_writing(monkeypatch, exists):
    evaluation = SimpleNamespace(id=uuid4())
    monkeypatch.setattr(score_service, "_authorize", AsyncMock(return_value=evaluation))
    monkeypatch.setattr(score_service, "_read_plan", lambda _evaluation: {"plan": {}})
    db = FakeDB(exists)

    result = asyncio.run(score_service.read_score_plan(db, evaluation.id, SimpleNamespace()))

    assert result == {"plan": {}, "tiene_entregas": exists}
    assert db.commits == 0
    assert db.params == {"id": str(evaluation.id)}


def test_the_check_covers_deliveries_and_grades_of_that_evaluation(monkeypatch):
    evaluation = SimpleNamespace(id=uuid4())
    monkeypatch.setattr(score_service, "_authorize", AsyncMock(return_value=evaluation))
    monkeypatch.setattr(score_service, "_read_plan", lambda _evaluation: {})
    db = FakeDB(False)

    asyncio.run(score_service.read_score_plan(db, evaluation.id, SimpleNamespace()))

    statement = db.statements[0].lower()
    assert "from entregas" in statement
    assert "from calificaciones" in statement
    assert statement.count("evaluacion_id") == 2
