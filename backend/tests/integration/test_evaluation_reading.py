"""Reading persistence contracts using only the isolated PostgreSQL fixture."""
from decimal import Decimal

import pytest
from fastapi import HTTPException
from app.modules.evaluaciones import service
from app.modules.evaluaciones.models import Evaluacion
from app.modules.evaluaciones.schemas import DigitalizarEvaluacionExternaRequest, EvaluacionUpdate
from app.modules.users.models import User
from tests.integration.test_evaluation_visual_persistence import (
    database, visual_scope, legacy_evaluation, TEST_URL,
)

pytestmark = pytest.mark.skipif(not TEST_URL, reason='Requiere PostgreSQL aislado SPEC101_TEST_DATABASE_URL')
assert database and visual_scope


@pytest.mark.asyncio
async def test_reading_persists_and_edits_without_changing_keys_or_other_rules(visual_scope):
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        teacher = await db.get(User, owner)
        request = DigitalizarEvaluacionExternaRequest(materia_id=subject, nombre='Cuencas y ríos',
            estructura_detectada={'preguntas': [{'numero': 1, 'enunciado': '¿Qué es una cuenca?', 'puntaje': '5'}],
                'respuestas_esperadas': [{'numero': 1, 'respuesta': 'Territorio que drena a un río'}],
                'reglas_feedback': {'lectura': 'Lectura original sobre los ríos.', 'tono': 'formativo'}})
        item = await service.digitalize_external_evaluation(db, request, teacher)
        identifier = item.id
        assert item.lectura == 'Lectura original sobre los ríos.'
        await service.update_evaluation(db, item, EvaluacionUpdate(lectura='Lectura corregida.', expected_updated_at=item.updated_at))
    async with sessions() as db:
        item = await service.get_evaluation_or_404(db, identifier)
        assert item.lectura == 'Lectura corregida.'
        assert item.blueprint.reglas_feedback['tono'] == 'formativo'
        assert item.respuestas_esperadas == request.estructura_detectada['respuestas_esperadas']
        assert item.nota_maxima == Decimal('5')


@pytest.mark.asyncio
async def test_reading_change_cannot_alter_context_of_legacy_submitted_grade(visual_scope):
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        identifier, _, _ = await legacy_evaluation(db, owner, subject)
        item = await service.get_evaluation_or_404(db, identifier)
        with pytest.raises(HTTPException) as caught:
            await service.update_evaluation(db, item, EvaluacionUpdate(lectura='Otro contexto'))
        assert caught.value.status_code == 409
        await db.rollback()
        preserved = await db.get(Evaluacion, identifier)
        assert preserved.lectura is None
