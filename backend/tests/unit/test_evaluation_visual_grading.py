"""No inference: immutable grading context must precede provider execution."""
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.modules.evaluaciones import grading_visual_context
from app.modules.evaluaciones.visual_service import content_hash


@pytest.fixture(autouse=True)
def register_domain_models():
    from app.db.base import import_models
    import_models()


def snapshot():
    question_id = str(uuid4())
    return {'nombre': 'Versión A', 'descripcion': None, 'nota_maxima': '5', 'modalidad': 'online',
        'tipo_origen': 'nativa', 'preguntas': [{'numero': 1, 'contenido_id': question_id, 'enunciado': 'Pregunta A', 'puntaje': 5}],
        'respuestas_esperadas': [{'numero': 1, 'respuesta': 'Clave A'}], 'criterios': [{'nombre': 'Criterio A'}],
        'dba_ids': [], 'dba_personalizado_ids': [], 'metas_profesor': [], 'blueprint': None,
        'contenido_visual': {'schema_version': 1, 'pregunta_ids': [question_id], 'bloques': [], 'cobertura': {}},
    }


@pytest.mark.asyncio
async def test_delivery_always_uses_its_pinned_revision_not_todays_evaluation(monkeypatch):
    old_id, new_id = uuid4(), uuid4()
    raw = snapshot()
    revision = SimpleNamespace(id=old_id, content_hash=content_hash(raw), snapshot_json=raw)
    get = AsyncMock(return_value=revision)
    monkeypatch.setattr(grading_visual_context, 'get_content_revision', get)
    monkeypatch.setattr(grading_visual_context, 'resolve_visual_material', AsyncMock(return_value=[]))
    evaluation = SimpleNamespace(id=uuid4(), materia_id=uuid4(), profesor_id=uuid4(),
        contenido_version_id=new_id, nombre='Versión B')
    delivery = SimpleNamespace(evaluacion_id=evaluation.id, contenido_version_id=old_id)
    context = await grading_visual_context.load_grading_context(object(), evaluation, delivery)
    assert context.version_id == old_id
    assert context.blueprint['nombre'] == 'Versión A'
    assert context.blueprint['preguntas'][0]['enunciado'] == 'Pregunta A'
    assert context.blueprint['respuestas_esperadas'][0]['respuesta'] == 'Clave A'
    assert context.blueprint['contenido_hash'] == revision.content_hash
    context.blueprint['preguntas'][0]['enunciado'] = 'Local copy'
    assert raw['preguntas'][0]['enunciado'] == 'Pregunta A'
    assert get.await_args.args[1:] == (evaluation.id, old_id)
    assert get.await_count == 1


@pytest.mark.asyncio
async def test_legacy_delivery_does_not_acquire_visuals_from_a_newer_version(monkeypatch):
    get = AsyncMock()
    monkeypatch.setattr(grading_visual_context, 'get_content_revision', get)
    evaluation = SimpleNamespace(id=uuid4(), contenido_version_id=uuid4())
    delivery = SimpleNamespace(evaluacion_id=evaluation.id, contenido_version_id=None)
    with pytest.raises(HTTPException) as failure:
        await grading_visual_context.load_grading_context(object(), evaluation, delivery)
    assert failure.value.status_code == 409
    get.assert_not_called()
    assert delivery.contenido_version_id is None


@pytest.mark.asyncio
async def test_legacy_text_flow_stays_unchanged_and_does_not_query_revision(monkeypatch):
    expected = {'nombre': 'Legacy', 'preguntas': [{'numero': 1}]}
    monkeypatch.setattr(grading_visual_context, 'evaluation_to_grading_blueprint', lambda _: deepcopy(expected))
    evaluation = SimpleNamespace(id=uuid4(), contenido_version_id=None)
    delivery = SimpleNamespace(evaluacion_id=evaluation.id, contenido_version_id=None)
    context = await grading_visual_context.load_grading_context(object(), evaluation, delivery)
    assert context.blueprint == expected and context.visuals == () and context.version_id is None


@pytest.mark.asyncio
async def test_missing_or_incoherent_material_blocks_inference_instead_of_creating_a_zero(monkeypatch):
    raw = snapshot()
    revision = SimpleNamespace(id=uuid4(), content_hash=content_hash(raw), snapshot_json=raw)
    monkeypatch.setattr(grading_visual_context, 'get_content_revision', AsyncMock(return_value=revision))
    monkeypatch.setattr(grading_visual_context, 'resolve_visual_material', AsyncMock(side_effect=ValueError('Falta material')))
    evaluation = SimpleNamespace(id=uuid4(), materia_id=uuid4(), profesor_id=uuid4(), contenido_version_id=revision.id)
    delivery = SimpleNamespace(evaluacion_id=evaluation.id, contenido_version_id=revision.id)
    with pytest.raises(HTTPException) as failure:
        await grading_visual_context.load_grading_context(object(), evaluation, delivery)
    assert failure.value.status_code == 409
    assert 'material' in str(failure.value.detail).lower()


