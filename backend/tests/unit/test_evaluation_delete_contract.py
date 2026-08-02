from __future__ import annotations

import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.evaluaciones import service


class FakeDB:
    def __init__(self, scalar_results: list[object | None]) -> None:
        self.scalar_results = list(scalar_results)
        self.deleted: list[object] = []
        self.commits = 0

    async def scalar(self, _statement):
        return self.scalar_results.pop(0)

    async def delete(self, value) -> None:
        self.deleted.append(value)

    async def commit(self) -> None:
        self.commits += 1


def test_evaluation_without_evidence_can_be_deleted() -> None:
    evaluation = SimpleNamespace(id=uuid4())
    db = FakeDB([None, None])

    result = asyncio.run(service.delete_evaluation(db, evaluation))

    assert result is None
    assert db.deleted == [evaluation]
    assert db.commits == 1


@pytest.mark.parametrize(
    "delivery_id, grade_id",
    [(uuid4(), None), (None, uuid4()), (uuid4(), uuid4())],
    ids=["delivery", "grade", "delivery-and-grade"],
)
def test_evaluation_with_persisted_evidence_cannot_be_deleted(
    delivery_id,
    grade_id,
) -> None:
    evaluation = SimpleNamespace(id=uuid4())
    db = FakeDB([delivery_id, grade_id])

    with pytest.raises(HTTPException) as exc:
        asyncio.run(service.delete_evaluation(db, evaluation))

    assert exc.value.status_code == 409
    assert "evidencia" in str(exc.value.detail).lower()
    assert db.deleted == []
    assert db.commits == 0
