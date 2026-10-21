from copy import deepcopy
from decimal import Decimal
from types import SimpleNamespace

from fastapi import HTTPException
import pytest

from app.modules.calificaciones.feedback_usefulness import assess_feedback_usefulness, is_generic_feedback
from app.modules.feedback_sharing.quality_policy import ensure_feedback_coherence


@pytest.mark.parametrize("text", [
    "Buen trabajo. Sigue practicando.", "¡Muy bien! Sigue así.",
    "Debes mejorar en matemáticas.", "Estudia más y esfuérzate.",
    "Pregunta 2: revisa tus respuestas. Sigue practicando.",
    "Trabajo perfecto. Todas las respuestas están correctas.",
])
def test_generic_praise_or_subject_name_is_not_useful_feedback(text):
    assert is_generic_feedback(text)
    report = assess_feedback_usefulness(text, [])
    assert report["status"] == "needs_review" and "feedback_generico" in report["reasons"]
    assert report["academic_correctness_verified"] is False


@pytest.mark.parametrize("text", [
    "Alinea las comas antes de sumar.",
    "En la pregunta 2 copiaste una comparación de las nubes, pero se pedía una emoción. Relee la primera frase y subraya cómo se sentía Nico.",
    "En la pregunta 1 identificaste a Nico como personaje principal.",
    "No puedo leer con seguridad el segundo resultado de la foto. Pide al docente que revise esa parte antes de practicarla.",
])
def test_specific_short_or_uncertain_explanation_is_not_rejected_by_length(text):
    assert not is_generic_feedback(text)


def test_component_diagnostics_are_advisory_not_scores_or_academic_judgment():
    components = [{"numero": "2", "estado": "incorrecta", "puntos_obtenidos": Decimal("0"),
                   "explicacion": "Incorrecta", "orientacion_mejora": "Estudia más"}]
    before = deepcopy(components)
    report = assess_feedback_usefulness("En la pregunta 2 falta explicar la emoción del protagonista.", components)
    assert report["status"] == "needs_review"
    assert report["sin_explicacion_concreta"] == ["2"]
    assert report["sin_siguiente_paso"] == ["2"]
    assert report["requires_teacher_validation"] is True
    assert "score" not in report and "passed" not in report
    assert components == before


def test_complete_work_does_not_require_inventing_an_error_or_homework():
    report = assess_feedback_usefulness("En la pregunta 1 identificaste a Nico como personaje principal.", [
        {"numero": "1", "estado": "correcta", "explicacion": "Identificaste a Nico como personaje principal."},
    ])
    assert report["status"] == "no_obvious_gaps"
    assert report["sin_siguiente_paso"] == []


def test_unreadable_evidence_is_not_classified_as_student_error():
    report = assess_feedback_usefulness("La segunda respuesta no se alcanza a leer con seguridad.", [
        {"numero": "2", "estado": "ilegible", "puntos_obtenidos": None},
    ])
    assert report["evidencia_pendiente"] == ["2"]
    assert report["sin_siguiente_paso"] == []


def test_share_gate_rejects_only_clear_generic_boilerplate_without_rewriting():
    grade = SimpleNamespace(feedback="Buen trabajo. Sigue practicando.")
    with pytest.raises(HTTPException) as exc:
        ensure_feedback_coherence(grade, [])
    assert exc.value.status_code == 409 and "concreta" in exc.value.detail
    assert grade.feedback == "Buen trabajo. Sigue practicando."
