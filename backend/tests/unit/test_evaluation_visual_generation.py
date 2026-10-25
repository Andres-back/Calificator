"""Synthetic proposal contracts: no provider calls or paid generations."""
import base64
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.modules.evaluaciones.visual_schemas import VisualProposalRequest
from app.modules.evaluaciones import visual_generation as generation
from tests.integration.test_evaluation_visual_persistence import synthetic_png
from io import BytesIO
from PIL import Image


def request(kind='imagen', **kwargs):
    return VisualProposalRequest(materia_id=uuid4(), borrador_id=uuid4(), request_key=uuid4(),
        pregunta_id=uuid4(), tipo=kind, descripcion='Figura educativa', **kwargs)


@pytest.mark.asyncio
async def test_image_generation_rejects_placeholder_or_remote_url(monkeypatch):
    mock = AsyncMock(return_value=SimpleNamespace(is_placeholder=True, b64_data=None, url='https://example.test/image'))
    monkeypatch.setattr(generation, 'generate_image', mock)
    with pytest.raises(ValueError, match='imagen'):
        await generation.generate_proposal_bytes(request(), user_id=uuid4(), db=object(), ai_config={'primary': {}})


@pytest.mark.asyncio
async def test_image_proposal_returns_real_bytes_and_captured_config(monkeypatch):
    mock = AsyncMock(return_value=SimpleNamespace(is_placeholder=False, b64_data=base64.b64encode(synthetic_png()).decode()))
    monkeypatch.setattr(generation, 'generate_image', mock)
    content, table, chart = await generation.generate_proposal_bytes(request(), user_id=uuid4(), db=object(), ai_config={'primary': {'model': 'configured'}})
    assert content == synthetic_png() and table is None and chart is None
    assert mock.await_args.kwargs['ai_config']['primary']['model'] == 'configured'


@pytest.mark.asyncio
async def test_structured_table_is_rendered_without_image_model(monkeypatch):
    image = AsyncMock()
    monkeypatch.setattr(generation, 'generate_image', image)
    content, table, chart = await generation.generate_proposal_bytes(request('tabla', tabla={'encabezados': ['A'], 'filas': [['12']]}),
        user_id=uuid4(), db=object(), ai_config={})
    assert content.startswith(b'\x89PNG') and table.filas == [['12']] and chart is None
    image.assert_not_called()


@pytest.mark.asyncio
async def test_invalid_generated_chart_is_not_a_success(monkeypatch):
    router = SimpleNamespace(generate_json=AsyncMock(return_value={'grafica': {'tipo': 'lineas', 'categorias': ['A'], 'series': [{'nombre': 'S', 'valores': [1, 2]}]}}))
    monkeypatch.setattr(generation, 'LLMRouter', lambda **kwargs: router)
    with pytest.raises(ValueError):
        await generation.generate_proposal_bytes(request('grafica'), user_id=uuid4(), db=object(), ai_config={'primary': {}})


def test_proposal_never_claims_to_be_teacher_accepted():
    block = generation.proposal_block(request(), uuid4())
    assert block.seguridad_contenido == 'pendiente_revision'


def test_crop_is_bounded_and_does_not_modify_original():
    content = synthetic_png()
    assert generation.crop_proposal_bytes(content, (0, 0, 1, 1)).startswith(b'\x89PNG')
    assert content == synthetic_png()
    with pytest.raises(ValueError):
        generation.crop_proposal_bytes(content, (-1, 0, 1, 1))


@pytest.mark.asyncio
async def test_125_isolated_print_figure_is_one_explicit_call(monkeypatch):
    output = BytesIO()
    image = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    image.putpixel((16, 16), (0, 0, 0, 255))
    image.save(output, format='PNG')
    content = output.getvalue()
    mock = AsyncMock(return_value=SimpleNamespace(is_placeholder=False, b64_data=base64.b64encode(content).decode()))
    monkeypatch.setattr(generation, 'generate_image', mock)
    result, _, _ = await generation.generate_proposal_bytes(request(uso='decoracion', blanco_negro=True, fondo_transparente=True), user_id=uuid4(), db=object(), ai_config={})
    assert result == content
    assert mock.await_count == 1
    assert mock.await_args.kwargs['single_attempt'] is True
    assert mock.await_args.kwargs['admin_config'] == {'quality': 'low', 'background': 'transparent'}
    prompt = mock.await_args.args[0]
    assert 'figura aislada' in prompt and 'No generes una hoja' in prompt
    assert 'blanco y negro' in prompt and 'Decoración' in prompt


@pytest.mark.asyncio
async def test_125_white_background_is_not_claimed_as_transparent(monkeypatch):
    mock = AsyncMock(return_value=SimpleNamespace(is_placeholder=False, b64_data=base64.b64encode(synthetic_png()).decode()))
    monkeypatch.setattr(generation, 'generate_image', mock)
    with pytest.raises(ValueError, match='transparente'):
        await generation.generate_proposal_bytes(request(fondo_transparente=True), user_id=uuid4(), db=object(), ai_config={})
    assert mock.await_count == 1


