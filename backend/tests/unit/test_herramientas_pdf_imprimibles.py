"""Spec 194: PDF imprimibles de recursos (etiquetas, rúbrica, tarjetas, dibujo y saltos de página)."""
from __future__ import annotations

import re

import pytest

from app.modules.herramientas.pdf_render import (
    TOOL_LABELS,
    _clean_options,
    _rubric_levels,
    _sopa_cell_px,
    render_material_html,
)


def html_for(tipo: str, contenido: dict, *, soluciones: bool = False) -> str:
    return render_material_html(
        {"tipo": tipo, "titulo": "Recurso de prueba", "contenido_json": contenido},
        soluciones=soluciones,
    )


def body_of(html: str) -> str:
    """El cuerpo sin la hoja de estilos, para no confundir clases CSS con contenido."""
    return html.split("</style></head>", 1)[1]


@pytest.mark.parametrize(
    ("tipo", "label"),
    [
        ("ficha", "Ficha didáctica"),
        ("quiz_rapido", "Quiz rápido"),
        ("lectura_comprensiva", "Lectura comprensiva"),
        ("mapa_conceptual", "Mapa conceptual"),
        ("flashcards", "Tarjetas de estudio"),
        ("unir_columnas", "Relacionar pares"),
        ("emparejar", "Relacionar pares"),
    ],
)
def test_subtitle_uses_a_readable_label_instead_of_the_raw_type(tipo: str, label: str) -> None:
    html = html_for(tipo, {"titulo": "Recurso de prueba"})

    assert TOOL_LABELS[tipo] == label
    assert f'<div class="subtitle">{label}' in html
    assert f'<div class="subtitle">{tipo}' not in html


def test_matching_and_quiz_section_headers_match_the_app_names() -> None:
    pares = html_for(
        "unir_columnas",
        {
            "columna_izquierda": [{"numero": 1, "texto": "Águila"}],
            "columna_derecha": [{"letra": "A", "texto": "Ave"}],
            "soluciones": [{"numero": 1, "letra": "A"}],
        },
    )
    quiz = html_for(
        "quiz_rapido",
        {"preguntas": [{"numero": 1, "enunciado": "¿Cuál?", "opciones": ["A) Uno", "B) Dos"], "respuesta_correcta": "A)"}]},
    )

    assert '<div class="sectionbar">RELACIONAR PARES</div>' in pares
    assert "UNIR COLUMNAS" not in pares
    assert '<div class="sectionbar">QUIZ RÁPIDO</div>' in quiz
    assert '<div class="sectionbar">EXAMEN</div>' not in quiz


def test_exam_keeps_its_own_section_header() -> None:
    html = html_for("examen", {"preguntas": [{"numero": 1, "enunciado": "¿Cuál?", "opciones": ["Uno", "Dos"]}]})

    assert '<div class="sectionbar">EXAMEN</div>' in html


def test_option_letters_are_not_printed_twice() -> None:
    assert _clean_options(["A. El conejo", "B. La hierba", "C. El zorro"]) == ["El conejo", "La hierba", "El zorro"]
    assert _clean_options(["A) Uno", "b) Dos"]) == ["Uno", "Dos"]
    assert _clean_options(["A - Uno", "B - Dos"]) == ["Uno", "Dos"]
    # Una inicial que no es la letra de la opción se conserva.
    assert _clean_options(["A. C. Clarke", "Isaac Asimov"]) == ["A. C. Clarke", "Isaac Asimov"]
    assert _clean_options(["6", "7", "8"]) == ["6", "7", "8"]
    assert _clean_options(None) == []

    html = html_for(
        "taller",
        {"puntos": [{"numero": 1, "puntaje": 1, "enunciado": "¿Cuál es un productor?", "opciones": ["A. El conejo", "B. La hierba"]}]},
    )
    assert "A)</span> El conejo" in html and "B)</span> La hierba" in html
    assert "A. El conejo" not in html
    assert "[1 pt]" in html


