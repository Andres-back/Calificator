from __future__ import annotations

import asyncio
from types import SimpleNamespace
from uuid import uuid4

from app.modules.evaluaciones import service


class FakeDB:
    def __init__(self) -> None:
        self.commits = 0

    async def commit(self) -> None:
        self.commits += 1


def test_evaluation_can_be_removed_from_views_without_destroying_history() -> None:
    evaluation = SimpleNamespace(id=uuid4(), recepcion_habilitada=True, deleted_at=None)
    db = FakeDB()

    result = asyncio.run(service.delete_evaluation(db, evaluation))

    assert result is None
    assert evaluation.recepcion_habilitada is False
    assert evaluation.deleted_at is not None
    assert db.commits == 1


def test_soft_delete_can_be_retried_safely() -> None:
    evaluation = SimpleNamespace(id=uuid4(), recepcion_habilitada=False, deleted_at=None)
    db = FakeDB()

    asyncio.run(service.delete_evaluation(db, evaluation))
    first_deleted_at = evaluation.deleted_at
    asyncio.run(service.delete_evaluation(db, evaluation))

    assert evaluation.deleted_at >= first_deleted_at
    assert db.commits == 2
