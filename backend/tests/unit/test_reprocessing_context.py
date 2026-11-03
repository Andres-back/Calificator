"""Synthetic grading contexts only: no files, providers, or academic writes."""
from copy import deepcopy
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.modules.calificaciones import reprocessing_context as context_service
from app.modules.calificaciones.revision_service import operation_fingerprint
from app.modules.calificaciones.schemas import ReprocessingContextRead
from app.modules.evaluaciones import grading_visual_context
from app.modules.evaluaciones.visual_service import content_hash


@pytest.fixture(autouse=True)
def domain_models():
    from app.db.base import import_models
    import_models()


@pytest.fixture
def scope(monkeypatch):
    evaluation_id, source_id, target_id = uuid4(), uuid4(), uuid4()
    questions = [dict(numero=index + 1, contenido_id=str(uuid4()),
                      enunciado=f'Pregunta sintética {index + 1}',
                      tipo='opcion_multiple' if index < 7 else 'abierta',
                      puntaje='0.52' if index == 8 else '0.56') for index in range(9)]
    source = dict(nombre='Evaluación sintética', descripcion=None, nota_maxima='5',
                  modalidad='presencial', tipo_origen='nativa', preguntas=questions,
                  respuestas_esperadas=[{'numero': index + 1, 'respuesta': 'Referencia privada'} for index in range(9)],
                  criterios=[], dba_ids=[], dba_personalizado_ids=[], metas_profesor=[],
                  blueprint=None, contenido_visual=None)
    target = deepcopy(source)
    for index, question in enumerate(target['preguntas']):
        question['puntaje'] = '1.25' if index >= 7 else ('0.3572' if index < 3 else '0.3571')
    revisions = {key: SimpleNamespace(id=key, content_hash=content_hash(raw), snapshot_json=raw)
                 for key, raw in [(source_id, source), (target_id, target)]}

    async def get_revision(_db, current_id, version):
        assert current_id == evaluation_id
        if version not in revisions:
            raise HTTPException(404, 'Versión no disponible')
        revision = revisions[version]
        revision.content_hash = content_hash(revision.snapshot_json)
        return revision

    monkeypatch.setattr(grading_visual_context, 'get_content_revision', get_revision)
    evaluation = SimpleNamespace(id=evaluation_id, materia_id=uuid4(), profesor_id=uuid4(),
                                 contenido_version_id=target_id, estado='publicada')
    delivery = SimpleNamespace(id=uuid4(), evaluacion_id=evaluation_id, contenido_version_id=source_id)
    grade = SimpleNamespace(id=uuid4(), updated_at=datetime(2026, 11, 2), entrega=delivery)
    actor = uuid4()
    return SimpleNamespace(evaluation=evaluation, grade=grade, delivery=delivery, actor=actor,
                           source=source, target=target, source_id=source_id, target_id=target_id,
                           revisions=revisions)


async def read(scope):
    return await context_service.read_reprocessing_context(object(), scope.evaluation, scope.grade,
                                                           actor_id=scope.actor)


@pytest.mark.asyncio
async def test_compares_exact_nine_question_weights_without_mutation_or_private_answers(scope):
    before = deepcopy(scope.source)
    result = await read(scope)
    assert result['estado'] == 'puntajes_actualizados' and result['requiere_confirmacion']
    assert result['version_entrega_id'] == scope.source_id
    assert result['version_objetivo_id'] == scope.target_id
    assert result['cambios'][-2:] == [
        {'numero': '8', 'puntaje_anterior': '0.56', 'puntaje_actual': '1.25'},
        {'numero': '9', 'puntaje_anterior': '0.52', 'puntaje_actual': '1.25'}]
    assert len(result['fingerprint']) == 64
    payload = ReprocessingContextRead.model_validate({**result, 'respuesta_estudiante': 'No publicar'})
    assert 'Referencia privada' not in payload.model_dump_json()
    assert 'No publicar' not in payload.model_dump_json()
    assert scope.source == before and scope.delivery.contenido_version_id == scope.source_id


@pytest.mark.asyncio
@pytest.mark.parametrize('change', ['question', 'answer', 'scale', 'visual', 'reading', 'identity'])
async def test_content_and_scale_changes_cannot_be_adopted(scope, change):
    if change == 'question':
        scope.target['preguntas'][0]['enunciado'] = 'Otra pregunta'
    elif change == 'answer':
        scope.target['respuestas_esperadas'][0]['respuesta'] = 'Otra clave'
    elif change == 'scale':
        scope.target['nota_maxima'] = '10'
    elif change == 'visual':
        scope.target['contenido_visual'] = {'schema_version': 1, 'pregunta_ids': [], 'bloques': [], 'cobertura': {}}
    elif change == 'reading':
        scope.target['lectura'] = 'Otra lectura'
    else:
        scope.target['preguntas'][0]['contenido_id'] = str(uuid4())
    result = await read(scope)
    assert result['estado'] in {'contenido_modificado', 'version_no_disponible'}
    assert not result['requiere_confirmacion'] and not result['cambios']
    assert scope.delivery.contenido_version_id == scope.source_id


@pytest.mark.asyncio
async def test_intermediate_revision_with_equal_weights_needs_no_confirmation(scope):
    for old, new in zip(scope.source['preguntas'], scope.target['preguntas']):
        new['puntaje'] = Decimal(old['puntaje'])
    # Stored JSON uses strings, like the real canonical snapshots.
    for question in scope.target['preguntas']:
        question['puntaje'] = str(question['puntaje'])
    result = await read(scope)
    assert result['estado'] == 'sin_cambios' and not result['requiere_confirmacion']
    assert result['cambios'] == []