def test_rubric_levels_follow_the_scale_and_print_one_column_per_level() -> None:
    criterio = {
        "nombre": "Claridad",
        "peso_porcentaje": 40,
        "descripcion": "Explica con orden.",
        # JSONB devuelve las claves en orden alfabético.
        "niveles": {"Bueno": "Casi siempre", "Excelente": "Siempre", "Insuficiente": "Nunca", "Regular": "A veces"},
    }
    escala = ["Excelente", "Bueno", "Regular", "Insuficiente"]

    assert _rubric_levels(escala, [criterio]) == escala
    assert _rubric_levels(escala, [{"niveles": {"Bueno": "x", "Extra": "y", "excelente ": "z"}}]) == ["Excelente", "Bueno", "Extra"]

    html = html_for("rubrica", {"escala": escala, "criterios": [criterio]})
    headers = re.findall(r"<th[^>]*>([^<]+)</th>", html)
    assert headers == ["Criterio", *escala]
    assert '<table class="rubric">' in html
    assert html.index("<td>Siempre</td>") < html.index("<td>Casi siempre</td>") < html.index("<td>A veces</td>") < html.index("<td>Nunca</td>")
    assert '<span class="crit-weight">40%</span>' in html


def test_rubric_with_more_than_five_levels_keeps_the_stacked_format_in_scale_order() -> None:
    escala = ["Superior", "Alto", "Básico alto", "Básico", "Bajo", "Muy bajo"]
    criterio = {"nombre": "Claridad", "niveles": {name: f"Texto {name}" for name in sorted(escala)}}

    html = html_for("rubrica", {"escala": escala, "criterios": [criterio]})

    assert '<table class="grid">' in html and '<table class="rubric">' not in html
    positions = [html.index(f"<b>{name}:</b>") for name in escala]
    assert positions == sorted(positions)


@pytest.mark.parametrize("tipo", ["cuento", "para_colorear"])
def test_placeholder_image_never_prints_the_internal_prompt(tipo: str) -> None:
    contenido = {
        "parrafos": ["Había una vez una gota."],
        "instrucciones": "Colorea el dibujo.",
        "imagen": {"is_placeholder": True, "url": "/static/placeholder.svg", "prompt": "PROMPT INTERNO SECRETO"},
        "prompt_imagen": "PROMPT INTERNO SECRETO",
    }

    html = html_for(tipo, contenido)

    assert "PROMPT INTERNO SECRETO" not in html
    assert "Imagen pendiente o de reserva" not in html
    if tipo == "cuento":
        assert 'class="story-grid"' not in html
        assert "Había una vez una gota." in html
    else:
        assert "El dibujo no está disponible. Vuelve a generarlo desde la aplicación." in html


@pytest.mark.parametrize("tipo", ["cuento", "para_colorear"])
def test_real_image_is_still_printed(tipo: str) -> None:
    html = html_for(tipo, {"parrafos": ["Texto."], "imagen": {"is_placeholder": False, "b64_data": "QUJD"}})

    assert 'src="data:image/png;base64,QUJD"' in html
    if tipo == "cuento":
        assert 'class="story-grid"' in html


def test_story_questions_are_numbered_with_room_to_answer() -> None:
    html = html_for(
        "cuento",
        {"parrafos": ["Texto."], "preguntas_comprension": ["¿Qué pasó primero?", "¿Qué aprendiste?"]},
    )
    body = body_of(html)

    assert "Preguntas de comprensión" in body
    assert "Preguntas de comprension<" not in body
    assert "<b>1.</b> ¿Qué pasó primero?" in body and "<b>2.</b> ¿Qué aprendiste?" in body
    # Spec 214: tres renglones de escritura a mano por pregunta, en lugar de dos renglones estrechos.
    assert body.count('<div class="aline"></div>') == 6


