"""No real documents or inference: durable import/checkpoint contracts."""
from copy import deepcopy
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.modules.evaluaciones import visual_import_service as service
from app.modules.evaluaciones.document_visual_extractor import DocumentRendererUnavailable
from app.modules.evaluaciones.digitalize_service import detect_digitalization_mime
from app.modules.jobs.router import _public_result
from tests.fixtures.evaluation_visuals import mixed_pdf as pdf_mixed, photo as photo_sheet, shared_multipage_pdf


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def storage(monkeypatch):
    resources, writes = {}, []

    async def stage(_db, *, propietario_id, request, content, clase, origen, job_id, **kwargs):
        existing = next((item for item in resources.values() if item.request_key == request.request_key), None)
        if existing:
            assert existing.content == content
            return existing
        import hashlib
        item = SimpleNamespace(id=uuid4(), propietario_id=propietario_id, materia_id=request.materia_id,
            borrador_id=request.borrador_id, job_id=job_id, clase=clase, origen=origen,
            sha256=hashlib.sha256(content).hexdigest(), mime=detect_digitalization_mime(content, "fixture"),
            request_key=request.request_key, content=content, estado="staged", evaluacion_id=None)
        resources[item.id] = item
        writes.append(item)
        return item

    async def read(item):
        return item.content

    class DB:
        async def get(self, _model, identity):
            return resources.get(identity)

    monkeypatch.setattr(service, "stage_resource", stage)
    monkeypatch.setattr(service, "read_resource_bytes", read)
    return DB(), resources, writes


@pytest.mark.anyio
async def test_original_is_checkpointed_before_conversion_failure_and_reused(storage, monkeypatch):
    db, _, writes = storage
    job, owner, matter = uuid4(), uuid4(), uuid4()
    checkpoints = []

    async def save(checkpoint):
        checkpoints.append(deepcopy(checkpoint))

    async def unavailable(*_args):
        assert checkpoints and len(writes) == 1
        raise DocumentRendererUnavailable("Ocupado")

    monkeypatch.setattr(service, "extract_visual_document", unavailable)
    with pytest.raises(DocumentRendererUnavailable):
        await service.prepare_visual_import(db, job_id=job, owner_id=owner, materia_id=matter,
            content=photo_sheet().content, checkpoint=None, persist=save)
    assert checkpoints[0]["original_resource_id"] == str(writes[0].id)
    assert not checkpoints[0].get("extraction")
    from app.modules.evaluaciones.document_visual_extractor import extract_visual_document
    monkeypatch.setattr(service, "extract_visual_document", extract_visual_document)
    checkpoint = await service.prepare_visual_import(db, job_id=job, owner_id=owner, materia_id=matter,
        content=None, checkpoint=checkpoints[-1], persist=save)
    assert checkpoint["extraction"]["pages"]
    assert sum(item.clase == "original" for item in writes) == 1


@pytest.mark.anyio
async def test_full_inventory_is_durable_and_page_reads_resume_without_text_cache(storage, monkeypatch):
    db, _, writes = storage
    job, owner, matter = uuid4(), uuid4(), uuid4()
    checkpoints, calls = [], []

    async def save(value):
        checkpoints.append(deepcopy(value))

    checkpoint = await service.prepare_visual_import(db, job_id=job, owner_id=owner, materia_id=matter,
        content=pdf_mixed().content, checkpoint=None, persist=save)
    before = len(writes)
    checkpoint = await service.prepare_visual_import(db, job_id=job, owner_id=owner, materia_id=matter,
        content=None, checkpoint=checkpoint, persist=save)
    assert len(writes) == before
    assert checkpoint["extraction"]["elements"]
    reordered = deepcopy(checkpoint)
    reordered["extraction"]["asset_resources"] = dict(reversed(list(reordered["extraction"]["asset_resources"].items())))
    assert service._manifest(service.VisualImportCheckpoint.model_validate(checkpoint)) == service._manifest(service.VisualImportCheckpoint.model_validate(reordered))

    async def read_page(content, mime, name, user_id, ai_config=None, **kwargs):
        calls.append((content, kwargs))
        return "1. Describe la figura impresa.", []

    monkeypatch.setattr(service, "_extract_image_text", read_page)
    text, manifest = await service.read_visual_import(db, checkpoint, user_id=owner, ai_config=None, persist=save)
    assert "Describe" in text
    assert len(calls) == len(checkpoint["extraction"]["pages"])
    assert all("prompt_override" in call[1] for call in calls)
    assert manifest.original_recurso_id
    assert manifest.cobertura.estado == "requiere_revision"
    assert manifest.for_student().bloques == []
    assert any(block.seguridad_contenido == "privado_original" for block in manifest.bloques)
    await service.read_visual_import(db, checkpoints[-1], user_id=owner, ai_config=None, persist=save)
    assert len(calls) == len(checkpoint["extraction"]["pages"])
    assert "_visual_checkpoint" not in _public_result({"_visual_checkpoint": checkpoint, "evaluacion_id": "safe"})


