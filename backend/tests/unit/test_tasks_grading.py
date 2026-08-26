from __future__ import annotations

import asyncio
from decimal import Decimal
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
    tmp_path,
    monkeypatch,
    url: str,
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

    grade, created = asyncio.run(
        tasks_grading._grade_delivery(
            db,
            evaluacion=evaluation_fixture(),
            entrega=delivery,
            profesor_id=uuid4(),
        )
    )

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

    grade, created = asyncio.run(
        tasks_grading._grade_delivery(
            db,
            evaluacion=evaluation,
            entrega=delivery,
            profesor_id=evaluation.profesor_id,
        )
    )

    assert created is True
    assert grade.estado == CalificacionEstado.REQUIERE_REVISION.value
    assert grade.revisado_por_docente is False
    assert grade.nota_confirmada is None
    assert delivery.estado == EntregaEstado.CALIFICADA.value
    assert evaluation.estado == EvaluacionEstado.EN_CALIFICACION.value


def test_grade_delivery_processes_existing_queued_placeholder(monkeypatch) -> None:
    evaluation = evaluation_fixture()
    delivery = delivery_fixture()
    delivery.evaluacion_id = evaluation.id
    delivery.materia_id = evaluation.materia_id
    delivery.visual_text_json = {"pipeline_status": "queued", "job_id": "job-1"}
    existing = SimpleNamespace(
        id=uuid4(),
        nota_sugerida=None,
        revisado_por_docente=False,
        resultado_json={"pipeline_status": "queued", "job_id": "job-1"},
    )
    db = FakeDB()

    async def fake_existing(_db, _entrega_id):
        return existing

    async def fake_submission(_delivery):
        return {
            "student_response_text": "Mi procedimiento",
            "image_bytes": None,
            "image_mime": "image/jpeg",
        }

    async def fake_grade(*_args, **_kwargs):
        return GradingResult(
            nota_sugerida=Decimal("4.5"),
            nota_maxima=Decimal("5"),
            confianza=0.93,
            feedback_estudiante="Buen trabajo.",
            raw_model_output={"source": "queue-test"},
        )

    monkeypatch.setattr(tasks_grading, "_existing_grade", fake_existing)
    monkeypatch.setattr(tasks_grading, "_load_submission", fake_submission)
    monkeypatch.setattr(tasks_grading, "grade_submission", fake_grade)

    grade, processed = asyncio.run(
        tasks_grading._grade_delivery(
            db,
            evaluacion=evaluation,
            entrega=delivery,
            profesor_id=evaluation.profesor_id,
        )
    )

    assert processed is True
    assert grade is existing
    assert existing.nota_sugerida == Decimal("4.5")
    assert existing.resultado_json["source"] == "queue-test"
    assert delivery.estado == EntregaEstado.CALIFICADA.value


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
    monkeypatch.setattr(
        tasks_grading.jobs_service, "update_job_progress", fake_progress
    )
    monkeypatch.setattr(tasks_grading.jobs_service, "finish_job", fake_finish)
    monkeypatch.setattr(tasks_grading, "_load_deliveries", fake_load)
    monkeypatch.setattr(tasks_grading, "_grade_delivery", fake_grade)
    monkeypatch.setattr(tasks_grading, "_mark_delivery_for_retry", fake_retry)

    result = asyncio.run(
        tasks_grading._grade_batch_async(
            evaluacion_id=evaluation.id,
            estudiante_ids=[],
            entrega_ids=[item.id for item in deliveries],
            job_id=job_id,
            profesor_id=evaluation.profesor_id,
        )
    )

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

    result = asyncio.run(
        tasks_grading._grade_batch_async(
            evaluacion_id=evaluation.id,
            estudiante_ids=[],
            entrega_ids=[delivery.id],
            job_id=uuid4(),
            profesor_id=evaluation.profesor_id,
        )
    )

    assert result["status"] == JobEstado.CANCELLED.value
    assert result["processed"] == 0
    assert cancelled[0]["progreso"] == 0


def test_batch_records_completed_work_when_cancelled_during_grading(
    monkeypatch,
) -> None:
    evaluation = evaluation_fixture()
    delivery = delivery_fixture()
    db = FakeDB(scalar_value=evaluation)
    states = iter(
        [
            JobEstado.RUNNING.value,
            JobEstado.RUNNING.value,
            JobEstado.CANCELLED.value,
        ]
    )
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

    result = asyncio.run(
        tasks_grading._grade_batch_async(
            evaluacion_id=evaluation.id,
            estudiante_ids=[],
            entrega_ids=[delivery.id],
            job_id=uuid4(),
            profesor_id=evaluation.profesor_id,
        )
    )

    assert result["status"] == JobEstado.CANCELLED.value
    assert result["processed"] == 1
    assert result["requires_teacher_review"] == 1
    assert cancelled[0]["progreso"] == 100