def test_cards_are_kept_together_across_pages() -> None:
    assert ".keep { break-inside: avoid; page-break-inside: avoid; }" in html_for("taller", {})

    taller = body_of(html_for("taller", {"puntos": [{"numero": 1, "enunciado": "Explica."}]}))
    plan = body_of(html_for("plan_refuerzo", {"semanas": [{"semana": 1, "tema": "Fracciones"}]}))
    lectura = body_of(html_for("lectura_comprensiva", {"preguntas": [{"numero": 1, "enunciado": "¿Qué dice?"}]}))
    quiz = body_of(html_for("quiz_rapido", {"preguntas": [{"numero": 1, "enunciado": "¿Cuál?", "opciones": ["Uno", "Dos"]}]}))
    guia_corta = body_of(html_for("guia", {"secciones": [{"titulo": "Explora", "explicacion": "Observa."}]}))
    guia_larga = body_of(html_for("guia", {"secciones": [{"titulo": "Explora", "explicacion": "Observa. " * 400}]}))

    for body in (taller, plan, lectura, guia_corta):
        assert '<div class="card keep">' in body
    assert "break-inside:avoid;" in quiz
    assert '<div class="card keep">' not in guia_larga and '<div class="card">' in guia_larga


def test_worksheet_keeps_line_breaks_and_gives_room_to_draw() -> None:
    contenido = {
        "ejercicios": [
            {"numero": 1, "tipo": "opción múltiple", "enunciado": "¿Cuál es sólido?\nA) Aire\nB) Piedra", "respuesta_esperada": "B"},
            {"numero": 2, "tipo": "dibujar", "enunciado": "Dibuja tres recipientes.", "respuesta_esperada": "Tres dibujos rotulados"},
        ]
    }

    student = body_of(html_for("ficha", contenido))
    teacher = body_of(html_for("ficha", contenido, soluciones=True))

    assert "¿Cuál es sólido?<br/>A) Aire<br/>B) Piedra" in student
    assert student.count('<div class="drawbox"></div>') == 1
    assert "Dibuja aquí" in student
    assert '<div class="drawbox"></div>' not in teacher
    assert "Tres dibujos rotulados" in teacher and "Tres dibujos rotulados" not in student


def test_flashcards_print_as_cut_out_cards_and_only_the_answer_sheet_shows_the_back() -> None:
    contenido = {
        "tarjetas": [
            {"numero": 1, "anverso": "Corazón", "reverso": "Bombea la sangre."},
            {"numero": 2, "anverso": "Pulmones", "reverso": "Permiten respirar."},
            {"numero": 3, "anverso": "Cerebro", "reverso": "Controla el cuerpo."},
        ]
    }

    student = body_of(html_for("flashcards", contenido))
    teacher = body_of(html_for("flashcards", contenido, soluciones=True))

    assert '<div class="sectionbar">TARJETAS DE ESTUDIO</div>' in student
    assert "Recorta las tarjetas por la línea punteada." in student
    assert student.count('<div class="fc-front">') == 3
    # Dos tarjetas por fila; la última fila se completa con una celda vacía.
    cards_table = student.split('<table class="fcards">', 1)[1]
    assert cards_table.count("<tr>") == 2 and cards_table.count('<td class="empty"></td>') == 1
    assert "Bombea la sangre." not in student
    assert '<div class="line"></div>' not in student
    assert '<div class="fc-back">Bombea la sangre.</div>' in teacher


def test_word_search_cells_are_large_and_shrink_only_for_big_grids() -> None:
    def grid(side: int) -> list[list[str]]:
        return [["A"] * side for _ in range(side)]

    assert _sopa_cell_px(grid(12)) == 32
    assert _sopa_cell_px(grid(15)) == 32
    assert 20 <= _sopa_cell_px(grid(20)) < 32
    assert _sopa_cell_px([]) == 32

    html = html_for("sopa_letras", {"grilla": grid(13), "banco_palabras": ["AGUA"], "palabras": []})
    assert "table.ws td{width:32px;height:32px;font-size:16px}" in html