@pytest.mark.asyncio
async def test_job_reference_is_the_delivery_revision_and_never_reads_a_new_current_revision(monkeypatch):
    version_id = uuid4()
    revision = SimpleNamespace(id=version_id, content_hash='a' * 64)
    get = AsyncMock(return_value=revision)
    monkeypatch.setattr(grading_visual_context, 'get_content_revision', get)
    evaluation = SimpleNamespace(id=uuid4(), contenido_version_id=uuid4())
    delivery = SimpleNamespace(evaluacion_id=evaluation.id, contenido_version_id=version_id)
    result = await grading_visual_context.grading_job_reference(object(), evaluation, delivery)
    assert result == {'contenido_version_id': str(version_id), 'contenido_hash': 'a' * 64}
    assert get.await_args.args[1:] == (evaluation.id, version_id)


@pytest.mark.asyncio
async def test_new_photo_pins_the_current_row_under_lock_instead_of_a_stale_evaluation(monkeypatch):
    from app.modules.calificaciones.models import Entrega
    version_id = uuid4()
    evaluation = SimpleNamespace(id=uuid4(), contenido_version_id=uuid4())
    current = SimpleNamespace(id=evaluation.id, contenido_version_id=version_id)
    db = SimpleNamespace(scalar=AsyncMock(return_value=current))
    revision = SimpleNamespace(id=version_id, content_hash='b' * 64)
    monkeypatch.setattr(grading_visual_context, 'get_content_revision', AsyncMock(return_value=revision))
    delivery = Entrega(evaluacion_id=evaluation.id)
    reference = await grading_visual_context.pin_new_submission_content(db, evaluation, delivery)
    assert delivery.contenido_version_id == version_id
    assert reference['contenido_hash'] == 'b' * 64
    assert db.scalar.await_args.args[0]._for_update_arg is not None


@pytest.mark.asyncio
async def test_old_unversioned_delivery_cannot_be_pinned_retroactively():
    from sqlalchemy.orm import make_transient_to_detached
    from app.modules.calificaciones.models import Entrega
    evaluation = SimpleNamespace(id=uuid4(), contenido_version_id=uuid4())
    delivery = Entrega(id=uuid4(), evaluacion_id=evaluation.id, contenido_version_id=None)
    make_transient_to_detached(delivery)
    db = SimpleNamespace(scalar=AsyncMock())
    with pytest.raises(HTTPException) as failure:
        await grading_visual_context.pin_new_submission_content(db, evaluation, delivery)
    assert failure.value.status_code == 409
    db.scalar.assert_not_called()


def test_extraction_cache_is_invalidated_when_only_the_pinned_material_changes():
    from app.workers.tasks_grading import _extraction_fingerprint
    params = dict(image_bytes=b'same-photo', image_mime='image/jpeg', ai_config=None)
    blueprint = {'preguntas': [{'numero': 1, 'enunciado': 'Mira la figura'}],
        'contenido_version_id': str(uuid4()), 'contenido_hash': 'a' * 64}
    first = _extraction_fingerprint(**params, blueprint=blueprint)
    changed = _extraction_fingerprint(**params, blueprint={**blueprint, 'contenido_hash': 'b' * 64})
    assert first != changed


