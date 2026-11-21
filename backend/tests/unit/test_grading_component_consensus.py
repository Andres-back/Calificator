from decimal import Decimal

from app.modules.calificaciones.breakdown_policy import build_component_scaffold, component_consensus


def test_212_disagreement_uses_the_primary_model_per_question():
    # Totales iguales no ocultan el desacuerdo: cada pregunta toma la valoración del modelo principal.
    scaffold = build_component_scaffold({"nota_maxima": 5, "preguntas": [{"numero": 1, "puntaje": 2}, {"numero": 2, "puntaje": 3}]})
    a = [{"clave": "pregunta:1", "puntaje": 2, "estado": "correcta", "explicacion": "A1"}, {"clave": "pregunta:2", "puntaje": 1, "estado": "parcial", "explicacion": "A2"}]
    b = [{"clave": "pregunta:1", "puntaje": 1, "estado": "parcial", "explicacion": "B1"}, {"clave": "pregunta:2", "puntaje": 2, "estado": "parcial", "explicacion": "B2"}]
    components, blockers = component_consensus(scaffold, a, b)
    assert [item["puntos_obtenidos"] for item in components] == [Decimal("2"), Decimal("1")]
    assert [item["estado"] for item in components] == ["correcta", "parcial"]
    assert [item["explicacion_verificable"] for item in components] == ["A1", "A2"]
    assert all(item["origen"] == "modelo_principal" and item["requiere_revision"] is False for item in components)
    assert all([v["evaluador"] for v in item["valoraciones_json"]] == ["A", "B"] for item in components)
    assert blockers == []


def test_objective_correct_answer_always_gets_full_points():
    scaffold = build_component_scaffold({"nota_maxima": 5, "preguntas": [{"numero": 1, "puntaje": 5}]})
    components, _ = component_consensus(scaffold, [{"clave": "pregunta:1", "puntaje": 2, "estado": "parcial"}], [], [{"numero": "1", "correcta": True, "respuesta_detectada": "12"}])
    assert components[0]["puntos_obtenidos"] == Decimal("5")
    assert components[0]["origen"] == "objetivo"


def test_unconfirmed_graphic_cannot_keep_a_model_assigned_zero():
    scaffold = build_component_scaffold({
        "nota_maxima": 5,
        "preguntas": [{"numero": 4, "enunciado": "Dibuja una tangente", "puntaje": 5}],
    })
    valuation = [{
        "clave": "pregunta:4",
        "puntaje": 0,
        "estado": "sin_respuesta",
        "explicacion": "No se observa dibujo en el texto extraído.",
    }]

    components, blockers = component_consensus(
        scaffold, valuation, valuation, graphic_uncertain_questions=[4],
    )

    assert components[0]["puntos_obtenidos"] is None
    assert components[0]["estado"] == "no_evaluable"
    assert components[0]["requiere_revision"] is True
    assert "componente_pendiente:pregunta:4" in blockers


def test_verifier_dispute_blocks_a_zero_even_when_both_component_scores_are_zero():
    scaffold = build_component_scaffold({
        "nota_maxima": 5,
        "preguntas": [{"numero": 3, "enunciado": "Calcula la altura h", "puntaje": 5}],
    })
    zero = [{"clave": "pregunta:3", "puntaje": 0, "estado": "incorrecta", "explicacion": "Clave 525."}]

    components, blockers = component_consensus(
        scaffold, zero, zero, verifier_disputed_questions=[3],
    )

    assert components[0]["puntos_obtenidos"] is None
    assert components[0]["estado"] == "revision_pendiente"
    assert components[0]["requiere_revision"] is True
    assert "componente_pendiente:pregunta:3" in blockers


def test_212_verifier_unable_to_value_keeps_the_primary_valuation_not_an_average():
    scaffold = build_component_scaffold({
        "nota_maxima": 5,
        "preguntas": [{"numero": 3, "enunciado": "Calcula la altura h", "puntaje": 5}],
    })
    primary = [{"clave": "pregunta:3", "puntaje": 0, "estado": "incorrecta", "explicacion": "No coincide."}]
    verifier = [{"clave": "pregunta:3", "estado": "no_evaluable"}]

    components, blockers = component_consensus(scaffold, primary, verifier)

    assert components[0]["puntos_obtenidos"] == Decimal("0")
    assert components[0]["estado"] == "incorrecta"
    assert components[0]["origen"] == "modelo_principal"
    assert blockers == []


def test_212_primary_model_unable_to_value_keeps_the_question_pending():
    scaffold = build_component_scaffold({"nota_maxima": 5, "preguntas": [{"numero": 3, "puntaje": 5}]})
    primary = [{"clave": "pregunta:3", "estado": "no_evaluable"}]
    verifier = [{"clave": "pregunta:3", "puntaje": 5, "estado": "correcta"}]

    components, blockers = component_consensus(scaffold, primary, verifier)

    assert components[0]["puntos_obtenidos"] is None
    assert components[0]["estado"] == "revision_pendiente"
    assert components[0]["origen"] == "consenso_ia"
    assert "componente_pendiente:pregunta:3" in blockers


def test_212_verifier_objection_still_overrides_the_primary_model():
    scaffold = build_component_scaffold({"nota_maxima": 5, "preguntas": [{"numero": 2, "puntaje": 5}]})
    primary = [{"clave": "pregunta:2", "puntaje": 0, "estado": "incorrecta"}]
    verifier = [{"clave": "pregunta:2", "puntaje": 5, "estado": "correcta"}]

    components, blockers = component_consensus(scaffold, primary, verifier, verifier_disputed_questions=["2"])

    assert components[0]["puntos_obtenidos"] is None
    assert components[0]["origen"] == "control_verificador"
    assert "componente_pendiente:pregunta:2" in blockers
