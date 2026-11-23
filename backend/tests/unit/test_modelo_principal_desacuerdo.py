"""Spec 212: en un desacuerdo vale el modelo principal y las notas del verificador no bloquean."""
import asyncio
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.db.base import import_models
from app.modules.calificaciones.breakdown_policy import feedback_quality_guard, review_reasons_outside_breakdown
from app.modules.calificaciones.breakdown_service import _verifier_disputed_questions, create_automatic_breakdown

import_models()

BLUEPRINT = {
    "nota_maxima": 5,
    "preguntas": [
        {"numero": 1, "enunciado": "Explica la fotosíntesis", "puntaje": 2.5},
        {"numero": 2, "enunciado": "Nombra dos partes de la planta", "puntaje": 2.5},
    ],
}


class FakeDB:
    def __init__(self):
        self.values = [None, None]
        self.added = []

    async def scalar(self, _query):
        return self.values.pop(0)

    async def flush(self):
        return None

    def add(self, value):
        self.added.append(value)


def _component(number, score, state, explanation):
    return {"clave": f"pregunta:{number}", "respuesta_estudiante": "texto visible", "puntaje": score,
            "estado": state, "explicacion": explanation, "paginas": [1]}


def _raw(**changes):
    primary = [_component(1, 2.5, "correcta", "Explica la luz y el agua."), _component(2, 2.5, "correcta", "Nombra raíz y tallo.")]
    verifier = [_component(1, 1.0, "parcial", "Falta el dióxido de carbono."), _component(2, 2.5, "correcta", "Correcta.")]
    raw = {
        "orchestrator": "multi_agent_v2",
        "terminal_reason": "review_required",
        "verification_status": "complete",
        "objective_floor_applied": False,
        "objective_validation": [],
        "feedback_refinement": {"status": "skipped"},
        "evidence_coverage": {"requiere_revision": False, "faltantes": []},
        "graphic_uncertain_questions": [],
        "vision": {"extraction": {"requires_review": False}},
        "grader_a": {"nota": 5.0, "componentes": primary, "alertas": [], "requiere_revision_docente": False, "error_code": None},
        "grader_b": {"nota": 3.5, "componentes": verifier, "requiere_revision_docente": True, "error_code": None,
                     "alertas": ["Suma verificada dígito a dígito: 3.5/5.0.", "Pregunta 1: menciona luz y agua pero omite el CO2."]},
        "comparator": {"nota_final": 4.2, "discrepancia": True},
        "strategy": {"arbiter_invoked": True, "arbiter_reason": "component_discrepancy"},
    }
    raw.update(changes)
    return raw


def _grade(**changes):
    values = dict(id=uuid4(), nota_sugerida=4.2, nota_confirmada=None, feedback="Buen trabajo con la planta.",
                  resultado_json={}, revisado_por_docente=False, estado="requiere_revision")
    values.update(changes)
    return SimpleNamespace(**values)


@pytest.fixture(autouse=True)
def _explainable(monkeypatch):
    monkeypatch.setattr("app.modules.calificaciones.breakdown_service.settings.EXPLAINABLE_GRADING_GENERATION_ENABLED", True)


def _breakdown(grade, raw):
    return asyncio.run(create_automatic_breakdown(FakeDB(), calificacion=grade, blueprint=BLUEPRINT, raw_output=raw, pipeline_run_id="run-212"))


def test_disagreement_and_verifier_notes_leave_a_suggested_grade_with_the_primary_model_score():
    grade = _grade()
    breakdown = _breakdown(grade, _raw())

    first = breakdown.componentes[0]
    assert first.origen == "modelo_principal"
    assert first.puntos_obtenidos == Decimal("2.5")
    assert first.requiere_revision is False
    assert [item["evaluador"] for item in first.valoraciones_json] == ["A", "B"]
    assert breakdown.requiere_revision is False
    assert breakdown.bloqueos_json == []
    assert float(breakdown.nota_final) == 5.0
    assert float(grade.nota_sugerida) == 5.0  # la suma, no el 4,2 del comparador
    assert grade.estado == "sugerida"
    assert grade.nota_confirmada is None  # el docente sigue confirmando
    assert grade.resultado_json["revision_resuelta_por_desglose"] is True
    assert grade.resultado_json["requiere_revision_docente"] is False
    assert grade.resultado_json["feedback_quality_guard"]["status"] == "rebuilt"


