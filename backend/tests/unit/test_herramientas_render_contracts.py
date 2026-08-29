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
        "guia": {"objetivos": ["Comprender"], "saberes_previos": ["Reconocer estados"], "secciones": [{"titulo": "Explora", "explicacion": "Observa.", "ejemplo_guiado": "Sigue una gota.", "actividades": ["Explica."], "verificacion": "Comprueba tu explicación."}], "cierre": "Resume."},
        "taller": {"objetivo": "Aplicar", "puntaje_total": 2, "puntos": [{"numero": 1, "dificultad": "media", "puntaje": 2, "enunciado": "Representa el ciclo.", "lineas_respuesta": 3, "respuesta_esperada": "Representación completa", "criterio_logro": "Incluye los cambios"}]},
        "examen": {"preguntas": [{"numero": 1, "enunciado": "¿Qué es evaporación?", "opciones": ["A) Cambio de estado"], "respuesta_correcta": "A", "puntaje": 1}]},
        "rubrica": {"escala": ["Logrado"], "criterios": [{"nombre": "Claridad", "peso_porcentaje": 100, "niveles": {"Logrado": "Explica."}}]},
        "plan_refuerzo": {"estudiante": "Ana", "diagnostico_inicial": "Necesita aplicar.", "semanas": [{"semana": 1, "tema": "Agua", "meta_semana": "Comprender", "actividades": ["Practicar"], "recursos": ["Tarjetas"], "evidencia": "Ejercicio", "responsable": "Ana"}], "comprobacion_final": "Explicar un caso."},
        "lectura_comprensiva": {"texto": "El agua cambia.", "estrategia_lectora": "Subraya.", "preguntas": [{"numero": 1, "tipo": "literal", "dificultad": "baja", "enunciado": "¿Qué ocurre con el agua?", "respuesta_esperada": "Se transforma", "evidencia_textual": "El agua cambia"}]},
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


@pytest.mark.parametrize(
    ("tipo", "student_secret", "teacher_detail"),
    [
        ("taller", "Representación completa", "Criterio:"),
        ("lectura_comprensiva", "Se transforma", "Evidencia:"),
    ],
)
def test_student_pdf_hides_answers_and_teacher_pdf_explains_them(
    tipo: str,
    student_secret: str,
    teacher_detail: str,
) -> None:
    material = {"tipo": tipo, "titulo": f"Material {tipo}", "contenido_json": sample_content(tipo)}
    student_html = render_material_html(material, soluciones=False)
    teacher_html = render_material_html(material, soluciones=True)

    assert student_secret not in student_html
    assert student_secret in teacher_html
    assert teacher_detail in teacher_html
