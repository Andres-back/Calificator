"""Spec 174: recalificar varias entregas sin tocar las que el docente ya decidió."""

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.modules.calificaciones import revision_router, revision_service
from app.modules.calificaciones.schemas import BatchRegradeRequest


class FakeDb:
    def __init__(self):
        self.rollbacks = 0
        self.refreshed = []

    async def rollback(self):
        self.rollbacks += 1

    async def refresh(self, instance):
        self.refreshed.append(instance)


def grade(**overrides):
    values = {
        "id": uuid4(),
        "estado": "requiere_revision",
        "revisado_por_docente": False,
        "nota_confirmada": None,
        "updated_at": datetime(2026, 11, 12, tzinfo=timezone.utc),
    }
    values.update(overrides)
    return SimpleNamespace(**values)


@pytest.fixture
def batch(monkeypatch):
    grades: dict = {}
    calls: list = []
    actor = SimpleNamespace(id=uuid4(), rol="profesor")
    evaluation = SimpleNamespace(id=uuid4(), materia_id=uuid4())

    async def owned(db, grade_id, user, *, lock=False):
        if grade_id not in grades:
            raise HTTPException(404, "Calificación no encontrada")
        item = grades[grade_id]
        return (item, evaluation) if lock else (item, evaluation)

    async def reprocess(db, **kwargs):
        calls.append(kwargs)
        failure = getattr(kwargs["grade"], "fails_with", None)
        if failure:
            raise failure
        return kwargs["grade"]

    async def nothing(*args, **kwargs):
        return None

    monkeypatch.setattr(revision_router, "owned_grade", owned)
    monkeypatch.setattr(revision_router, "lock_scan_request", nothing)
    monkeypatch.setattr(revision_router, "require_permission_now", lambda user, permission: None)
    monkeypatch.setattr(revision_router.service, "ensure_evaluation_active", lambda evaluation: None)
    monkeypatch.setattr(revision_router.revision_service, "reprocess_grade", reprocess)
    monkeypatch.setattr("app.modules.materias.service.ensure_active_materia", nothing)

    async def run(*items):
        for item in items:
            grades[item.id] = item
        db = FakeDb()
        result = await revision_router.recalificar_lote(
            BatchRegradeRequest(calificacion_ids=[item.id for item in items]), current_user=actor, db=db,
        )
        return result, calls, db, actor

    return run


@pytest.mark.asyncio
async def test_regrades_each_undecided_grade_with_its_own_request(batch):
    first, second = grade(), grade(estado="sugerida")

    result, calls, db, actor = await batch(first, second)

    assert (result.total, result.exitosos, result.fallidos) == (2, 2, 0)
    assert [call["grade"] for call in calls] == [first, second]
    assert all(call["confirmed"] is False and call["actor_id"] == actor.id for call in calls)
    assert all(call["expected_version"] == call["grade"].updated_at for call in calls)
    assert calls[0]["request_id"] != calls[1]["request_id"]
    assert db.rollbacks == 0


@pytest.mark.parametrize("decided", [
    {"estado": "publicada", "nota_confirmada": 4},
    {"estado": "confirmada", "nota_confirmada": 3},
    {"estado": "ajustada", "nota_confirmada": 3},
    {"revisado_por_docente": True},
    {"nota_confirmada": 2},
])
@pytest.mark.asyncio
async def test_never_reopens_a_grade_the_teacher_already_decided(batch, decided):
    untouched, pending = grade(**decided), grade()

    result, calls, db, _ = await batch(untouched, pending)

    assert [call["grade"] for call in calls] == [pending]
    assert (result.exitosos, result.fallidos) == (1, 1)
    rejected = next(item for item in result.results if not item.success)
    assert rejected.calificacion_id == untouched.id
    assert "Ya revisaste esta nota" in rejected.error
    assert db.rollbacks == 1


@pytest.mark.asyncio
async def test_one_rejection_does_not_stop_the_rest(batch):
    blocked = grade()
    blocked.fails_with = HTTPException(409, "Esta entrega ya está en cola o calificándose. Espera a que termine.")
    broken = grade()
    broken.fails_with = RuntimeError("detalle interno")
    fine = grade()

    result, calls, db, _ = await batch(blocked, broken, fine)

    assert len(calls) == 3
    assert (result.exitosos, result.fallidos) == (1, 2)
    errors = {item.calificacion_id: item.error for item in result.results if not item.success}
    assert errors[blocked.id] == "Esta entrega ya está en cola o calificándose. Espera a que termine."
    assert errors[broken.id] == "No se pudo volver a calificar esta entrega."
    assert "detalle interno" not in str(errors)
    assert db.rollbacks == 2


@pytest.mark.asyncio
async def test_reloads_the_teacher_after_each_rollback(batch):
    # Un rollback caduca al usuario cargado; sin recargarlo, la siguiente entrega falla.
    decided, pending = grade(estado="publicada", nota_confirmada=4), grade()

    result, calls, db, actor = await batch(decided, pending)

    assert db.refreshed == [actor]
    assert [call["grade"] for call in calls] == [pending]
    assert result.exitosos == 1


@pytest.mark.asyncio
async def test_repeated_ids_are_regraded_once(batch):
    item = grade()
    result, calls, _, _ = await batch(item, item)

    assert len(calls) == 1
    assert result.total == 1


def test_batch_size_is_bounded():
    with pytest.raises(ValidationError):
        BatchRegradeRequest(calificacion_ids=[])
    with pytest.raises(ValidationError):
        BatchRegradeRequest(calificacion_ids=[uuid4() for _ in range(61)])


def test_teacher_decided_matches_the_single_regrade_rule():
    assert revision_service.teacher_decided(grade()) is False
    assert revision_service.teacher_decided(grade(estado="sugerida")) is False
    with pytest.raises(HTTPException) as error:
        revision_service.ensure_reprocessing_allowed(grade(estado="publicada"), datetime(2026, 11, 12, tzinfo=timezone.utc), False)
    assert error.value.status_code == 409


def test_batch_route_is_declared_before_the_grade_route():
    paths = [route.path for route in revision_router.router.routes]
    assert paths.index("/calificaciones/lote/recalificar") < paths.index("/calificaciones/{calificacion_id}/recalificar")
