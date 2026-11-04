from decimal import Decimal

import pytest

from app.modules.calificaciones.breakdown_policy import (
    build_component_scaffold,
    calculate_formula,
    component_consensus,
    coverage_state,
)


def scaffold():
    return build_component_scaffold(
        {
            "nota_maxima": 5,
            "preguntas": [
                {"id": "first", "numero": 1, "tipo": "opcion_multiple", "puntaje": "1.25"},
                {"id": "second", "numero": 1, "tipo": "verdadero_falso", "puntaje": "0.375"},
                {"id": "open", "numero": 2, "tipo": "abierta", "puntaje": "3.375"},
            ],
        }
    )


def resolution(key, correct, *, reason=None, page=2):
    return {
        "clave": key,
        "numero": 1,
        "correcta": correct,
        "motivo": reason or ("coincide_clave" if correct else "no_coincide_clave"),
        "respuesta_detectada": "B" if correct is not None else None,
        "respuesta_esperada": "B" if correct else "A",
        "paginas": [page],
        "fuente": "clave_oficial",
    }


def test_objective_resolution_respects_saved_weights_and_canonical_keys():
    open_valuation = {
        "clave": "pregunta:open",
        "puntaje": "2.50",
        "estado": "parcial",
        "explicacion": "Falta justificar.",
        "paginas": [1],
    }
    components, blockers = component_consensus(
        scaffold(),
        [open_valuation],
        [open_valuation],
        objective_resolution_v1=[
            resolution("pregunta:second", False),
            resolution("pregunta:first", True, page=1),
        ],
    )
    assert not blockers
    assert [item["puntos_obtenidos"] for item in components] == [
        Decimal("1.25"), Decimal("0"), Decimal("2.50")
    ]
    assert [item["origen"] for item in components] == ["objetivo", "objetivo", "consenso_ia"]
    assert components[0]["explicacion_verificable"] == "Coincide con la clave."
    assert components[1]["explicacion_verificable"] == "No coincide con la clave."
    assert components[1]["respuesta_referencia"] == "A"
    assert components[1]["evidencia_json"]["paginas"] == [2]
    assert calculate_formula(components, 5)["nota_final"] == Decimal("3.75")


@pytest.mark.parametrize(
    ("candidate", "opts", "state"),
    [
        (None, {}, "revision_pendiente"),
        (True, {"verifier_disputed_questions": [1]}, "revision_pendiente"),
        (False, {"graphic_uncertain_questions": ["pregunta:first"]}, "no_evaluable"),
    ],
)
def test_review_blockers_prevent_scores_even_with_legacy_match(candidate, opts, state):
    components, blockers = component_consensus(
        scaffold()[:1],
        [{"clave": "pregunta:first", "puntaje": 0, "estado": "incorrecta", "paginas": [7]}],
        [],
        [{"numero": 1, "correcta": True}],
        objective_resolution_v1=[
            resolution("pregunta:first", candidate, reason="lectura_ambigua")
        ],
        **opts,
    )
    component = components[0]
    assert component["puntos_obtenidos"] is None
    assert component["estado"] == state
    assert component["evidencia_json"]["paginas"] == [2]
    assert blockers == ["componente_pendiente:pregunta:first"]
    assert coverage_state(components)[0] == "incompleta"


def test_duplicate_resolution_fails_closed_and_does_not_offer_legacy_reference():
    components, _ = component_consensus(
        scaffold()[:1],
        [],
        [],
        objective_resolution_v1=[
            resolution("pregunta:first", True, page=1),
            resolution("pregunta:first", False, page=2),
        ],
    )
    assert components[0]["puntos_obtenidos"] is None
    assert components[0]["respuesta_estudiante"] is None
    assert components[0]["respuesta_referencia"] is None
    assert components[0]["evidencia_json"]["paginas"] == [1, 2]
    assert "una sola pregunta" in components[0]["explicacion_verificable"]


def test_disabled_candidate_keeps_original_matching_rule():
    components, blockers = component_consensus(
        scaffold()[:1], [], [], [{"numero": 1, "correcta": True, "respuesta_detectada": "B"}]
    )
    assert not blockers
    assert components[0]["puntos_obtenidos"] == Decimal("1.25")


@pytest.mark.parametrize("model_state", ["ilegible", "no_evaluable", "revision_pendiente", "sin_respuesta"])
def test_a_contradictory_evidence_assessment_prevents_deterministic_zero(model_state):
    components, blockers = component_consensus(scaffold()[:1],
        [{"clave": "pregunta:first", "estado": model_state, "puntaje": 0}], [],
        objective_resolution_v1=[resolution("pregunta:first", False)])
    assert components[0]["puntos_obtenidos"] is None
    assert components[0]["requiere_revision"]
    assert blockers == ["componente_pendiente:pregunta:first"]