def test_125_print_figure_options_do_not_change_structured_data():
    with pytest.raises(ValueError, match='fondo'):
        request('tabla', fondo_transparente=True)


@pytest.mark.asyncio
async def test_125_a_recovered_job_cannot_spend_an_uncertain_image_attempt_twice():
    from app.workers.tasks_evaluation_visuals import reserve_image_attempt
    db = SimpleNamespace(scalar=AsyncMock(side_effect=[uuid4(), None]), commit=AsyncMock())
    job = uuid4()
    await reserve_image_attempt(db, job)
    assert db.commit.await_count == 1
    with pytest.raises(generation.VisualMaterialError, match='No repetiremos el gasto'):
        await reserve_image_attempt(db, job)
    assert db.commit.await_count == 1


@pytest.mark.asyncio
@pytest.mark.parametrize('cancelled,recovered,invalid', [(True, False, None), (False, False, None), (False, True, None), (True, True, None), (False, True, 'scope'), (False, True, 'job'), (False, True, 'bytes')])
async def test_durable_worker_never_accepts_and_discards_cancelled_or_reuses_saved_proposal(monkeypatch, cancelled, recovered, invalid):
    from app.core.config import settings
    from app.modules.jobs import service as jobs
    from app.modules.materias import service as subjects
    from app.modules.authorization import service as authorization
    from app.workers import tasks_evaluation_visuals as worker
    from app.modules.authorization.catalog import default_permissions_for_role
    proposal = request()
    job_id, owner_id = uuid4(), uuid4()
    resource = SimpleNamespace(id=uuid4(), procedencia_json={}, propietario_id=owner_id,
        materia_id=proposal.materia_id, evaluacion_id=proposal.evaluacion_id, borrador_id=proposal.borrador_id,
        job_id=job_id, request_key=proposal.request_key, origen='ia', clase='imagen')
    if invalid == 'scope': resource.materia_id = uuid4()
    if invalid == 'job': resource.job_id = uuid4()
    db = SimpleNamespace(commit=AsyncMock(), rollback=AsyncMock(),
        scalar=AsyncMock(side_effect=[uuid4(), resource if recovered else None]),
        get=AsyncMock(return_value=SimpleNamespace(id=uuid4(), estado='activo', rol='profesor')))
    class Session:
        async def __aenter__(self): return db
        async def __aexit__(self, *args): return False
    monkeypatch.setattr(settings, 'EVALUATION_VISUAL_GENERATION_ENABLED', True)
    monkeypatch.setattr(worker, 'AsyncSessionLocal', Session)
    monkeypatch.setattr(worker, '_heartbeat', AsyncMock())
    monkeypatch.setattr(subjects, 'ensure_can_manage_materia', AsyncMock(return_value=SimpleNamespace(profesor_id=owner_id)))
    monkeypatch.setattr(authorization, 'effective_permissions', AsyncMock(return_value=default_permissions_for_role('profesor')))
    monkeypatch.setattr(jobs, 'claim_job_running', AsyncMock(return_value=True))
    monkeypatch.setattr(jobs, 'get_job_input', AsyncMock(return_value={'proposal': proposal.model_dump(mode='json'), '_ai_config': {'image': {'captured': True}}}))
    monkeypatch.setattr(jobs, 'lock_owned_job', AsyncMock(side_effect=jobs.JobOwnershipLost() if cancelled else None))
    finish = AsyncMock(return_value=True)
    monkeypatch.setattr(jobs, 'finish_job', finish)
    stage = AsyncMock(return_value=resource)
    monkeypatch.setattr(worker, 'stage_resource', stage)
    generate = AsyncMock(return_value=(synthetic_png(), None, None))
    monkeypatch.setattr(worker, 'generate_proposal_bytes', generate)
    from app.modules.evaluaciones import visual_service
    read = AsyncMock(side_effect=ValueError('synthetic missing bytes') if invalid == 'bytes' else None, return_value=synthetic_png())
    monkeypatch.setattr(visual_service, 'read_resource_bytes', read)
    result = await worker._generate(job_id, 'synthetic-lease')
    if cancelled:
        assert result['status'] == 'cancelled_or_reclaimed'
        stage.assert_not_called(); finish.assert_not_called()
    elif invalid:
        assert result['status'] == 'requires_review'
        generate.assert_not_called(); stage.assert_not_called()
        assert finish.await_args.kwargs['estado'] == 'requires_review'
    else:
        assert result['status'] == 'success'
        assert finish.await_args.kwargs['resultado_json']['bloque']['seguridad_contenido'] == 'pendiente_revision'
        if recovered:
            generate.assert_not_called(); stage.assert_not_called()
            read.assert_awaited_once_with(resource)
        else:
            assert generate.await_args.kwargs['ai_config'] == {'captured': True}
