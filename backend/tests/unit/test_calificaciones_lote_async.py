from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace
from uuid import uuid4

from app.modules.calificaciones import router
from app.modules.calificaciones.models import Entrega
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
    def __init__(self, filename: str) -> None:
        self.filename = filename
        self._consumed = False

    async def read(self, _size: int = -1) -> bytes:
        if self._consumed:
            return b""
        self._consumed = True
        return b"\x89PNG\r\n\x1a\nimage-data"


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


def test_async_batch_endpoint_persists_then_enqueues_exact_deliveries(monkeypatch) -> None:
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
    student_ids = [uuid4(), uuid4()]
    db = FakeDB()
    job_id = uuid4()
    queued: list[dict] = []
    created_jobs: list[dict] = []

    async def can_manage(_db, _evaluation_id, _user):
        return evaluacion

    async def enrolled(_db, _materia_id, _student_id):
        return True

    async def save(_content, filename, subfolder, **_kwargs):
        return f"/uploads/{subfolder}/{filename}"

    async def create_job(_db, **kwargs):
        created_jobs.append(kwargs)
        return job_id

    def enqueue(*, kwargs):
        queued.append(kwargs)

    monkeypatch.setattr(
        router.evaluaciones_service,
        "ensure_can_manage_evaluation",
        can_manage,
    )
    monkeypatch.setattr(router, "is_student_enrolled", enrolled)
    monkeypatch.setattr(router, "save_upload", save)
    monkeypatch.setattr(router.jobs_service, "create_job", create_job)
    monkeypatch.setattr(router, "grade_batch", SimpleNamespace(apply_async=enqueue))

    result = asyncio.run(router.calificar_lote_asincrono(
        evaluacion_id=evaluacion.id,
        files=[FakeUpload("uno.png"), FakeUpload("dos.png")],
        estudiantes=json.dumps([str(value) for value in student_ids]),
        current_user=teacher,
        db=db,
    ))

    deliveries = [value for value in db.added if isinstance(value, Entrega)]
    delivery_ids = [value.id for value in deliveries]
    assert len(deliveries) == 2
    assert all(value.estado == EntregaEstado.RECIBIDA.value for value in deliveries)
    assert all(value.tipo == "foto" for value in deliveries)
    assert db.commits == 1

    assert created_jobs[0]["tipo"] == JobTipo.CALIFICACION_LOTE.value
    assert created_jobs[0]["input_json"]["entrega_ids"] == [
        str(value) for value in delivery_ids
    ]
    assert queued == [{
        "evaluacion_id": str(evaluacion.id),
        "estudiante_ids": [],
        "entrega_ids": [str(value) for value in delivery_ids],
        "job_id": str(job_id),
        "profesor_id": str(teacher.id),
    }]
    assert result == {
        "job_id": job_id,
        "estado": JobEstado.QUEUED.value,
        "entrega_ids": delivery_ids,
    }
