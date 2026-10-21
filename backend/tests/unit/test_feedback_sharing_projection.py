from copy import deepcopy
from decimal import Decimal
from types import SimpleNamespace as NS
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.modules.feedback_sharing.projection import build_projection
from app.modules.feedback_sharing.schemas import AccessCreate, PreviewInput


def source():
    grade = NS(id=uuid4(), estudiante_id=uuid4(), evaluacion_id=uuid4(), materia_id=uuid4(), estado="confirmada", nota_confirmada=Decimal("3"), revisado_por_docente=True, feedback="Reconociste al personaje. Relee la emoción del protagonista.", resultado_json={"secret": "no compartir", "nota_modelo": 5}, entrega_id=None)
    evaluation = NS(id=grade.evaluacion_id, materia_id=grade.materia_id, nombre="Lectura", nota_maxima=Decimal("5"), recepcion_habilitada=True, blueprint=None, preguntas=[], criterios=[], metas_profesor=[])
    return grade, evaluation


def test_historical_manual_grade_does_not_need_delivery_or_regrade():
    grade, evaluation = source()
    before = deepcopy(vars(grade))
    result = build_projection(grade, evaluation, "Ana Pérez", "Lenguaje", None)
    assert result.payload["nota"] == "3"
    assert result.payload["respuestas"] == []
    assert "explicación por pregunta" in result.payload["explicacion"]
    assert "secret" not in str(result.payload)
    assert vars(grade) == before


@pytest.mark.parametrize("field,value", [("estado", "sugerida"), ("revisado_por_docente", False), ("nota_confirmada", None), ("feedback", " ")])
def test_pending_or_empty_feedback_is_not_shareable(field, value):
    grade, evaluation = source()
    setattr(grade, field, value)
    with pytest.raises(HTTPException) as exc:
        build_projection(grade, evaluation, "Ana", "Lectura", None)
    assert exc.value.status_code == 409


def test_zero_is_valid_and_missing_is_not_zero():
    grade, evaluation = source()
    grade.nota_confirmada = Decimal("0")
    assert build_projection(grade, evaluation, "Ana", "Lectura", None).payload["nota"] == "0"


def test_fingerprint_changes_on_feedback_score_or_solution_policy():
    grade, evaluation = source()
    first = build_projection(grade, evaluation, "Ana", "Lectura", None)
    grade.feedback = "Nueva orientación autorizada."
    second = build_projection(grade, evaluation, "Ana", "Lectura", None)
    assert second.fingerprint != first.fingerprint
    evaluation.recepcion_habilitada = False
    assert build_projection(grade, evaluation, "Ana", "Lectura", None).fingerprint != second.fingerprint


def test_breakdown_projection_never_contains_unreleased_key_or_private_metadata(monkeypatch):
    grade, evaluation = source()
    breakdown = NS(id=uuid4(), version=2, cobertura_estado="completa", requiere_revision=False, nota_final=Decimal("3"), bloqueos_json=[])
    monkeypatch.setattr("app.modules.feedback_sharing.projection.serialize_breakdown", lambda *args, **kw: {"componentes": [{"clave": "p1", "numero": "1", "titulo": "Personaje", "respuesta_estudiante": "Nico", "respuesta_referencia": "SECRET_KEY", "puntos_obtenidos": Decimal("1"), "puntos_maximos": Decimal("1"), "estado": "correcta", "explicacion": "Identificó al personaje.", "procedencia": "PRIVATE_PROMPT", "fuentes": ["private"]}]})
    result = build_projection(grade, evaluation, "Ana", "Lectura", breakdown)
    assert "SECRET_KEY" not in str(result.payload)
    assert "PRIVATE_PROMPT" not in str(result.payload)
    assert result.payload["respuestas"][0]["respuesta_estudiante"] == "Nico"


@pytest.mark.parametrize("change", [{"nota_final": Decimal("4")}, {"cobertura_estado": "incompleta"}, {"requiere_revision": True}])
def test_inconsistent_breakdown_cannot_be_shared(change):
    grade, evaluation = source()
    values = dict(id=uuid4(), version=1, cobertura_estado="completa", requiere_revision=False, nota_final=Decimal("3"), bloqueos_json=[])
    values.update(change)
    with pytest.raises(HTTPException):
        build_projection(grade, evaluation, "Ana", "Lectura", NS(**values))


def test_duration_and_scope_inputs_are_strict_and_bounded():
    entry = {"calificacion_id": str(uuid4()), "fingerprint": "a" * 64}
    assert AccessCreate(request_id=uuid4(), selecciones=[entry]).duracion_dias == 3
    for duration in (0, 31, True, "3"):
        with pytest.raises(ValueError):
            AccessCreate(request_id=uuid4(), selecciones=[entry], duracion_dias=duration)
    with pytest.raises(ValueError):
        PreviewInput(calificacion_ids=[entry["calificacion_id"]] * 2)
    with pytest.raises(ValueError):
        AccessCreate(request_id=uuid4(), selecciones=[entry], familia="Pérez")
