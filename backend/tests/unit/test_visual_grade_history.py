from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.modules.evaluaciones import grading_visual_context as context
from app.modules.calificaciones import service
from tests.unit.test_evaluation_visual_grading import snapshot


@pytest.mark.asyncio
async def test_historical_definition_does_not_need_image_bytes_to_show_saved_grade(monkeypatch):
    raw = snapshot()
    revision = SimpleNamespace(id=uuid4(), snapshot_json=raw, content_hash='a' * 64)
    monkeypatch.setattr(context, 'get_content_revision', AsyncMock(return_value=revision))
    resolve = AsyncMock(side_effect=ValueError('missing resource'))
    monkeypatch.setattr(context, 'resolve_visual_material', resolve)
    evaluation = SimpleNamespace(id=uuid4(), materia_id=uuid4(), profesor_id=uuid4(), nombre='B', nota_maxima=1)
    delivery = SimpleNamespace(evaluacion_id=evaluation.id, contenido_version_id=revision.id)
    definition = await context.read_grading_definition(object(), evaluation, delivery)
    assert definition.evaluation.nombre == 'Versión A' and definition.evaluation.nota_maxima == 5
    assert definition.blueprint['respuestas_esperadas'][0]['respuesta'] == 'Clave A'
    resolve.assert_not_called()
    assert evaluation.nombre == 'B'


@pytest.mark.asyncio
async def test_grade_maximum_uses_its_revision_without_changing_current_access_policy(monkeypatch):
    from app.db.base import import_models
    import_models()
    raw = snapshot()
    revision = SimpleNamespace(id=uuid4(), snapshot_json=raw, content_hash='a' * 64)
    monkeypatch.setattr(context, 'get_content_revision', AsyncMock(return_value=revision))
    evaluation = SimpleNamespace(id=uuid4(), materia_id=uuid4(), profesor_id=uuid4(), nombre='B', nota_maxima=1,
        politica_intento='un_intento', estado='publicada', recepcion_habilitada=True, blueprint=None)
    delivery = SimpleNamespace(evaluacion_id=evaluation.id, contenido_version_id=revision.id)
    grade = SimpleNamespace(evaluacion_id=evaluation.id, entrega=delivery)
    db = SimpleNamespace(scalar=AsyncMock(return_value=evaluation))
    selected = await service.get_evaluation_for_calificacion(db, grade)
    assert selected.nota_maxima == Decimal('5')
    assert selected.profesor_id == evaluation.profesor_id and selected.politica_intento == 'un_intento'
    assert evaluation.nota_maxima == 1


@pytest.mark.asyncio
async def test_publication_rejects_missing_visual_context_before_mutating_previous_grades(monkeypatch):
    from app.modules.calificaciones import visual_grade_policy
    evaluation = SimpleNamespace(id=uuid4(), politica_intento='un_intento')
    grade = SimpleNamespace(id=uuid4(), evaluacion_id=evaluation.id, estudiante_id=uuid4(),
        entrega=SimpleNamespace(contenido_version_id=uuid4()), resultado_json={}, nota_confirmada=4)
    monkeypatch.setattr(visual_grade_policy, 'load_grading_context', AsyncMock(side_effect=HTTPException(409, 'Falta figura')))
    db = SimpleNamespace(scalars=AsyncMock(), scalar=AsyncMock(return_value=None))
    with pytest.raises(HTTPException):
        await visual_grade_policy.ensure_visual_grade_publishable(db, grade, evaluation)
    db.scalars.assert_not_called()


@pytest.mark.asyncio
async def test_read_snapshot_does_not_reopen_released_solutions(monkeypatch):
    from app.modules.calificaciones.breakdown_service import answers_released
    raw = snapshot()
    raw['blueprint'] = {'preguntas': raw['preguntas'], 'respuestas_esperadas': raw['respuestas_esperadas'],
        'criterios': [], 'dba': [], 'metas': [], 'errores_comunes': [], 'contexto_rag': [],
        'nivel_contexto': 'general', 'reglas_feedback': {'respuestas_liberadas': True}}
    revision = SimpleNamespace(id=uuid4(), snapshot_json=raw, content_hash='a' * 64)
    monkeypatch.setattr(context, 'get_content_revision', AsyncMock(return_value=revision))
    evaluation = SimpleNamespace(id=uuid4(), materia_id=uuid4(), profesor_id=uuid4(), nota_maxima=1,
        blueprint=SimpleNamespace(reglas_feedback={'respuestas_liberadas': False}), recepcion_habilitada=False)
    grade = SimpleNamespace(entrega=SimpleNamespace(evaluacion_id=evaluation.id, contenido_version_id=revision.id))
    view = await service._historical_grade_evaluation(object(), grade, evaluation)
    assert not answers_released(view)
    assert view.blueprint.reglas_feedback['respuestas_liberadas'] is True


@pytest.mark.asyncio
async def test_missing_context_cannot_be_confirmed_into_student_visible_grade(monkeypatch):
    from app.modules.calificaciones import visual_grade_policy
    from app.modules.calificaciones.schemas import ConfirmarNota
    evaluation = SimpleNamespace(nota_maxima=5)
    grade = SimpleNamespace(estado='sugerida', nota_confirmada=None)
    monkeypatch.setattr(service, 'get_evaluation_for_calificacion', AsyncMock(return_value=evaluation))
    monkeypatch.setattr(visual_grade_policy, 'ensure_visual_grade_publishable', AsyncMock(side_effect=HTTPException(409, 'Revisa el material')))
    with pytest.raises(HTTPException):
        await service.confirmar_nota(object(), grade, ConfirmarNota(nota_confirmada=4))
    assert grade.estado == 'sugerida' and grade.nota_confirmada is None
