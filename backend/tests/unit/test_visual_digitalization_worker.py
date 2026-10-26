"""Claim-aware finalization: synthetic resources and mocked provider calls."""
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.workers import tasks_digitalization as worker
from app.modules.evaluaciones.visual_schemas import VisualManifest


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
@pytest.mark.parametrize("finish_ok", [True, False])
async def test_visual_worker_finalizes_evaluation_and_job_in_one_owned_transaction(monkeypatch, tmp_path, finish_ok):
    events = []
    job, teacher, matter, version = uuid4(), uuid4(), uuid4(), uuid4()
    checkpoint = {"original_resource_id": str(uuid4()), "page_reads": {"page": {"text": "1. Describe", "warnings": []}}}
    manifest = VisualManifest(cobertura={"paginas_detectadas": [1], "paginas_conservadas": [1],
        "estado": "requiere_revision", "avisos": [{"pagina": 1, "motivo": "asociacion_pendiente", "mensaje": "Revisa la página."}]})
    result = {"claim_token": "owner-attempt", "progreso": 15, "timings_ms": {}}

    class DB:
        async def commit(self):
            events.append("commit")

    async def owner(*_args):
        events.append("lock")

    async def manage(*_args):
        return SimpleNamespace(profesor_id=teacher)

    async def prepare(_db, *, content, persist, **kwargs):
        assert content == b"synthetic-temp"
        assert kwargs["owner_id"] == teacher
        await persist(checkpoint)
        return checkpoint

    async def read(_db, _checkpoint, *, persist, **_kwargs):
        return "1. Describe", manifest

    async def structure(**kwargs):
        assert kwargs["visual_scope_id"] == job
        return {"preguntas": [{"numero": 1}], "criterios": [], "claves_pendientes": [1],
                "clave_completa": False, "contenido_visual": manifest.model_dump(mode="json")}

    async def create(_db, _payload, _user, *, commit):
        assert not commit
        events.append("create")
        return SimpleNamespace(id=uuid4(), materia_id=matter, nombre="Sintética", contenido_version_id=version)

    async def finish(*_args, **kwargs):
        events.append("finish")
        assert kwargs["estado"] == "requires_review"
        assert kwargs["resultado_json"]["contenido_version_id"] == str(version)
        return finish_ok

    async def progress(*_args, **_kwargs):
        return True

    monkeypatch.setattr(worker.jobs_service, "lock_owned_job", owner)
    monkeypatch.setattr(worker.jobs_service, "update_job_progress", progress)
    monkeypatch.setattr(worker.jobs_service, "finish_job", finish)
    monkeypatch.setattr(worker, "ensure_can_manage_materia", manage)
    monkeypatch.setattr(worker, "prepare_visual_import", prepare)
    monkeypatch.setattr(worker, "read_visual_import", read)
    monkeypatch.setattr(worker, "detectar_estructura_evaluacion", structure)
    monkeypatch.setattr(worker.evaluaciones_service, "digitalize_external_evaluation", create)
    source = tmp_path / "temporary-upload"
    source.write_bytes(b"synthetic-temp")
    kwargs = dict(db=DB(), user=SimpleNamespace(id=teacher), job_id=job, materia_id=matter,
                  private_path=source, nombre="Sintética", descripcion=None, score=Decimal("5"), modalidad="fisica",
                  ai_config=None, result=result, timings_ms={}, refresh_total=lambda: None)
    if finish_ok:
        output = await worker._digitalize_visual_owned(**kwargs)
        assert output["status"] == "requires_review"
        assert output["evaluacion_id"]
        assert output["_visual_checkpoint"] == checkpoint
        assert events[-4:] == ["lock", "create", "finish", "commit"]
    else:
        with pytest.raises(worker.jobs_service.JobOwnershipLost):
            await worker._digitalize_visual_owned(**kwargs)
        assert events[-3:] == ["lock", "create", "finish"]  # No commit after losing the claim.


@pytest.mark.anyio
@pytest.mark.parametrize('finish_ok', [True, False])
async def test_text_document_uses_cached_extraction_and_owned_atomic_finalization(monkeypatch, tmp_path, finish_ok):
    from tests.unit.test_document_digitalization import source_and_model, normalize
    source_text, inventory, raw = source_and_model()
    job, teacher, matter, version = uuid4(), uuid4(), uuid4(), uuid4()
    events, structure_calls = [], []
    result = {'claim_token': 'document-owner', 'progreso': 15,
              'normalized_extraction': {'text': source_text, 'warnings': []}}

    class DB:
        async def commit(self):
            events.append('commit')

    async def owner(*_args):
        events.append('lock')
    async def progress(*_args, **kwargs):
        if kwargs['resultado_json'].get('_document_structure'):
            events.append('structure-checkpoint')
        return True
    async def manage(*_args):
        return SimpleNamespace(profesor_id=teacher)
    async def forbidden(*_args, **_kwargs):
        raise AssertionError('A retained text extraction must not request vision or an original again')
    async def structure(**kwargs):
        assert kwargs['document_scope_id'] == job and kwargs['contenido_visual'] is None
        structure_calls.append(job)
        return normalize(raw, inventory, job)
    async def create(_db, payload, _user, *, commit):
        assert not commit and len(payload.estructura_detectada['preguntas']) == 16
        assert payload.estructura_detectada['estructura_documento']
        assert 'structure-checkpoint' in events
        events.append('create')
        return SimpleNamespace(id=uuid4(), materia_id=matter, nombre='Documento sintético', contenido_version_id=version)
    async def finish(*_args, **kwargs):
        assert kwargs['estado'] == 'requires_review'
        assert kwargs['resultado_json']['terminal_reason'] == 'document_review_required'
        events.append('finish')
        return finish_ok
    monkeypatch.setattr(worker.jobs_service, 'lock_owned_job', owner)
    monkeypatch.setattr(worker.jobs_service, 'update_job_progress', progress)
    monkeypatch.setattr(worker.jobs_service, 'finish_job', finish)
    monkeypatch.setattr(worker, 'ensure_can_manage_materia', manage)
    monkeypatch.setattr(worker, 'extract_evaluation_text', forbidden)
    monkeypatch.setattr(worker, 'prepare_visual_import', forbidden)
    monkeypatch.setattr(worker, 'detectar_estructura_evaluacion', structure)
    monkeypatch.setattr(worker.evaluaciones_service, 'digitalize_external_evaluation', create)
    kwargs = dict(db=DB(), user=SimpleNamespace(id=teacher), job_id=job, materia_id=matter,
        private_path=tmp_path / 'does-not-exist', nombre='Documento sintético', descripcion=None,
        score=Decimal('5'), modalidad='fisica', ai_config=None, result=result, timings_ms={},
        refresh_total=lambda: None, visual_mode=False, document_mode=True)
    if finish_ok:
        output = await worker._digitalize_visual_owned(**kwargs)
        assert output['_document_saved'] and output['cobertura_documental'] == 'requiere_revision'
        assert all('texto' not in entry for entry in output['_document_inventory'])
        assert events[-4:] == ['lock', 'create', 'finish', 'commit']
    else:
        with pytest.raises(worker.jobs_service.JobOwnershipLost):
            await worker._digitalize_visual_owned(**kwargs)
        assert events[-3:] == ['lock', 'create', 'finish']
    assert len(structure_calls) == 1