@pytest.mark.anyio
async def test_checkpoint_of_other_job_cannot_reuse_resources(storage):
    db, _, _ = storage
    owner, matter = uuid4(), uuid4()

    async def save(_value):
        pass

    checkpoint = await service.prepare_visual_import(db, job_id=uuid4(), owner_id=owner, materia_id=matter,
        content=photo_sheet().content, checkpoint=None, persist=save)
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as caught:
        await service.prepare_visual_import(db, job_id=uuid4(), owner_id=owner, materia_id=matter,
            content=None, checkpoint=checkpoint, persist=save)
    assert caught.value.status_code == 409


@pytest.mark.anyio
async def test_changed_extractor_invalidates_page_text_not_original(storage):
    db, _, writes = storage
    job, owner, matter = uuid4(), uuid4(), uuid4()

    async def save(_value):
        pass

    checkpoint = await service.prepare_visual_import(db, job_id=job, owner_id=owner, materia_id=matter,
        content=photo_sheet().content, checkpoint=None, persist=save)
    original = checkpoint["original_resource_id"]
    checkpoint["extractor_version"] = "old-extractor"
    checkpoint["page_reads"] = {"invented": {"text": "OLD TEXT", "warnings": []}}
    refreshed = await service.prepare_visual_import(db, job_id=job, owner_id=owner, materia_id=matter,
        content=None, checkpoint=checkpoint, persist=save)
    assert refreshed["original_resource_id"] == original
    assert refreshed["page_reads"] == {}
    assert sum(item.clase == "original" for item in writes) == 1


@pytest.mark.anyio
async def test_partial_page_read_failure_resumes_at_missing_page(storage, monkeypatch):
    db, _, _ = storage
    checkpoints, pages = [], []

    async def save(value):
        checkpoints.append(deepcopy(value))

    checkpoint = await service.prepare_visual_import(db, job_id=uuid4(), owner_id=uuid4(), materia_id=uuid4(),
        content=shared_multipage_pdf().content, checkpoint=None, persist=save)

    async def failing_read(_content, _mime, name, *_args, **_kwargs):
        pages.append(name)
        if name == "Página 2":
            raise TimeoutError("synthetic provider timeout")
        return "Instrucciones impresas para las preguntas de la siguiente página.", []

    monkeypatch.setattr(service, "_extract_image_text", failing_read)
    with pytest.raises(TimeoutError):
        await service.read_visual_import(db, checkpoint, user_id=uuid4(), ai_config=None, persist=save)
    assert len(checkpoints[-1]["page_reads"]) == 1

    async def recovered_read(_content, _mime, name, *_args, **_kwargs):
        pages.append(name)
        return "1. Responde con base en la figura.", ["Revisa un valor poco legible."]

    monkeypatch.setattr(service, "_extract_image_text", recovered_read)
    text, manifest = await service.read_visual_import(db, checkpoints[-1], user_id=uuid4(), ai_config=None, persist=save)
    assert pages == ["Página 1", "Página 2", "Página 2"]
    assert "Instrucciones" in text and "Responde" in text
    assert any(warning.pagina == 2 and warning.mensaje == "Revisa un valor poco legible." for warning in manifest.cobertura.avisos)


@pytest.mark.anyio
async def test_page_text_budget_rejects_before_reading_more_pages_or_persisting_oversize_text(storage, monkeypatch):
    db, _, _ = storage
    checkpoints, calls = [], []

    async def save(value):
        checkpoints.append(deepcopy(value))

    checkpoint = await service.prepare_visual_import(db, job_id=uuid4(), owner_id=uuid4(), materia_id=uuid4(),
        content=shared_multipage_pdf().content, checkpoint=None, persist=save)
    monkeypatch.setattr(service.settings, "PHOTO_GRADING_CONTEXT_BUDGET_CHARS", 100)

    async def read(*_args, **_kwargs):
        calls.append(1)
        return "1. Explica la figura. " * 100, []

    monkeypatch.setattr(service, "_extract_image_text", read)
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as caught:
        await service.read_visual_import(db, checkpoint, user_id=uuid4(), ai_config=None, persist=save)
    assert caught.value.status_code == 422
    assert len(calls) == 1 and not checkpoints[-1]["page_reads"]


def test_invalid_private_checkpoint_has_safe_error_without_input_contents():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as caught:
        service._parse_checkpoint({"schema_version": 99, "private_text": "SYNTHETIC_PRIVATE_TEXT"})
    assert caught.value.status_code == 409
    assert "SYNTHETIC_PRIVATE_TEXT" not in str(caught.value)
