from __future__ import annotations

import asyncio
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from app.modules.calificaciones import grading_queue_service
from app.modules.calificaciones.models import Calificacion, Entrega
from app.shared.enums import CalificacionEstado, EntregaEstado, JobTipo


class FakeDB:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.events: list[str] = []

    def add(self, value: object) -> None:
        self.added.append(value)
        self.events.append("add")

    async def commit(self) -> None:
        self.events.append("commit")

    async def refresh(self, value: object) -> None:
        if getattr(value, "id", None) is None:
            value.id = uuid4()
        self.events.append("refresh")


def _evaluation() -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        materia_id=uuid4(),
        profesor_id=uuid4(),
        nota_maxima=Decimal("5"),
    )


def _delivery(evaluation: SimpleNamespace, student_id) -> Entrega:
    return Entrega(
        id=uuid4(),
        evaluacion_id=evaluation.id,
        estudiante_id=student_id,
        materia_id=evaluation.materia_id,
        estado=EntregaEstado.RECIBIDA.value,
        visual_text_json={},
    )


def _install_job_fakes(monkeypatch, db: FakeDB):
    parent_id = uuid4()
    child_id = uuid4()
    created: list[dict] = []
    published: list[dict] = []
    retried: list = []

    async def create_job(_db, **kwargs):
        created.append(kwargs)
        db.events.append(f"create:{kwargs['tipo']}")
        return parent_id if len(created) == 1 else child_id

    async def get_job_input(_db, job_id):
        assert job_id == parent_id
        return {"_ai_config": {"schema_version": 3, "vision": {"model": "vision"}}}

    async def aggregate_parent_job(_db, job_id):
        assert job_id == parent_id
        db.events.append("aggregate")
        return {}

    async def mark_job_retrying(_db, job_id, **_kwargs):
        retried.append(job_id)
        db.events.append("retrying")
        return True

    def publish(**kwargs):
        published.append(kwargs)
        db.events.append("publish")

    monkeypatch.setattr(grading_queue_service.jobs_service, "create_job", create_job)
    monkeypatch.setattr(grading_queue_service.jobs_service, "get_job_input", get_job_input)
    monkeypatch.setattr(
        grading_queue_service.jobs_service,
        "aggregate_parent_job",
        aggregate_parent_job,
    )
    monkeypatch.setattr(
        grading_queue_service.jobs_service,
        "mark_job_retrying",
        mark_job_retrying,
    )
    monkeypatch.setattr(grading_queue_service.grade_delivery, "apply_async", publish)
    return parent_id, child_id, created, published, retried


def test_enqueue_persists_parent_child_and_grade_before_publish(monkeypatch) -> None:
    evaluation = _evaluation()
    student_id = uuid4()
    delivery = _delivery(evaluation, student_id)
    db = FakeDB()
    parent_id, child_id, created, published, retried = _install_job_fakes(
        monkeypatch, db
    )

    result = asyncio.run(
        grading_queue_service.enqueue_persisted_grading(
            db,
            evaluacion=evaluation,
            entrega=delivery,
            estudiante_id=student_id,
            profesor_id=evaluation.profesor_id,
            evidence_metadata={"paginas": 2},
        )
    )

    assert [job["tipo"] for job in created] == [
        JobTipo.CALIFICACION_LOTE.value,
        JobTipo.CALIFICACION_ENTREGA.value,
    ]
    assert created[1]["parent_job_id"] == parent_id
    assert created[1]["entrega_id"] == delivery.id
    assert created[1]["input_json"]["_ai_config"]["schema_version"] == 3
    assert result in db.added
    assert result.estado == CalificacionEstado.PROCESANDO.value
    assert result.resultado_json["job_id"] == str(child_id)
    assert result.resultado_json["evidencia_consolidada"] == {"paginas": 2}
    assert db.events.index("commit") < db.events.index("publish")
    assert db.events.index("refresh") < db.events.index("publish")
    assert published == [
        {
            "kwargs": {
                "evaluacion_id": str(evaluation.id),
                "entrega_id": str(delivery.id),
                "job_id": str(child_id),
                "profesor_id": str(evaluation.profesor_id),
            },
            "queue": "grading",
        }
    ]
    assert retried == []


def test_enqueue_reuses_existing_grade_without_adding_duplicate(monkeypatch) -> None:
    evaluation = _evaluation()
    student_id = uuid4()
    delivery = _delivery(evaluation, student_id)
    grade = Calificacion(
        id=uuid4(),
        evaluacion_id=evaluation.id,
        entrega_id=delivery.id,
        estudiante_id=student_id,
        materia_id=evaluation.materia_id,
        profesor_id=evaluation.profesor_id,
    )
    db = FakeDB()
    _install_job_fakes(monkeypatch, db)

    result = asyncio.run(
        grading_queue_service.enqueue_persisted_grading(
            db,
            evaluacion=evaluation,
            entrega=delivery,
            estudiante_id=student_id,
            profesor_id=evaluation.profesor_id,
            calificacion=grade,
        )
    )

    assert result is grade
    assert db.added == []
    assert grade.estado == CalificacionEstado.PROCESANDO.value


def test_publish_failure_marks_same_child_for_recovery(monkeypatch) -> None:
    evaluation = _evaluation()
    student_id = uuid4()
    delivery = _delivery(evaluation, student_id)
    db = FakeDB()
    _, child_id, _, _, retried = _install_job_fakes(monkeypatch, db)

    def unavailable(**_kwargs):
        db.events.append("publish_failed")
        raise ConnectionError("acknowledgement lost")

    monkeypatch.setattr(grading_queue_service.grade_delivery, "apply_async", unavailable)
    result = asyncio.run(
        grading_queue_service.enqueue_persisted_grading(
            db,
            evaluacion=evaluation,
            entrega=delivery,
            estudiante_id=student_id,
            profesor_id=evaluation.profesor_id,
        )
    )

    assert retried == [child_id]
    assert db.events.count("commit") == 2
    assert result.estado == CalificacionEstado.PROCESANDO.value
    assert result.nota_sugerida is None
    assert delivery.estado == EntregaEstado.PROCESANDO.value
