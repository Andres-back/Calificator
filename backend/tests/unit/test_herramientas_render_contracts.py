from __future__ import annotations

import pytest

from app.modules.herramientas.pdf_render import _RENDERERS, render_material_html


RENDERABLE_TYPES = {
    "crucigrama",
    "sopa_letras",
    "unir_columnas",
    "emparejar",
    "cuento",
    "para_colorear",
    "guia",
    "taller",
    "examen",
    "rubrica",
    "plan_refuerzo",
    "lectura_comprensiva",
    "quiz_rapido",
    "ficha",
    "flashcards",
    "mapa_conceptual",
}


def sample_content(tipo: str) -> dict:
    base = {"titulo": f"Material {tipo}", "instrucciones": "Lee y desarrolla la actividad."}
    samples = {
        "crucigrama": {
            "crucigrama": {"grid": [["A", "G", "U", "A"]]},
            "preguntas_horizontales": [
                {"numero": 1, "pista": "Líquido esencial", "respuesta": "AGUA", "fila": 0, "columna": 0}
            ],
            "preguntas_verticales": [],
        },
        "sopa_letras": {"grilla": [["A", "G"], ["U", "A"]], "banco_palabras": ["AGUA"], "palabras": []},
        "unir_columnas": {
            "columna_izquierda": [{"numero": 1, "texto": "Evaporación"}],
            "columna_derecha": [{"letra": "A", "texto": "Líquido a gas"}],
            "soluciones": [{"numero": 1, "letra": "A"}],
        },
        "emparejar": {
            "columna_izquierda": [{"numero": 1, "texto": "Evaporación"}],
            "columna_derecha": [{"letra": "A", "texto": "Líquido a gas"}],
            "soluciones": [{"numero": 1, "letra": "A"}],
        },
        "cuento": {"personajes": ["Lina"], "parrafos": ["Lina observó una gota."], "moraleja": "Cuidar el agua."},
        "para_colorear": {"imagen": {"is_placeholder": True}, "uso_docente": ["Nombrar los elementos"]},
        "guia": {"objetivos": ["Comprender"], "secciones": [{"titulo": "Explora", "contenido": "Observa.", "actividades": ["Explica."]}]},
        "taller": {"objetivo": "Aplicar", "puntos": [{"numero": 1, "enunciado": "Representa el ciclo."}]},
        "examen": {"preguntas": [{"numero": 1, "enunciado": "¿Qué es evaporación?", "opciones": ["A) Cambio de estado"], "respuesta_correcta": "A", "puntaje": 1}]},
        "rubrica": {"escala": ["Logrado"], "criterios": [{"nombre": "Claridad", "peso_porcentaje": 100, "niveles": {"Logrado": "Explica."}}]},
        "plan_refuerzo": {"estudiante": "Ana", "semanas": [{"semana": 1, "tema": "Agua", "actividades": ["Practicar"], "recursos": ["Tarjetas"]}]},
        "lectura_comprensiva": {"texto": "El agua cambia.", "preguntas": [{"numero": 1, "enunciado": "¿Qué cambia?", "respuesta_esperada": "El agua"}]},
        "quiz_rapido": {"preguntas": [{"numero": 1, "enunciado": "Selecciona.", "opciones": ["A) Agua"], "respuesta_correcta": "A"}]},
        "ficha": {"ejercicios": [{"numero": 1, "tipo": "completar", "enunciado": "Completa.", "respuesta_esperada": "agua", "espacio_respuesta": True}]},
        "flashcards": {"tarjetas": [{"numero": 1, "anverso": "Evaporación", "reverso": "Líquido a gas"}]},
        "mapa_conceptual": {"concepto_principal": "Agua", "nodos": [{"id": "n1", "concepto": "Evaporación", "nivel": 1}], "relaciones": []},
    }
    return {**base, **samples[tipo]}


def test_every_resource_type_has_a_dedicated_pdf_renderer() -> None:
    assert RENDERABLE_TYPES.issubset(_RENDERERS)


@pytest.mark.parametrize("tipo", sorted(RENDERABLE_TYPES))
def test_every_resource_type_renders_complete_html(tipo: str) -> None:
    html = render_material_html(
        {"tipo": tipo, "titulo": f"Material {tipo}", "contenido_json": sample_content(tipo)},
        soluciones=True,
    )

    assert html.startswith("<!DOCTYPE html>")
    assert f"Material {tipo}" in html
    assert "HOJA DE RESPUESTAS" in html
    assert "None" not in html
