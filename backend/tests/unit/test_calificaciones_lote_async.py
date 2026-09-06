from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.modules.calificaciones import router
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.authorization.catalog import default_permissions_for_role
from app.shared.enums import (
    EntregaEstado,
    EvaluacionEstado,
    JobEstado,
    JobTipo,
    PoliticaIntento,
    UserRole,
)


class FakeUpload:
    def __init__(self, filename: str, content: bytes | None = None) -> None:
        self.filename = filename
        self.content = content or (b"\x89PNG\r\n\x1a\n" + filename.encode())
        self._consumed = False

    async def read(self, _size: int = -1) -> bytes:
        if self._consumed:
            return b""
        self._consumed = True
        return self.content


class FakeDB:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.commits = 0

    def add(self, value: object) -> None:
        self.added.append(value)

    async def flush(self) -> None:
        for value in self.added:
            if getattr(value, "id", None) is None:
                value.id = uuid4()

    async def commit(self) -> None:
        self.commits += 1

    async def rollback(self) -> None:
        return None


@pytest.mark.parametrize('student_count', [1, 2, 30])
@pytest.mark.parametrize('fail_publish', [False, True])
def test_async_batch_endpoint_persists_then_enqueues_exact_deliveries(monkeypatch, student_count, fail_publish) -> None:
    materia_id = uuid4()
    evaluacion = SimpleNamespace(
        id=uuid4(),
        materia_id=materia_id,
        profesor_id=uuid4(),
        estado=EvaluacionEstado.PUBLICADA.value,
        politica_intento=PoliticaIntento.PRACTICA_LIBRE.value,
        intentos_permitidos=None,
    )
    teacher = SimpleNamespace(
        id=uuid4(), rol=UserRole.PROFESOR.value,
        _effective_permissions=default_permissions_for_role(UserRole.PROFESOR.value),
    )
    student_ids = [uuid4() for _ in range(student_count)]
    db = FakeDB()
    job_id = uuid4()
    queued: list[dict] = []
    created_jobs: list[dict] = []
    job_ids = []
    retries = []

    async def can_manage(_db, _evaluation_id, _user):
        return evaluacion

    async def enrolled(_db, _materia_id, _student_id):
        return True

    async def save(_content, filename, subfolder, **_kwargs):
        return f"/uploads/{subfolder}/{filename}"

    async def create_job(_db, **kwargs):
        created_jobs.append(kwargs)
        new_id = job_id if len(created_jobs) == 1 else uuid4()
        job_ids.append(new_id)
        return new_id

    async def job_input(*_args):
        return {'_ai_config': {'schema_version': 2, 'vision': {}, 'grading': {}}}

    async def aggregate(*_args):
        return {}

    async def retry(_db, child_id, **kwargs):
        retries.append(child_id)

    def enqueue(*, kwargs, queue):
        assert db.commits >= 1
        assert queue == "grading"
        queued.append(kwargs)
        if fail_publish and len(queued) == 1:
            raise RuntimeError('simulated broker error')

    monkeypatch.setattr(
        router.evaluaciones_service,
        "ensure_can_manage_evaluation",
        can_manage,
    )
    monkeypatch.setattr(router, "is_student_enrolled", enrolled)
    monkeypatch.setattr(router, "save_upload", save)
    monkeypatch.setattr(router.jobs_service, "create_job", create_job)
    monkeypatch.setattr(router.jobs_service, 'get_job_input', job_input)
    monkeypatch.setattr(router.jobs_service, 'aggregate_parent_job', aggregate)
    monkeypatch.setattr(router.jobs_service, 'mark_job_retrying', retry)
    monkeypatch.setattr(router, "grade_delivery", SimpleNamespace(apply_async=enqueue))

    result = asyncio.run(router.calificar_lote_asincrono(
        evaluacion_id=evaluacion.id,
        files=[FakeUpload(f"hoja-{i}.png") for i in range(student_count)],
        estudiantes=json.dumps([str(value) for value in student_ids]),
        current_user=teacher,
        db=db,
    ))

    deliveries = [value for value in db.added if isinstance(value, Entrega)]
    delivery_ids = [value.id for value in deliveries]
    assert len(deliveries) == student_count
    assert all(value.estado == EntregaEstado.PROCESANDO.value for value in deliveries)
    assert all(value.tipo == "foto" for value in deliveries)
    assert db.commits == (2 if fail_publish else 1)
    grades = [value for value in db.added if isinstance(value, Calificacion)]
    assert len(grades) == student_count
    assert all(grade.nota_sugerida is None and grade.estado == 'procesando' for grade in grades)
    assert len(set(job_ids)) == student_count + 1
    for i, child in enumerate(created_jobs[1:]):
        assert child['tipo'] == JobTipo.CALIFICACION_ENTREGA.value
        assert child['parent_job_id'] == job_id
        assert child['entrega_id'] == delivery_ids[i]
        assert child['input_json']['estudiante_ids'] == [str(student_ids[i])]
        assert grades[i].estudiante_id == student_ids[i]
        assert grades[i].entrega_id == delivery_ids[i]

    assert created_jobs[0]["tipo"] == JobTipo.CALIFICACION_LOTE.value
    assert created_jobs[0]["input_json"]["entrega_ids"] == [
        str(value) for value in delivery_ids
    ]
    assert queued == [{
        "evaluacion_id": str(evaluacion.id),
        "entrega_id": str(delivery_ids[i]),
        "job_id": str(job_ids[i + 1]),
        "profesor_id": str(teacher.id),
    } for i in range(student_count)]
    assert retries == ([job_ids[1]] if fail_publish else [])
    assert result == {
        "job_id": job_id,
        "estado": JobEstado.QUEUED.value,
        "entrega_ids": delivery_ids,
        "total": student_count,
        "summary_url": f"/api/jobs/{job_id}",
    }


