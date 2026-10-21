from copy import deepcopy
from decimal import Decimal
from types import SimpleNamespace as NS

from fastapi import HTTPException
import pytest

from app.modules.calificaciones import agents
from app.modules.calificaciones.breakdown_policy import calculate_formula, coverage_state, feedback_quality_guard
from app.modules.feedback_sharing.quality_policy import ensure_feedback_coherence


def component(**changes):
    return {"clave": "pregunta:1", "numero": "1", "estado": "correcta", "puntos_obtenidos": Decimal("1"), "puntos_maximos": Decimal("1"), "respuesta_estudiante": "Nico", "requiere_revision": False, **changes}


def test_global_model_score_never_replaces_component_sum_or_mutates_components():
    components = [component(puntos_obtenidos=Decimal("0.5"), estado="parcial")]
    before = deepcopy(components)
    formula = calculate_formula(components, 5)
    report = feedback_quality_guard(components=components, original_feedback="Identificaste una parte.", blockers=[], model_score=Decimal("5"), calculated_score=formula["nota_final"])
    assert formula["nota_final"] == Decimal("2.50")
    assert report["status"] == "blocked"
    assert components == before


def test_short_valid_answer_remains_full_credit_and_prompt_forbids_extra_demands():
    components = [component()]
    report = feedback_quality_guard(components=components, original_feedback="Identificaste al personaje principal.", blockers=[], model_score=Decimal("5"), calculated_score=Decimal("5"))
    assert report["status"] == "passed" and components[0]["puntos_obtenidos"] == 1
    prompt = agents.render_grader_prompt(agents.AgentContext(evaluacion_nombre="Lectura", nota_maxima=5, blueprint={"preguntas": [], "criterios": []}, student_response_text="Nico"))
    assert "No exijas que la respuesta repita el sujeto" in prompt
    assert "puntos explícitos a esa dimensión" in prompt


@pytest.mark.parametrize("state", ["ilegible", "no_evaluable", "revision_pendiente"])
def test_missing_evidence_is_pending_not_zero(state):
    item = component(estado=state, puntos_obtenidos=None, requiere_revision=True)
    original = deepcopy(item)
    coverage, blockers = coverage_state([item])
    assert coverage == "incompleta" and blockers
    assert item == original and item["puntos_obtenidos"] is None


def test_contradictory_feedback_is_not_shared_or_silently_rewritten():
    grade = NS(feedback="Trabajo perfecto, todo está correcto.")
    before = grade.feedback
    with pytest.raises(HTTPException) as exc:
        ensure_feedback_coherence(grade, [component(estado="incorrecta", puntos_obtenidos=0)])
    assert exc.value.status_code == 409 and grade.feedback == before


def test_provisional_feedback_requires_explicit_teacher_rewrite():
    grade = NS(feedback="Retroalimentación provisional: requiere revisión docente.")
    with pytest.raises(HTTPException):
        ensure_feedback_coherence(grade, [])
