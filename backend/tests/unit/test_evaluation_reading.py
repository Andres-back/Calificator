from decimal import Decimal
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.modules.evaluaciones.digitalize_service import normalize_detected_structure
from app.modules.evaluaciones.reading_service import evaluation_reading, normalize_reading
from app.modules.evaluaciones.schemas import EvaluacionUpdate
from app.modules.evaluaciones.service import _student_safe_evaluation


def test_reading_works_for_orm_and_frozen_snapshot_without_exposing_rules():
    rules = {'lectura': 'El agua recorre la cuenca.\n\nLlega al río.', 'clave': 'privada'}
    assert evaluation_reading(SimpleNamespace(blueprint=SimpleNamespace(reglas_feedback=rules))) == rules['lectura']
    assert evaluation_reading({'blueprint': {'reglas_feedback': rules}}) == rules['lectura']
    assert evaluation_reading(SimpleNamespace(blueprint=None)) is None
    assert evaluation_reading({'blueprint': {'reglas_feedback': {'lectura': ['no texto']}}}) is None


def test_reading_update_is_optional_clearable_and_bounded():
    assert 'lectura' not in EvaluacionUpdate(nombre='Prueba').model_dump(exclude_unset=True)
    assert EvaluacionUpdate(lectura=None).model_dump(exclude_unset=True) == {'lectura': None}
    assert normalize_reading('  \n ') is None
    with pytest.raises(ValidationError):
        EvaluacionUpdate(lectura='a' * 60_001)
    with pytest.raises(ValueError, match='lectura'):
        normalize_reading('a' * 60_001)


def test_student_projection_gets_only_reading_not_private_blueprint():
    from app.modules.evaluaciones.models import Evaluacion, EvaluacionBlueprint
    from uuid import uuid4
    from datetime import datetime
    evaluation = Evaluacion(id=uuid4(), materia_id=uuid4(), profesor_id=uuid4(), nombre='Ríos',
        descripcion=None, tipo_origen='externa_digitalizada', modalidad='fisica', estado='publicada',
        nota_maxima=Decimal('5'), dba_ids=[], dba_personalizado_ids=[], metas_profesor=[], criterios=[],
        preguntas=[{'numero': 1, 'enunciado': '¿Dónde nace el río?', 'respuesta_correcta': 'secreto'}],
        respuestas_esperadas=[{'numero': 1, 'respuesta': 'secreto'}], created_at=datetime.now(), updated_at=datetime.now())
    evaluation.blueprint = EvaluacionBlueprint(reglas_feedback={'lectura': 'La cuenca y el río.', 'clave': 'secreto'})
    result = _student_safe_evaluation(evaluation)
    assert result['lectura'] == 'La cuenca y el río.'
    assert result['blueprint'] is None
    assert 'secreto' not in str(result)


def test_digitalization_keeps_reading_apart_from_questions_and_student_annotations():
    result = normalize_detected_structure({
        'lectura': 'Los ríos nacen en las montañas.\n[RESPUESTA DEL ESTUDIANTE: secreto]',
        'preguntas': [{'numero': 1, 'tipo': 'abierta', 'enunciado': '¿Dónde nacen?', 'puntaje': 1}],
        'respuestas_esperadas': [{'numero': 1, 'respuesta': 'En las montañas'}],
        'reglas_feedback': {'tono': 'formativo'},
    }, nota_maxima=Decimal('5'))
    assert result['reglas_feedback']['lectura'] == 'Los ríos nacen en las montañas.'
    assert result['reglas_feedback']['tono'] == 'formativo'
    assert len(result['preguntas']) == 1
    assert 'secreto' not in str(result)
