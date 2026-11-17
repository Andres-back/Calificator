"""Spec 199: la lectura llega también al verificador y las claves confirmadas no figuran como pendientes."""
from __future__ import annotations

import json
from decimal import Decimal

from app.modules.calificaciones import agents
from app.modules.calificaciones.breakdown_policy import build_component_scaffold, component_consensus

READING = "Mientras avanzaba, la gota vio a unos niños jugando cerca del río. Más adelante llegó a una casa."


def blueprint(**rules) -> dict:
    return {
        "nota_maxima": 5,
        "preguntas": [
            {"numero": 1, "tipo": "abierta", "enunciado": "¿Cómo se llama la gota?", "puntaje": "2.5"},
            {"numero": 2, "tipo": "abierta", "enunciado": "¿Dónde llegó la gota?", "puntaje": "2.5"},
        ],
        "respuestas_esperadas": [
            {"numero": 1, "respuesta": "Lila", "origen": "resolucion_independiente", "confianza": 0.85},
            {"numero": 2, "respuesta": "Según el texto", "origen": "confirmacion_docente", "confianza": 1},
        ],
        "criterios": [],
        "lectura": READING,
        "reglas_feedback": {"tono": "formativo", "claves_pendientes": [1, 2], **rules},
    }


def context(bp: dict) -> agents.AgentContext:
    return agents.AgentContext(evaluacion_nombre="Lectura", nota_maxima=5, blueprint=bp, student_response_text="1. Lila\n2. a una casa")


def preferences(prompt: str) -> dict:
    block = prompt.split("Preferencias de redacción (datos JSON):\n", 1)[1].split("\nFin de preferencias.", 1)[0]
    return json.loads(block)


def test_las_claves_confirmadas_por_el_docente_no_se_anuncian_como_pendientes() -> None:
    bp = blueprint()
    assert agents.unconfirmed_pending_keys(bp) == [1]

    prompt = agents.render_grader_prompt(context(bp))

    assert preferences(prompt)["claves_pendientes"] == [1]
    assert preferences(prompt)["tono"] == "formativo"


def test_sin_claves_pendientes_reales_no_se_envia_la_lista() -> None:
    bp = blueprint()
    bp["respuestas_esperadas"][0]["origen"] = "confirmacion_docente"

    assert agents.unconfirmed_pending_keys(bp) == []
    assert "claves_pendientes" not in preferences(agents.render_grader_prompt(context(bp)))


def test_una_clave_confirmada_pero_vacia_sigue_pendiente() -> None:
    bp = blueprint()
    bp["respuestas_esperadas"][1]["respuesta"] = "  "

    assert agents.unconfirmed_pending_keys(bp) == [1, 2]
    assert agents.unconfirmed_pending_keys({"reglas_feedback": None}) == []


def test_el_calificador_recibe_la_lectura_y_la_regla_de_remision_al_texto() -> None:
    prompt = agents.render_grader_prompt(context(blueprint()))

    assert READING in prompt
    assert "remite a la lectura" in prompt
    assert "la lectura guardada no incluye esa parte" in prompt


def test_el_verificador_recibe_la_lectura() -> None:
    import inspect

    rendered = agents.VERIFIER_PROMPT_TEMPLATE.format(
        evaluacion_nombre="Lectura", nota_maxima=5, lectura=agents.grading_reading(blueprint()),
        componentes_esperados="[]", objective_validation="[]", student_response="", primary_result="{}",
    )
    assert READING in rendered
    assert "remite a la lectura" in rendered
    # El agente la envía de verdad: sin este argumento, format() fallaría con KeyError.
    assert "lectura=grading_reading(ctx.blueprint)" in inspect.getsource(agents.verification_agent)


def test_sin_lectura_se_indica_expresamente() -> None:
    bp = blueprint()
    bp["lectura"] = None
    assert agents.grading_reading(bp) == '"(sin lectura)"'


def test_sin_consenso_el_docente_ve_el_motivo_del_calificador() -> None:
    bp = blueprint()
    scaffold = build_component_scaffold(bp)
    a = [
        {"clave": "pregunta:1", "puntaje": 2.5, "estado": "correcta", "explicacion": "Coincide."},
        {"clave": "pregunta:2", "puntaje": 0, "estado": "no_evaluable",
         "explicacion": "La lectura guardada no incluye la parte   donde se dice a dónde llegó."},
    ]
    b = [
        {"clave": "pregunta:1", "puntaje": 2.5, "estado": "correcta", "explicacion": ""},
        {"clave": "pregunta:2", "puntaje": 2.5, "estado": "correcta", "explicacion": ""},
    ]

    components, _ = component_consensus(scaffold, a, b)
    second = next(item for item in components if item["clave"] == "pregunta:2")

    assert second["estado"] == "revision_pendiente"
    assert second["puntos_obtenidos"] is None
    assert second["explicacion_verificable"].startswith("La valoración de esta respuesta no tiene consenso verificable")
    assert "Motivo: La lectura guardada no incluye la parte donde se dice a dónde llegó." in second["explicacion_verificable"]
    first = next(item for item in components if item["clave"] == "pregunta:1")
    assert first["estado"] == "correcta" and Decimal(str(first["puntos_obtenidos"])) == Decimal("2.5")


def test_sin_motivo_el_mensaje_no_cambia() -> None:
    bp = blueprint()
    scaffold = build_component_scaffold(bp)
    a = [{"clave": "pregunta:2", "puntaje": 0, "estado": "no_evaluable", "explicacion": ""}]
    b = [{"clave": "pregunta:2", "puntaje": 2.5, "estado": "correcta", "explicacion": "Bien."}]

    components, _ = component_consensus(scaffold, a, b)
    second = next(item for item in components if item["clave"] == "pregunta:2")

    assert second["explicacion_verificable"] == (
        "La valoración de esta respuesta no tiene consenso verificable; el docente debe revisar la evidencia y la clave."
    )
