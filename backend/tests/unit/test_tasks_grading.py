from __future__ import annotations

import asyncio
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.modules.calificaciones.models import Entrega
from app.modules.calificaciones.schemas import GradingResult
from app.shared.enums import (
    CalificacionEstado,
    EntregaEstado,
    EvaluacionEstado,
    JobEstado,
)
from app.workers import tasks_grading
from app.services import storage_service


class FakeDB:
    def __init__(self, scalar_value=None) -> None:
        self.scalar_value = scalar_value
        self.added: list[object] = []
        self.events: list[str] = []

    async def scalar(self, _statement):
        return self.scalar_value

    def add(self, value: object) -> None:
        self.added.append(value)

    async def commit(self) -> None:
        self.events.append("commit")

    async def rollback(self) -> None:
        self.events.append("rollback")

    async def refresh(self, value: object) -> None:
        if getattr(value, "id", None) is None:
            value.id = uuid4()


class SessionContext:
    def __init__(self, db: FakeDB) -> None:
        self.db = db

    async def __aenter__(self) -> FakeDB:
        return self.db

    async def __aexit__(self, *_args) -> None:
        return None


def evaluation_fixture():
    return SimpleNamespace(
        id=uuid4(),
        materia_id=uuid4(),
        profesor_id=uuid4(),
        nombre="Evaluacion de prueba",
        nota_maxima=Decimal("5"),
        estado=EvaluacionEstado.PUBLICADA.value,
        blueprint=None,
        metas_profesor=[],
        criterios=[],
        preguntas=[],
        respuestas_esperadas=[],
    )


def delivery_fixture() -> Entrega:
    return Entrega(
        id=uuid4(),
        evaluacion_id=uuid4(),
        estudiante_id=uuid4(),
        materia_id=uuid4(),
        tipo="online",
        respuesta_texto="Mi procedimiento",
        estado=EntregaEstado.RECIBIDA.value,
        visual_text_json={},
    )