@pytest.mark.asyncio
async def test_same_revision_and_original_legacy_contexts_remain_compatible(scope):
    scope.evaluation.contenido_version_id = scope.source_id
    assert (await read(scope))['estado'] == 'sin_cambios'
    scope.evaluation.contenido_version_id = scope.delivery.contenido_version_id = None
    assert (await read(scope))['estado'] == 'sin_cambios'


@pytest.mark.asyncio
@pytest.mark.parametrize('missing', ['source', 'target', 'delivery'])
async def test_missing_version_never_invents_a_historical_context(scope, missing):
    if missing == 'source':
        scope.delivery.contenido_version_id = None
    elif missing == 'target':
        scope.revisions.pop(scope.target_id)
    else:
        scope.grade.entrega = None
    result = await read(scope)
    assert result['estado'] == 'version_no_disponible'
    assert result['fingerprint'] is None and result['cambios'] == []


@pytest.mark.asyncio
async def test_fingerprint_covers_grade_version_actor_and_target_but_not_evaluation_state(scope):
    first = (await read(scope))['fingerprint']
    scope.evaluation.estado = 'en_calificacion'
    scope.evaluation.updated_at = datetime.now(timezone.utc)
    assert (await read(scope))['fingerprint'] == first
    scope.grade.updated_at = datetime(2026, 11, 3)
    assert (await read(scope))['fingerprint'] != first
    scope.grade.updated_at = datetime(2026, 11, 2)
    scope.actor = uuid4()
    assert (await read(scope))['fingerprint'] != first


@pytest.mark.asyncio
@pytest.mark.parametrize('payload', [{}, {'use_current': True},
                                    {'use_current': True, 'context_fingerprint': 'a' * 64}])
async def test_legacy_or_incomplete_confirmation_is_rejected_before_any_mutation(scope, payload):
    db = SimpleNamespace(scalar=AsyncMock(return_value=scope.evaluation))
    with pytest.raises(HTTPException) as denied:
        await context_service.validate_reprocessing_target(db, scope.evaluation, scope.grade,
                                                           actor_id=scope.actor, **payload)
    assert denied.value.status_code == 409
    assert scope.delivery.contenido_version_id == scope.source_id


@pytest.mark.asyncio
async def test_valid_acceptance_returns_target_metadata_without_mutating_the_delivery(scope):
    proposal = await read(scope)
    db = SimpleNamespace(scalar=AsyncMock(return_value=scope.evaluation))
    accepted = await context_service.validate_reprocessing_target(
        db, scope.evaluation, scope.grade, actor_id=scope.actor, use_current=True,
        target_version=scope.target_id, context_fingerprint=proposal['fingerprint'])
    assert accepted.target_version == scope.target_id
    assert accepted.metadata['version_anterior_id'] == str(scope.source_id)
    assert accepted.metadata['version_objetivo_id'] == str(scope.target_id)
    assert accepted.metadata['fingerprint'] == proposal['fingerprint']
    assert scope.delivery.contenido_version_id == scope.source_id
    statement = str(db.scalar.await_args.args[0].compile(dialect=__import__('sqlalchemy').dialects.postgresql.dialect()))
    assert 'FOR SHARE' in statement


@pytest.mark.asyncio
async def test_stale_target_or_grade_fingerprint_is_rejected(scope):
    proposal = await read(scope)
    scope.grade.updated_at = datetime(2026, 11, 3)
    db = SimpleNamespace(scalar=AsyncMock(return_value=scope.evaluation))
    with pytest.raises(HTTPException) as denied:
        await context_service.validate_reprocessing_target(
            db, scope.evaluation, scope.grade, actor_id=scope.actor, use_current=True,
            target_version=scope.target_id, context_fingerprint=proposal['fingerprint'])
    assert denied.value.status_code == 409


@pytest.mark.asyncio
async def test_content_changed_keeps_old_flow_but_refuses_explicit_adoption(scope):
    scope.target['preguntas'][0]['enunciado'] = 'Contenido diferente'
    db = SimpleNamespace(scalar=AsyncMock(return_value=scope.evaluation))
    accepted = await context_service.validate_reprocessing_target(db, scope.evaluation, scope.grade,
                                                                actor_id=scope.actor)
    assert accepted.target_version is None and accepted.metadata is None
    with pytest.raises(HTTPException) as denied:
        await context_service.validate_reprocessing_target(
            db, scope.evaluation, scope.grade, actor_id=scope.actor, use_current=True,
            target_version=scope.target_id, context_fingerprint='a' * 64)
    assert denied.value.status_code == 409


def test_new_operation_fields_change_fingerprint_without_rewriting_the_old_format():
    args = dict(version=datetime(2026, 11, 2), reason=None, confirmed=True, content=None)
    original = operation_fingerprint(**args)
    assert original == operation_fingerprint(**args, scoring_context=None)
    selection = {'usar_puntajes_actuales': True, 'version_puntajes_objetivo': str(uuid4()),
                 'contexto_puntajes_fingerprint': 'a' * 64}
    assert original != operation_fingerprint(**args, scoring_context=selection)
    assert operation_fingerprint(**args, scoring_context=selection) != operation_fingerprint(
        **args, scoring_context={**selection, 'version_puntajes_objetivo': str(uuid4())})


def test_context_route_is_registered_in_the_application_router():
    from fastapi import FastAPI
    from app.api import api_router
    app = FastAPI()
    app.include_router(api_router, prefix='/api')
    definition = app.openapi()['paths']['/api/calificaciones/{calificacion_id}/recalificacion-contexto']
    assert 'get' in definition
    assert definition['get']['responses']['200']['content']['application/json']['schema'] == {
        '$ref': '#/components/schemas/ReprocessingContextRead'}
