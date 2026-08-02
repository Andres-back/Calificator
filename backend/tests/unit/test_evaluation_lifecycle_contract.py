from __future__ import annotations

import asyncio
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.calificaciones import service as grading_service
from app.modules.evaluaciones import service as evaluation_service
from app.shared.enums import EvaluacionEstado, EvaluacionModalidad, UserRole


def _evaluation(
    *,
    state: str = EvaluacionEstado.BORRADOR.value,
    reception_enabled: bool = False,
) -> SimpleNamespace:
    now = datetime(2026, 8, 1, 12, 0, 0)
    return SimpleNamespace(
        id=uuid4(),
        materia_id=uuid4(),
        profesor_id=uuid4(),
        material_origen_id=uuid4(),
        tipo_actividad="examen",
        nombre="Multiplicacion - cuarto",
        descripcion="Evaluacion creada desde un material generado.",
        tipo_origen="nativa",
        modalidad=EvaluacionModalidad.MIXTA.value,
        nota_maxima=Decimal("5"),
        estado=state,
        recepcion_habilitada=reception_enabled,
        fecha_publicacion=now,
        politica_intento="un_intento",
        intentos_permitidos=1,
        tiempo_limite_minutos=None,
        dba_ids=[],
        dba_personalizado_ids=[],
        metas_profesor=[],
        criterios=[],
        preguntas=[
            {
                "numero": 1,
                "tipo": "opcion_multiple",
                "enunciado": "Cuanto es 4 x 9?",
                "modalidad_respuesta": "online",
                "respuesta_correcta": "B) 36",
                "respuesta_esperada": "B) 36",
                "solucion": "Multiplicar cuatro por nueve.",
                "opciones": [
                    {"texto": "A) 32", "correcta": False, "es_correcta": False},
                    {"texto": "B) 36", "correcta": True, "es_correcta": True},
                ],
                "metadata": {
                    "clave": "B",
                    "clave_respuesta": "B) 36",
                    "answer": "B) 36",
                },
            },
            {
                "numero": 2,
                "tipo": "abierta",
                "enunciado": "Muestra el procedimiento.",
                "modalidad_respuesta": "fisica",
            },
        ],
        respuestas_esperadas=[{"numero": 1, "respuesta": "B) 36"}],
        created_at=now,
        updated_at=now,
        blueprint=None,
    )


def _assert_student_payload_has_no_answer_keys(value: object) -> None:
    forbidden = {
        "answer",
        "clave",
        "clave_respuesta",
        "correcta",
        "es_correcta",
        "respuesta_correcta",
        "respuesta_esperada",
        "solucion",
        "soluciones",
    }
    if isinstance(value, dict):
        assert forbidden.isdisjoint(value)
        for nested in value.values():
            _assert_student_payload_has_no_answer_keys(nested)
    elif isinstance(value, list):
        for nested in value:
            _assert_student_payload_has_no_answer_keys(nested)


@pytest.mark.parametrize(
    "state, reception_enabled, accepted",
    [
        (EvaluacionEstado.BORRADOR.value, False, False),
        (EvaluacionEstado.BORRADOR.value, True, False),
        (EvaluacionEstado.PUBLICADA.value, False, False),
        (EvaluacionEstado.PUBLICADA.value, True, True),
        (EvaluacionEstado.EN_CALIFICACION.value, False, False),
        (EvaluacionEstado.EN_CALIFICACION.value, True, True),
        (EvaluacionEstado.PENDIENTE_REVISION.value, False, False),
        (EvaluacionEstado.PENDIENTE_REVISION.value, True, True),
        (EvaluacionEstado.CERRADA.value, False, False),
        (EvaluacionEstado.CERRADA.value, True, False),
    ],
)
def test_grading_reception_requires_both_a_live_state_and_the_explicit_switch(
    state: str,
    reception_enabled: bool,
    accepted: bool,
) -> None:
    evaluation = _evaluation(state=state, reception_enabled=reception_enabled)

    if accepted:
        grading_service.ensure_evaluation_accepts_grading(evaluation)
        return

    with pytest.raises(HTTPException) as exc:
        grading_service.ensure_evaluation_accepts_grading(evaluation)
    assert exc.value.status_code == 409


def test_student_safe_payload_recursively_removes_answer_keys_and_keeps_lifecycle_context() -> None:
    evaluation = _evaluation(
        state=EvaluacionEstado.PUBLICADA.value,
        reception_enabled=False,
    )

    safe = evaluation_service._student_safe_evaluation(evaluation)

    assert safe["respuestas_esperadas"] == []
    assert safe["recepcion_habilitada"] is False
    assert safe["material_origen_id"] == evaluation.material_origen_id
    assert safe["tipo_actividad"] == "examen"
    assert len(safe["preguntas"]) == 2
    _assert_student_payload_has_no_answer_keys(safe["preguntas"])


@pytest.mark.parametrize(
    "state, visible",
    [
        (EvaluacionEstado.BORRADOR.value, False),
        (EvaluacionEstado.PUBLICADA.value, True),
        (EvaluacionEstado.EN_CALIFICACION.value, True),
        (EvaluacionEstado.PENDIENTE_REVISION.value, True),
        (EvaluacionEstado.CERRADA.value, True),
    ],
)
def test_enrolled_student_detail_visibility_follows_the_lifecycle(
    monkeypatch,
    state: str,
    visible: bool,
) -> None:
    evaluation = _evaluation(state=state, reception_enabled=False)
    student = SimpleNamespace(id=uuid4(), rol=UserRole.ESTUDIANTE.value)

    async def get_evaluation(_db, evaluation_id):
        assert evaluation_id == evaluation.id
        return evaluation

    async def enrolled(_db, materia_id, student_id):
        assert materia_id == evaluation.materia_id
        assert student_id == student.id
        return True

    monkeypatch.setattr(evaluation_service, "get_evaluation_or_404", get_evaluation)
    monkeypatch.setattr(evaluation_service, "is_student_enrolled", enrolled)

    if visible:
        result = asyncio.run(
            evaluation_service.ensure_can_read_evaluation(
                object(), evaluation.id, student
            )
        )
        assert isinstance(result, dict)
        assert result["estado"] == state
        return

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            evaluation_service.ensure_can_read_evaluation(
                object(), evaluation.id, student
            )
        )
    assert exc.value.status_code == 403


def test_student_list_query_includes_every_visible_lifecycle_state(monkeypatch) -> None:
    captured: dict[str, object] = {}
    student = SimpleNamespace(id=uuid4(), rol=UserRole.ESTUDIANTE.value)

    class FakeDB:
        async def scalars(self, statement):
            captured["statement"] = statement
            return []

    async def can_read(_db, materia_id, user):
        assert materia_id is not None
        assert user is student

    monkeypatch.setattr(evaluation_service, "ensure_can_read_materia", can_read)

    result = asyncio.run(
        evaluation_service.list_evaluations_for_materia(
            FakeDB(), uuid4(), student
        )
    )

    assert result == []
    params = captured["statement"].compile().params
    visible_states = next(
        set(value)
        for value in params.values()
        if isinstance(value, list) and EvaluacionEstado.PUBLICADA.value in value
    )
    assert visible_states == {
        EvaluacionEstado.PUBLICADA.value,
        EvaluacionEstado.EN_CALIFICACION.value,
        EvaluacionEstado.PENDIENTE_REVISION.value,
        EvaluacionEstado.CERRADA.value,
    }