def test_resolve_upload_path_stays_inside_upload_root(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(storage_service.settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(storage_service.settings, "PUBLIC_UPLOADS_BASE_URL", "/uploads")

    resolved = tasks_grading.resolve_upload_path("/uploads/entregas/foto.png")

    assert resolved == (tmp_path / "entregas" / "foto.png").resolve()


@pytest.mark.parametrize(
    "url",
    ["/uploads/../secreto.txt", "/otro/foto.png", "/uploads"],
)
def test_resolve_upload_path_rejects_traversal_and_external_urls(
    tmp_path, monkeypatch, url: str,
) -> None:
    monkeypatch.setattr(storage_service.settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(storage_service.settings, "PUBLIC_UPLOADS_BASE_URL", "/uploads")

    with pytest.raises(ValueError):
        tasks_grading.resolve_upload_path(url)


def test_grade_delivery_is_idempotent_when_grade_exists(monkeypatch) -> None:
    existing = SimpleNamespace(id=uuid4(), estado=CalificacionEstado.SUGERIDA.value)
    delivery = delivery_fixture()
    delivery.estado = EntregaEstado.PROCESANDO.value
    db = FakeDB()

    async def fake_existing(_db, _entrega_id):
        return existing

    async def exploding_grade(*_args, **_kwargs):
        raise AssertionError("The LLM must not run for an already graded delivery")

    monkeypatch.setattr(tasks_grading, "_existing_grade", fake_existing)
    monkeypatch.setattr(tasks_grading, "grade_submission", exploding_grade)

    grade, created = asyncio.run(tasks_grading._grade_delivery(
        db,
        evaluacion=evaluation_fixture(),
        entrega=delivery,
        profesor_id=uuid4(),
    ))

    assert grade is existing
    assert created is False
    assert delivery.estado == EntregaEstado.CALIFICADA.value
    assert db.events == ["commit"]


def test_grade_delivery_creates_only_a_teacher_pending_suggestion(monkeypatch) -> None:
    evaluation = evaluation_fixture()
    delivery = delivery_fixture()
    delivery.evaluacion_id = evaluation.id
    delivery.materia_id = evaluation.materia_id
    db = FakeDB()

    async def no_existing(_db, _entrega_id):
        return None

    async def fake_submission(_delivery):
        return {
            "student_response_text": "Mi procedimiento",
            "image_bytes": None,
            "image_mime": "image/jpeg",
        }

    async def fake_grade(*_args, **_kwargs):
        return GradingResult(
            nota_sugerida=Decimal("4.2"),
            nota_maxima=Decimal("5"),
            confianza=0.91,
            feedback_estudiante="Revisa el segundo paso.",
            raw_model_output={"source": "test"},
        )

    monkeypatch.setattr(tasks_grading, "_existing_grade", no_existing)
    monkeypatch.setattr(tasks_grading, "_load_submission", fake_submission)
    monkeypatch.setattr(tasks_grading, "grade_submission", fake_grade)

    grade, created = asyncio.run(tasks_grading._grade_delivery(
        db,
        evaluacion=evaluation,
        entrega=delivery,
        profesor_id=evaluation.profesor_id,
    ))

    assert created is True
    assert grade.estado == CalificacionEstado.REQUIERE_REVISION.value
    assert grade.revisado_por_docente is False
    assert grade.nota_confirmada is None
    assert delivery.estado == EntregaEstado.CALIFICADA.value
    assert evaluation.estado == EvaluacionEstado.EN_CALIFICACION.value


def test_batch_continues_after_one_delivery_fails(monkeypatch) -> None:
    evaluation = evaluation_fixture()
    deliveries = [delivery_fixture(), delivery_fixture()]
    db = FakeDB(scalar_value=evaluation)
    job_id = uuid4()
    finished: list[dict] = []
    retried: list[object] = []

    monkeypatch.setattr(tasks_grading, "AsyncSessionLocal", lambda: SessionContext(db))

    async def running_state(_db, _job_id):
        return JobEstado.RUNNING.value

    async def fake_load(*_args, **_kwargs):
        return deliveries, []

    calls = 0

    async def fake_grade(*_args, **_kwargs):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise RuntimeError("imagen borrosa")
        return SimpleNamespace(id=uuid4()), True

    async def fake_retry(_db, entrega_id, _error):
        retried.append(entrega_id)

    async def fake_progress(*_args, **_kwargs):
        return True

    async def fake_finish(_db, _job_id, **kwargs):
        finished.append(kwargs)
        return True

    monkeypatch.setattr(tasks_grading.jobs_service, "get_job_state", running_state)
    monkeypatch.setattr(tasks_grading.jobs_service, "update_job_progress", fake_progress)
    monkeypatch.setattr(tasks_grading.jobs_service, "finish_job", fake_finish)
    monkeypatch.setattr(tasks_grading, "_load_deliveries", fake_load)
    monkeypatch.setattr(tasks_grading, "_grade_delivery", fake_grade)
    monkeypatch.setattr(tasks_grading, "_mark_delivery_for_retry", fake_retry)

    result = asyncio.run(tasks_grading._grade_batch_async(
        evaluacion_id=evaluation.id,
        estudiante_ids=[],
        entrega_ids=[item.id for item in deliveries],
        job_id=job_id,
        profesor_id=evaluation.profesor_id,
    ))

    assert result["status"] == JobEstado.SUCCESS.value
    assert result["processed"] == 1
    assert result["failed"] == 1
    assert result["requires_teacher_review"] == 1
    assert retried == [deliveries[1].id]
    assert finished[-1]["estado"] == JobEstado.SUCCESS.value


def test_batch_honors_cancellation_before_next_delivery(monkeypatch) -> None:
    evaluation = evaluation_fixture()
    delivery = delivery_fixture()
    db = FakeDB(scalar_value=evaluation)
    states = iter([JobEstado.RUNNING.value, JobEstado.CANCELLED.value])
    cancelled: list[dict] = []

    monkeypatch.setattr(tasks_grading, "AsyncSessionLocal", lambda: SessionContext(db))

    async def next_state(_db, _job_id):
        return next(states)

    async def fake_load(*_args, **_kwargs):
        return [delivery], []

    async def fake_cancel(_db, _job_id, **kwargs):
        cancelled.append(kwargs)
        return True

    async def exploding_grade(*_args, **_kwargs):
        raise AssertionError("Cancelled batches must not grade the next delivery")

    monkeypatch.setattr(tasks_grading.jobs_service, "get_job_state", next_state)
    monkeypatch.setattr(tasks_grading.jobs_service, "finish_cancelled_job", fake_cancel)
    monkeypatch.setattr(tasks_grading, "_load_deliveries", fake_load)
    monkeypatch.setattr(tasks_grading, "_grade_delivery", exploding_grade)

    result = asyncio.run(tasks_grading._grade_batch_async(
        evaluacion_id=evaluation.id,
        estudiante_ids=[],
        entrega_ids=[delivery.id],
        job_id=uuid4(),
        profesor_id=evaluation.profesor_id,
    ))

    assert result["status"] == JobEstado.CANCELLED.value
    assert result["processed"] == 0
    assert cancelled[0]["progreso"] == 0


def test_batch_records_completed_work_when_cancelled_during_grading(monkeypatch) -> None:
    evaluation = evaluation_fixture()
    delivery = delivery_fixture()
    db = FakeDB(scalar_value=evaluation)
    states = iter([
        JobEstado.RUNNING.value,
        JobEstado.RUNNING.value,
        JobEstado.CANCELLED.value,
    ])
    cancelled: list[dict] = []

    monkeypatch.setattr(tasks_grading, "AsyncSessionLocal", lambda: SessionContext(db))

    async def next_state(_db, _job_id):
        return next(states)

    async def fake_load(*_args, **_kwargs):
        return [delivery], []

    async def fake_grade(*_args, **_kwargs):
        return SimpleNamespace(id=uuid4()), True

    async def fake_cancel(_db, _job_id, **kwargs):
        cancelled.append(kwargs)
        return True

    monkeypatch.setattr(tasks_grading.jobs_service, "get_job_state", next_state)
    monkeypatch.setattr(tasks_grading.jobs_service, "finish_cancelled_job", fake_cancel)
    monkeypatch.setattr(tasks_grading, "_load_deliveries", fake_load)
    monkeypatch.setattr(tasks_grading, "_grade_delivery", fake_grade)

    result = asyncio.run(tasks_grading._grade_batch_async(
        evaluacion_id=evaluation.id,
        estudiante_ids=[],
        entrega_ids=[delivery.id],
        job_id=uuid4(),
        profesor_id=evaluation.profesor_id,
    ))

    assert result["status"] == JobEstado.CANCELLED.value
    assert result["processed"] == 1
    assert result["requires_teacher_review"] == 1
    assert cancelled[0]["progreso"] == 100


def test_run_and_dispose_always_releases_async_engine(monkeypatch) -> None:
    events: list[str] = []

    async def failing_batch(**_kwargs):
        raise RuntimeError("boom")

    class FakeEngine:
        async def dispose(self) -> None:
            events.append("disposed")

    monkeypatch.setattr(tasks_grading, "_grade_batch_async", failing_batch)
    monkeypatch.setattr(tasks_grading, "engine", FakeEngine())

    with pytest.raises(RuntimeError, match="boom"):
        asyncio.run(tasks_grading._run_and_dispose())

    assert events == ["disposed"]
