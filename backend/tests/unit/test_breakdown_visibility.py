from types import SimpleNamespace
from uuid import uuid4

from app.modules.calificaciones.breakdown_service import serialize_breakdown


def _breakdown():
    component = SimpleNamespace(
        id=uuid4(), clave='pregunta:1', orden=0, tipo='pregunta', numero='1', titulo='Pregunta 1',
        respuesta_estudiante='24', respuesta_referencia='24', puntos_obtenidos=1, puntos_maximos=1,
        estado='correcta', explicacion_verificable='Coincide con la clave.', explicacion_estudiante='Correcta.',
        origen='objetivo', requiere_revision=False, evidencia_json={'paginas': [1]}, valoraciones_json=[{'evaluador': 'A'}],
    )
    return SimpleNamespace(
        id=uuid4(), calificacion_id=uuid4(), version=1, origen='automatico', cobertura_estado='completa',
        puntos_obtenidos=1, puntos_posibles=1, nota_maxima=5, nota_base=5, ajuste_global=0,
        nota_antes_redondeo=5, regla_redondeo='half_up', decimales=2, nota_final=5,
        requiere_revision=False, bloqueos_json=[], procedencia_json={}, componentes=[component], created_at=None,
    )


def test_student_payload_redacts_answer_key_until_teacher_releases_it():
    payload = serialize_breakdown(_breakdown(), student=True, reveal_key=False)
    assert payload['componentes'][0]['respuesta_referencia'] is None
    assert payload['componentes'][0]['referencia_oculta'] is True
    assert 'valoraciones' not in payload['componentes'][0]


def test_teacher_release_exposes_only_public_reference_not_private_valuations():
    payload = serialize_breakdown(_breakdown(), student=True, reveal_key=True)
    assert payload['componentes'][0]['respuesta_referencia'] == '24'
    assert payload['componentes'][0]['referencia_oculta'] is False
    assert 'valoraciones' not in payload['componentes'][0]


def test_student_sees_global_adjustment_explanation_without_internal_reason():
    breakdown = _breakdown()
    breakdown.ajuste_global = 0.25
    breakdown.procedencia_json = {
        'ajuste_global_detalle': {
            'valor': 0.25,
            'motivo_interno': 'Corrección administrativa privada',
            'explicacion_estudiante': 'Se reconoció el procedimiento adicional.',
        }
    }
    student = serialize_breakdown(breakdown, student=True)
    assert student['ajuste_global_detalle'] == {
        'valor': 0.25,
        'explicacion_estudiante': 'Se reconoció el procedimiento adicional.',
    }
    assert 'motivo_interno' not in student['ajuste_global_detalle']

    teacher = serialize_breakdown(breakdown, student=False)
    assert teacher['ajuste_global_detalle']['motivo_interno'] == 'Corrección administrativa privada'