def test_run_and_dispose_always_releases_async_engine(monkeypatch) -> None:
    events: list[str] = []

    async def failing_batch(**_kwargs):
        raise RuntimeError("boom")

    class FakeEngine:
        async def dispose(self, close: bool = True) -> None:
            events.append("disposed-close" if close else "disposed-detach")

    monkeypatch.setattr(tasks_grading, "_grade_batch_async", failing_batch)
    monkeypatch.setattr(tasks_grading, "engine", FakeEngine())

    with pytest.raises(RuntimeError, match="boom"):
        asyncio.run(tasks_grading._run_and_dispose())

    assert events == ["disposed-detach", "disposed-close"]


def test_batch_persists_failure_when_job_preparation_raises(monkeypatch) -> None:
    db = FakeDB()
    job_id = uuid4()
    delivery_id = uuid4()
    finished: list[dict] = []
    retried: list[object] = []

    monkeypatch.setattr(tasks_grading, "AsyncSessionLocal", lambda: SessionContext(db))

    async def queue_time(_db, _job_id):
        return 25

    async def broken_input(_db, _job_id):
        raise RuntimeError("uuid query failed")

    async def fake_retry(_db, item_id, _error):
        retried.append(item_id)

    async def fake_finish(_db, _job_id, **kwargs):
        finished.append(kwargs)
        return True

    monkeypatch.setattr(tasks_grading.jobs_service, "get_job_queue_time_ms", queue_time)
    monkeypatch.setattr(tasks_grading.jobs_service, "get_job_input", broken_input)
    monkeypatch.setattr(tasks_grading.jobs_service, "finish_job", fake_finish)
    monkeypatch.setattr(tasks_grading, "_mark_delivery_for_retry", fake_retry)

    with pytest.raises(RuntimeError, match="uuid query failed"):
        asyncio.run(
            tasks_grading._grade_batch_async(
                evaluacion_id=uuid4(),
                estudiante_ids=[],
                entrega_ids=[delivery_id],
                job_id=job_id,
                profesor_id=uuid4(),
            )
        )

    assert retried == [delivery_id]
    assert finished[0]["estado"] == JobEstado.FAILED.value
    assert finished[0]["resultado_json"]["terminal_reason"] == "processing_failed"


def test_duplicate_celery_claim_does_not_run_grading_pipeline(monkeypatch) -> None:
    db = FakeDB()
    job_id = uuid4()

    monkeypatch.setattr(tasks_grading, "AsyncSessionLocal", lambda: SessionContext(db))

    async def queue_time(_db, _job_id):
        return 10

    async def job_input(_db, _job_id):
        return {}

    async def running_state(_db, _job_id):
        return JobEstado.RUNNING.value

    async def other_claim(_db, _job_id):
        return "original-celery-task"

    async def exploding_load(*_args, **_kwargs):
        raise AssertionError("A duplicate task must not load or grade deliveries")

    monkeypatch.setattr(tasks_grading.jobs_service, "get_job_queue_time_ms", queue_time)
    monkeypatch.setattr(tasks_grading.jobs_service, "get_job_input", job_input)
    monkeypatch.setattr(tasks_grading.jobs_service, "get_job_state", running_state)
    monkeypatch.setattr(tasks_grading.jobs_service, "get_job_claim_token", other_claim)
    monkeypatch.setattr(tasks_grading, "_load_deliveries", exploding_load)

    result = asyncio.run(
        tasks_grading._grade_batch_async(
            evaluacion_id=uuid4(),
            estudiante_ids=[],
            entrega_ids=[uuid4()],
            job_id=job_id,
            profesor_id=uuid4(),
            claim_token="duplicate-celery-task",
        )
    )

    assert result["status"] == JobEstado.RUNNING.value
    assert result["processed"] == 0


def test_recovery_republishes_each_leased_job_only_once(monkeypatch) -> None:
    job_id = uuid4()
    teacher_id = uuid4()
    evaluation_id = uuid4()
    delivery_id = uuid4()
    batches = iter(
        [
            ([{
                "id": job_id,
                "user_id": teacher_id,
                "input_json": {
                    "evaluacion_id": str(evaluation_id),
                    "entrega_ids": [str(delivery_id)],
                    "estudiante_ids": [],
                },
            }], 0),
            ([], 0),
        ]
    )
    enqueued: list[dict] = []

    async def leased_jobs():
        return next(batches)

    def enqueue(*, kwargs):
        enqueued.append(kwargs)

    monkeypatch.setattr(tasks_grading, "_claim_stale_grading_jobs", leased_jobs)
    monkeypatch.setattr(tasks_grading.grade_batch, "apply_async", enqueue)

    first = tasks_grading.recover_stale_grading_jobs.run()
    second = tasks_grading.recover_stale_grading_jobs.run()

    assert first == {"selected": 1, "recovered": 1, "invalid": 0}
    assert second == {"selected": 0, "recovered": 0, "invalid": 0}
    assert len(enqueued) == 1
    assert enqueued[0]["job_id"] == str(job_id)