@pytest.mark.asyncio
async def test_worker_checks_job_reference_before_loading_evidence_or_running_a_model(monkeypatch):
    from app.workers import tasks_grading
    evaluation = SimpleNamespace(id=uuid4(), contenido_version_id=uuid4())
    delivery = SimpleNamespace(id=uuid4(), evaluacion_id=evaluation.id, contenido_version_id=uuid4(), visual_text_json={})
    raw = snapshot()
    revision = SimpleNamespace(id=delivery.contenido_version_id, content_hash=content_hash(raw), snapshot_json=raw)
    monkeypatch.setattr(grading_visual_context, 'get_content_revision', AsyncMock(return_value=revision))
    monkeypatch.setattr(tasks_grading, '_existing_grade', AsyncMock(return_value=None))
    load, grade = AsyncMock(), AsyncMock()
    monkeypatch.setattr(tasks_grading, '_load_submission', load)
    monkeypatch.setattr(tasks_grading, 'grade_submission', grade)
    db = SimpleNamespace(commit=AsyncMock())
    with pytest.raises(HTTPException) as error:
        await tasks_grading._grade_delivery(db, evaluacion=evaluation, entrega=delivery, profesor_id=uuid4(),
            expected_content_reference={'contenido_version_id': str(delivery.contenido_version_id), 'contenido_hash': 'wrong'})
    assert error.value.status_code == 409
    load.assert_not_called()
    grade.assert_not_called()
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_worker_uses_pinned_keys_maximum_and_material_after_current_content_changes(monkeypatch):
    from decimal import Decimal
    from app.modules.calificaciones.models import Entrega
    from app.modules.calificaciones.schemas import GradingResult
    from app.modules.evaluaciones.visual_render import ResolvedVisualBlock
    from app.modules.evaluaciones.visual_schemas import VisualBlock
    from app.workers import tasks_grading
    from tests.unit.test_tasks_grading import FakeDB
    from tests.unit.test_evaluation_visual_transport import png
    raw = snapshot()
    raw['nota_maxima'] = '10'
    raw['preguntas'][0]['puntaje'] = 10
    version_id = uuid4()
    revision = SimpleNamespace(id=version_id, content_hash=content_hash(raw), snapshot_json=raw)
    material = ResolvedVisualBlock(VisualBlock(id=uuid4(), tipo='imagen', orden=0,
        pregunta_ids=[raw['preguntas'][0]['contenido_id']], recurso_id=uuid4(),
        descripcion='Triángulo azul', seguridad_contenido='publicable_confirmado'), png())
    monkeypatch.setattr(grading_visual_context, 'get_content_revision', AsyncMock(return_value=revision))
    monkeypatch.setattr(grading_visual_context, 'resolve_visual_material', AsyncMock(return_value=[material]))
    evaluation = SimpleNamespace(id=uuid4(), materia_id=uuid4(), profesor_id=uuid4(),
        nombre='Versión B', nota_maxima=Decimal('5'), contenido_version_id=uuid4(), estado='en_calificacion')
    delivery = Entrega(id=uuid4(), evaluacion_id=evaluation.id, estudiante_id=uuid4(), materia_id=evaluation.materia_id,
        contenido_version_id=version_id, respuesta_texto='P1: respuesta', archivo_url=None, visual_text_json={})
    monkeypatch.setattr(tasks_grading, '_existing_grade', AsyncMock(return_value=None))
    grade = AsyncMock(return_value=GradingResult(nota_sugerida=Decimal('8'), nota_maxima=Decimal('10'), confianza=.9,
        raw_model_output={'componentes': []}))
    monkeypatch.setattr(tasks_grading, 'grade_submission', grade)
    breakdown = AsyncMock()
    monkeypatch.setattr(tasks_grading, 'create_automatic_breakdown', breakdown)
    result, created = await tasks_grading._grade_delivery(FakeDB(), evaluacion=evaluation, entrega=delivery,
        profesor_id=evaluation.profesor_id,
        expected_content_reference={'contenido_version_id': str(version_id), 'contenido_hash': revision.content_hash})
    assert created and result.nota_sugerida == Decimal('8')
    model_input = grade.await_args.kwargs
    assert model_input['blueprint']['nombre'] == 'Versión A'
    assert model_input['blueprint']['respuestas_esperadas'][0]['respuesta'] == 'Clave A'
    assert model_input['blueprint']['nota_maxima'] == 10
    assert model_input['evaluation_visuals'][0].image_bytes == png()
    assert 'procedencia' not in repr(model_input['evaluation_visuals'][0])
    assert breakdown.await_args.kwargs['blueprint'] == model_input['blueprint']
    assert result.resultado_json['evaluation_content']['content_hash'] == revision.content_hash
    assert evaluation.nota_maxima == 5 and evaluation.nombre == 'Versión B'


@pytest.mark.asyncio
async def test_direct_photo_with_missing_material_preserves_evidence_and_creates_no_fake_breakdown(monkeypatch):
    from decimal import Decimal
    from app.modules.calificaciones import photo_service
    from app.modules.calificaciones.models import Entrega
    from tests.unit.test_tasks_grading import FakeDB
    evaluation = SimpleNamespace(id=uuid4(), materia_id=uuid4(), nota_maxima=Decimal('5'))
    delivery = Entrega(id=uuid4(), evaluacion_id=evaluation.id, estudiante_id=uuid4(), materia_id=evaluation.materia_id,
        contenido_version_id=uuid4(), archivo_url='/uploads/entregas/synthetic.png', visual_text_json={})
    monkeypatch.setattr(photo_service, 'load_grading_context', AsyncMock(side_effect=HTTPException(409, 'Falta material')))
    grade, breakdown = AsyncMock(), AsyncMock()
    monkeypatch.setattr(photo_service, 'grade_submission', grade)
    monkeypatch.setattr(photo_service, 'create_automatic_breakdown', breakdown)
    result = await photo_service.grade_persisted_photo(FakeDB(), evaluacion=evaluation, entrega=delivery,
        estudiante_id=delivery.estudiante_id, profesor_id=uuid4(), image_bytes=b'photo', image_mime='image/png')
    assert result.nota_sugerida is None and result.nota_confirmada is None
    assert result.estado == 'requiere_revision'
    assert delivery.archivo_url == '/uploads/entregas/synthetic.png'
    grade.assert_not_called()
    breakdown.assert_not_called()