def test_async_batch_rejects_duplicate_evidence_before_saving(monkeypatch) -> None:
    evaluation = SimpleNamespace(
        id=uuid4(), materia_id=uuid4(), profesor_id=uuid4(),
        estado=EvaluacionEstado.PUBLICADA.value,
        politica_intento=PoliticaIntento.PRACTICA_LIBRE.value,
        intentos_permitidos=None,
    )
    teacher = SimpleNamespace(
        id=uuid4(), rol=UserRole.PROFESOR.value,
        _effective_permissions=default_permissions_for_role(UserRole.PROFESOR.value),
    )
    students = [uuid4(), uuid4()]
    saved: list[str] = []

    async def can_manage(*_args):
        return evaluation

    async def enrolled(*_args):
        return True

    async def save(*_args, **_kwargs):
        saved.append("unexpected")
        return "/uploads/entregas/unexpected.png"

    monkeypatch.setattr(router.evaluaciones_service, "ensure_can_manage_evaluation", can_manage)
    monkeypatch.setattr(router, "is_student_enrolled", enrolled)
    monkeypatch.setattr(router, "save_upload", save)

    with pytest.raises(Exception) as exc_info:
        asyncio.run(router.calificar_lote_asincrono(
            evaluacion_id=evaluation.id,
            files=[FakeUpload("a.png", b"\x89PNGsame"), FakeUpload("b.png", b"\x89PNGsame")],
            estudiantes=json.dumps([str(value) for value in students]),
            current_user=teacher,
            db=FakeDB(),
        ))

    assert getattr(exc_info.value, "status_code", None) == 400
    assert "duplicado" in str(getattr(exc_info.value, "detail", "")).lower()
    assert saved == []


def test_async_batch_removes_stored_files_when_persistence_fails(monkeypatch) -> None:
    evaluation = SimpleNamespace(
        id=uuid4(), materia_id=uuid4(), profesor_id=uuid4(),
        estado=EvaluacionEstado.PUBLICADA.value,
        politica_intento=PoliticaIntento.PRACTICA_LIBRE.value,
        intentos_permitidos=None,
    )
    teacher = SimpleNamespace(
        id=uuid4(), rol=UserRole.PROFESOR.value,
        _effective_permissions=default_permissions_for_role(UserRole.PROFESOR.value),
    )
    removed: list[str] = []

    class StoredPath:
        def __init__(self, value: str) -> None:
            self.value = value

        def unlink(self, *, missing_ok: bool) -> None:
            assert missing_ok is True
            removed.append(self.value)

    async def can_manage(*_args):
        return evaluation

    async def enrolled(*_args):
        return True

    async def save(_content, filename, *_args, **_kwargs):
        return f"/uploads/entregas/{filename}"

    async def fail_create(*_args, **_kwargs):
        raise RuntimeError("simulated persistence failure")

    monkeypatch.setattr(router.evaluaciones_service, "ensure_can_manage_evaluation", can_manage)
    monkeypatch.setattr(router, "is_student_enrolled", enrolled)
    monkeypatch.setattr(router, "save_upload", save)
    monkeypatch.setattr(router, "resolve_upload_path", lambda value: StoredPath(value))
    monkeypatch.setattr(router.jobs_service, "create_job", fail_create)

    with pytest.raises(RuntimeError, match="simulated persistence failure"):
        asyncio.run(router.calificar_lote_asincrono(
            evaluacion_id=evaluation.id,
            files=[FakeUpload("a.png"), FakeUpload("b.png")],
            estudiantes=json.dumps([str(uuid4()), str(uuid4())]),
            current_user=teacher,
            db=FakeDB(),
        ))

    assert removed == [
        "/uploads/entregas/a.png",
        "/uploads/entregas/b.png",
    ]
