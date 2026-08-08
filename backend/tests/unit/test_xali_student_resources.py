from __future__ import annotations

import asyncio
from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

from app.modules.xali import service


class FakeStoreSession:
    def __init__(self, existing=None) -> None:
        self.existing = existing
        self.added = []
        self.commits = 0

    async def scalar(self, _statement):
        return self.existing

    def add(self, value) -> None:
        self.added.append(value)

    async def commit(self) -> None:
        self.commits += 1

    async def refresh(self, value) -> None:
        now = datetime(2026, 8, 8, 12, 0, 0)
        value.id = getattr(value, "id", None) or uuid4()
        value.created_at = getattr(value, "created_at", None) or now
        value.updated_at = now


def test_store_student_resource_creates_one_record_per_type() -> None:
    session = FakeStoreSession()
    student_id = uuid4()
    evaluation_id = uuid4()

    stored = asyncio.run(
        service._store_student_resource(
            session,
            estudiante_id=student_id,
            evaluacion_id=evaluation_id,
            resource_type="practica",
            title="Práctica personalizada",
            content="Contenido inicial",
        )
    )

    assert session.added == [stored]
    assert stored.estudiante_id == student_id
    assert stored.evaluacion_id == evaluation_id
    assert stored.tipo == "practica"
    assert session.commits == 1


def test_store_student_resource_replaces_the_same_category() -> None:
    existing = SimpleNamespace(
        id=uuid4(),
        evaluacion_id=uuid4(),
        tipo="reto",
        titulo="Reto anterior",
        contenido="Contenido anterior",
        created_at=datetime(2026, 8, 7, 12, 0, 0),
    )
    session = FakeStoreSession(existing)

    stored = asyncio.run(
        service._store_student_resource(
            session,
            estudiante_id=uuid4(),
            evaluacion_id=existing.evaluacion_id,
            resource_type="reto",
            title="Reto para practicar",
            content="Contenido actualizado",
        )
    )

    assert stored is existing
    assert stored.titulo == "Reto para practicar"
    assert stored.contenido == "Contenido actualizado"
    assert session.added == []
    assert session.commits == 1
