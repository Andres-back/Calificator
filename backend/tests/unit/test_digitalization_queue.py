from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import UploadFile
from fastapi import HTTPException

from app.modules.evaluaciones import router
from app.core.config import settings
from app.modules.evaluaciones.document_visual_extractor import DocumentRendererUnavailable
from app.workers import tasks_digitalization
from app.modules.authorization.catalog import default_permissions_for_role
from app.modules.materias import service as materias_service
from app.shared.enums import EvaluacionModalidad, JobEstado, JobTipo, UserRole


def test_digitalization_retries_transport_errors_but_not_invalid_content() -> None:
    assert tasks_digitalization._is_transient_error(TimeoutError("provider timeout"))
    assert tasks_digitalization._is_transient_error(RuntimeError("HTTP 503"))
    assert not tasks_digitalization._is_transient_error(ValueError("archivo invalido"))
    assert tasks_digitalization._is_transient_error(DocumentRendererUnavailable("El conversor está ocupado"))


class FakeDB:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    async def commit(self) -> None:
        self.commits += 1

    async def rollback(self) -> None:
        self.rollbacks += 1


@pytest.mark.anyio
async def test_multiple_photos_are_not_read_before_subject_permission(monkeypatch):
    read = []
    async def denied(*args, **kwargs):
        raise HTTPException(403, 'Materia no disponible')
    async def bundle(*args, **kwargs):
        read.append(True)
        raise AssertionError('Must authorize first')
    monkeypatch.setattr(materias_service, 'ensure_can_manage_materia', denied)
    monkeypatch.setattr(router, 'build_evidence_bundle', bundle)
    user = SimpleNamespace(id=uuid4(), rol='profesor', _effective_permissions={'evaluations.create'})
    with pytest.raises(HTTPException) as caught:
        await router.digitalize_from_file(materia_id=uuid4(), nombre='Privada', file=[object(), object()], current_user=user, db=FakeDB())
    assert caught.value.status_code == 403
    assert not read


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
@pytest.mark.parametrize("visual_enabled", [False, True])
@pytest.mark.parametrize('multiple_photos', [False, True])
async def test_digitalization_is_persisted_and_enqueued(monkeypatch, visual_enabled, multiple_photos) -> None:
    monkeypatch.setattr(settings, "EVALUATION_VISUAL_IMPORT_ENABLED", visual_enabled)
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
    if multiple_photos:
        from PIL import Image
        photos = []
        for color in ('red', 'green', 'blue'):
            stream = BytesIO()
            Image.new('RGB', (60, 80), color).save(stream, format='PNG')
            photos.append(UploadFile(filename=f'{color}.png', file=BytesIO(stream.getvalue())))
        upload = photos

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
    assert created[0]["input_json"]["_visual_import_schema"] == (1 if visual_enabled else None)
    if multiple_photos:
        assert len(created) == len(queued) == 1
        assert created[0]['input_json']['hojas']['paginas'] == 3


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
