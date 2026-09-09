from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import UploadFile

from app.modules.evaluaciones import router
from app.workers import tasks_digitalization
from app.modules.authorization.catalog import default_permissions_for_role
from app.modules.materias import service as materias_service
from app.shared.enums import EvaluacionModalidad, JobEstado, JobTipo, UserRole


def test_digitalization_retries_transport_errors_but_not_invalid_content() -> None:
    assert tasks_digitalization._is_transient_error(TimeoutError("provider timeout"))
    assert tasks_digitalization._is_transient_error(RuntimeError("HTTP 503"))
    assert not tasks_digitalization._is_transient_error(ValueError("archivo invalido"))


class FakeDB:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    async def commit(self) -> None:
        self.commits += 1

    async def rollback(self) -> None:
        self.rollbacks += 1


@pytest.mark.anyio
async def test_digitalization_reuses_normalized_extraction_on_retry(monkeypatch) -> None:
    calls: list[bytes] = []

    async def extract(content, *_args, **_kwargs):
        calls.append(content)
        return "Pagina 1\nPagina 2", ["Documento de dos paginas"]

    monkeypatch.setattr(tasks_digitalization, "extract_evaluation_text", extract)
    result: dict = {}
    first = await tasks_digitalization._extract_once(
        result=result,
        content=b"multi-page-pdf",
        mime="application/pdf",
        filename="evaluacion.pdf",
        user_id=uuid4(),
        ai_config=None,
    )
    second = await tasks_digitalization._extract_once(
        result=result,
        content=b"",
        mime="",
        filename="evaluacion.pdf",
        user_id=uuid4(),
        ai_config=None,
    )

    assert first == ("Pagina 1\nPagina 2", ["Documento de dos paginas"], False)
    assert second == ("Pagina 1\nPagina 2", ["Documento de dos paginas"], True)
    assert calls == [b"multi-page-pdf"]


@pytest.mark.anyio
async def test_digitalization_is_persisted_and_enqueued(monkeypatch) -> None:
    materia_id = uuid4()
    user = SimpleNamespace(
        id=uuid4(), rol=UserRole.PROFESOR.value,
        _effective_permissions=default_permissions_for_role(UserRole.PROFESOR.value),
    )
    job_id = uuid4()
    created: list[dict] = []
    queued: list[dict] = []

    async def can_manage(*_args, **_kwargs):
        return SimpleNamespace(id=materia_id)

    async def save_private(*_args, **_kwargs):
        return ".private/digitalizaciones/documento.pdf"

    async def create_job(_db, **kwargs):
        created.append(kwargs)
        return job_id

    def enqueue(*, kwargs, queue):
        queued.append(kwargs)
        assert queue == "digitalization"

    monkeypatch.setattr(materias_service, "ensure_can_manage_materia", can_manage)
    monkeypatch.setattr(router, "save_private_upload", save_private)
    monkeypatch.setattr(router.jobs_service, "create_job", create_job)
    monkeypatch.setattr(
        router,
        "digitalize_evaluation",
        SimpleNamespace(apply_async=enqueue),
    )
    db = FakeDB()
    upload = UploadFile(filename="evaluacion.pdf", file=BytesIO(b"%PDF-1.7"))

    response = await router.digitalize_from_file(
        materia_id=materia_id,
        nombre="Evaluación de prueba",
        descripcion=None,
        nota_maxima=5,
        modalidad=EvaluacionModalidad.FISICA,
        file=upload,
        current_user=user,
        db=db,
        _=None,
    )

    assert response["job_id"] == job_id
    assert response["estado"] == JobEstado.QUEUED.value
    assert created[0]["tipo"] == JobTipo.EVALUACION_DIGITALIZACION.value
    assert queued[0]["job_id"] == str(job_id)
    assert queued[0]["file_key"].startswith(".private/digitalizaciones/")
    assert db.commits == 1


@pytest.mark.anyio
async def test_digitalization_publish_failure_keeps_evidence_for_recovery(monkeypatch) -> None:
    materia_id = uuid4()
    user = SimpleNamespace(
        id=uuid4(),
        rol=UserRole.PROFESOR.value,
        _effective_permissions=default_permissions_for_role(UserRole.PROFESOR.value),
    )
    job_id = uuid4()
    retrying: list[tuple] = []

    async def can_manage(*_args, **_kwargs):
        return SimpleNamespace(id=materia_id)

    async def save_private(*_args, **_kwargs):
        return ".private/digitalizaciones/documento.pdf"

    async def create_job(_db, **_kwargs):
        return job_id

    async def mark_retrying(_db, persisted_id, *, error):
        retrying.append((persisted_id, error))
        return True

    def unavailable(**_kwargs):
        raise ConnectionError("broker unavailable")

    monkeypatch.setattr(materias_service, "ensure_can_manage_materia", can_manage)
    monkeypatch.setattr(router, "save_private_upload", save_private)
    monkeypatch.setattr(router.jobs_service, "create_job", create_job)
    monkeypatch.setattr(router.jobs_service, "mark_job_retrying", mark_retrying)
    monkeypatch.setattr(
        router,
        "digitalize_evaluation",
        SimpleNamespace(apply_async=unavailable),
    )
    db = FakeDB()
    upload = UploadFile(filename="evaluacion.pdf", file=BytesIO(b"%PDF-1.7"))

    response = await router.digitalize_from_file(
        materia_id=materia_id,
        nombre="Evaluacion recuperable",
        descripcion=None,
        nota_maxima=5,
        modalidad=EvaluacionModalidad.FISICA,
        file=upload,
        current_user=user,
        db=db,
        _=None,
    )

    assert response["estado"] == JobEstado.RETRYING.value
    assert retrying == [
        (job_id, "Publicación pendiente; se reintentará automáticamente")
    ]
    assert db.commits == 2
    assert db.rollbacks == 0