@pytest.mark.parametrize(("changes", "reason"), [
    ({"grader_a": {**_raw()["grader_a"], "requiere_revision_docente": True}}, "principal_solicita_revision"),
    ({"verification_status": "pending"}, "segunda_revision_incompleta"),
    ({"objective_floor_applied": True}, "piso_objetivo"),
    ({"feedback_refinement": {"status": "draft"}}, "retroalimentacion_reescrita"),
    ({"vision": {"extraction": {"requires_review": True}}}, "lectura_requiere_revision"),
    ({"grader_b": {**_raw()["grader_b"], "nota": None}}, "evaluador_sin_nota"),
    ({"terminal_reason": None}, "sin_trazabilidad"),
])
def test_other_review_reasons_still_require_teacher_review(changes, reason):
    raw = _raw(**changes)
    assert reason in review_reasons_outside_breakdown(raw)

    grade = _grade()
    _breakdown(grade, raw)
    assert grade.estado == "requiere_revision"
    assert "revision_resuelta_por_desglose" not in grade.resultado_json


def test_verifier_and_comparator_signals_alone_are_not_reasons():
    assert review_reasons_outside_breakdown(_raw()) == []
    assert "principal_solicita_revision" in review_reasons_outside_breakdown({**_raw(), "grader_a": {"nota": 5}})


def test_a_concrete_verifier_objection_keeps_that_question_pending():
    grade = _grade()
    raw = _raw(grader_b={**_raw()["grader_b"], "alertas": ["P2: la clave no coincide con el texto de la lectura."]})
    breakdown = _breakdown(grade, raw)

    second = breakdown.componentes[1]
    assert second.puntos_obtenidos is None
    assert second.origen == "control_verificador"
    assert breakdown.requiere_revision is True
    assert grade.estado == "requiere_revision"


def test_teacher_decision_is_never_changed():
    grade = _grade(estado="confirmada", revisado_por_docente=True, nota_confirmada=3.0, nota_sugerida=3.0)
    _breakdown(grade, _raw())
    assert grade.estado == "confirmada"
    assert grade.nota_confirmada == 3.0


@pytest.mark.parametrize(("alert", "disputed"), [
    ("P2: la clave (C) no coincide con el orden de la lectura.", ["2"]),
    ("La nota excluye P4 hasta arbitraje; sumaría 4.5 si se confirma D.", ["4"]),
    ("P3: la opción B impresa dice 'La altitud', pero la clave dice 'La latitud'.", ["3"]),
    ("P1: respuesta correcta al identificar el denominador.", []),
    ("Suma verificada dígito a dígito: 4.0/5.0.", []),
])
def test_objection_detection(alert, disputed):
    assert _verifier_disputed_questions([alert]) == disputed


def test_guard_rebuilds_feedback_only_when_the_sum_is_authoritative():
    components = [{"numero": "1", "titulo": "Pregunta 1", "estado": "parcial", "puntos_obtenidos": Decimal("1"), "puntos_maximos": Decimal("2"),
                   "explicacion_estudiante": "Falta un paso.", "evidencia_json": {"orientacion_mejora": "Revisa el paso 2."}}]
    args = dict(components=components, original_feedback="Bien.", blockers=[], model_score=Decimal("4"), calculated_score=Decimal("2.5"))
    assert feedback_quality_guard(**args)["status"] == "blocked"
    rebuilt = feedback_quality_guard(**args, sum_is_authoritative=True)
    assert rebuilt["status"] == "rebuilt"
    assert not rebuilt["visible_feedback"].startswith("Retroalimentación provisional")
    assert feedback_quality_guard(**{**args, "blockers": ["componente_pendiente:pregunta:1"]}, sum_is_authoritative=True)["status"] == "blocked"
