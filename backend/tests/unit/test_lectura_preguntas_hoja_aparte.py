"""Spec 214: en el PDF de cuento y de lectura comprensiva, las preguntas van en hoja aparte."""
from __future__ import annotations

import base64
import re
from io import BytesIO

import pytest

from app.modules.herramientas.pdf_render import _answer_lines, render_material_html, render_material_pdf

HEADING = "Preguntas de comprensión"
SENTENCE = "El río baja despacio desde la montaña hasta el mar."


def html_for(tipo: str, contenido: dict, *, soluciones: bool = False) -> str:
    return render_material_html({"tipo": tipo, "titulo": "Recurso de prueba", "contenido_json": contenido}, soluciones=soluciones)


def body_of(html: str) -> str:
    return html.split("</style></head>", 1)[1]


def questions_sheet(body: str) -> str:
    """Lo que queda dentro de la hoja de preguntas."""
    return body.split('<div class="newpage">', 1)[1]


def reading(questions: int = 3, *, repeat: int = 4, expected: str = "Baja desde la montaña hasta el mar.") -> dict:
    return {
        "titulo": "El río",
        "instrucciones": "Lee con atención y responde.",
        "texto": " ".join([SENTENCE] * repeat),
        "preguntas": [
            {"numero": n, "tipo": "literal", "enunciado": f"Pregunta número {n} sobre el río.",
             "respuesta_esperada": expected, "evidencia_textual": "El río baja despacio."}
            for n in range(1, questions + 1)
        ],
    }


def story(questions: int = 2, *, image: bool = False) -> dict:
    content = {
        "titulo": "La gota viajera",
        "personajes": ["Gota", "Nube"],
        "parrafos": ["Había una vez una gota que quería conocer el mar."] * 3,
        "moraleja": "Todo camino enseña algo.",
        "preguntas_comprension": [f"¿Qué pasó en la parte {n}?" for n in range(1, questions + 1)],
    }
    if image:
        from PIL import Image

        buffer = BytesIO()
        Image.new("RGB", (240, 240), (120, 170, 220)).save(buffer, format="PNG")
        content["imagen"] = {"is_placeholder": False, "b64_data": base64.b64encode(buffer.getvalue()).decode()}
    return content


# ── FR-001: las preguntas empiezan en hoja nueva ─────────────────────────────
def test_fr001_la_hoja_nueva_tiene_su_regla_de_salto_de_pagina() -> None:
    assert ".newpage { break-before: page; page-break-before: always; }" in html_for("lectura_comprensiva", reading())


@pytest.mark.parametrize(("tipo", "contenido", "ultimo_texto"), [
    ("lectura_comprensiva", reading(), SENTENCE),
    ("cuento", story(), "Todo camino enseña algo."),
])
def test_fr001_las_preguntas_van_despues_del_texto_en_una_hoja_aparte(tipo: str, contenido: dict, ultimo_texto: str) -> None:
    body = body_of(html_for(tipo, contenido))

    assert body.count('<div class="newpage">') == 1
    before, sheet = body.split('<div class="newpage">', 1)
    assert ultimo_texto in before and HEADING not in before
    assert HEADING in sheet and ultimo_texto not in sheet


@pytest.mark.parametrize(("tipo", "contenido"), [
    ("lectura_comprensiva", {**reading(), "texto": ""}),
    ("cuento", {**story(), "parrafos": []}),
])
def test_fr001_sin_texto_no_se_deja_una_primera_hoja_vacia(tipo: str, contenido: dict) -> None:
    body = body_of(html_for(tipo, contenido))

    assert 'class="newpage"' not in body
    assert HEADING in body


def test_fr001_sin_preguntas_no_hay_hoja_adicional() -> None:
    assert 'class="newpage"' not in body_of(html_for("lectura_comprensiva", {**reading(), "preguntas": []}))
    assert 'class="newpage"' not in body_of(html_for("cuento", {**story(), "preguntas_comprension": []}))


# ── FR-002: numeradas y con nombre en la hoja de respuestas ─────────────────
def test_fr002_la_hoja_de_preguntas_pide_el_nombre_y_numera_cada_pregunta() -> None:
    lectura = questions_sheet(body_of(html_for("lectura_comprensiva", reading(3))))
    cuento = questions_sheet(body_of(html_for("cuento", story(2))))

    for sheet in (lectura, cuento):
        assert "<b>Nombre:</b>" in sheet
    assert all(f"<b>{n}.</b> Pregunta número {n} sobre el río." in lectura for n in (1, 2, 3))
    assert "<b>1.</b> ¿Qué pasó en la parte 1?" in cuento and "<b>2.</b> ¿Qué pasó en la parte 2?" in cuento


# ── FR-003: renglones según la respuesta esperada ───────────────────────────
@pytest.mark.parametrize(("expected", "lines"), [
    (None, 3),
    ("", 3),
    ("El mar.", 2),
    ("x" * 35, 2),
    ("x" * 36, 3),
    ("Porque el agua siempre busca el lugar más bajo y por eso baja desde la montaña hasta llegar al mar.", 4),
    ("x" * 2000, 8),
])
def test_fr003_los_renglones_siguen_la_extension_esperada(expected: str | None, lines: int) -> None:
    assert _answer_lines(expected) == lines


def test_fr003_cada_pregunta_de_la_lectura_recibe_sus_renglones() -> None:
    content = reading(3)
    content["preguntas"][0]["respuesta_esperada"] = "El mar."
    content["preguntas"][1]["respuesta_esperada"] = "x" * 100
    content["preguntas"][2].pop("respuesta_esperada")
    sheet = questions_sheet(body_of(html_for("lectura_comprensiva", content)))
    cards = sheet.split('<div class="card keep">')[1:]

    assert [card.count('<div class="aline"></div>') for card in cards] == [2, 4, 3]
    assert ".aline { border-bottom: 1px solid #9CA3AF; height: 8mm; }" in html_for("lectura_comprensiva", content)


def test_fr003_el_cuento_da_tres_renglones_por_pregunta() -> None:
    sheet = questions_sheet(body_of(html_for("cuento", story(2))))

    assert sheet.count('<div class="aline"></div>') == 6


# ── FR-004: el solucionario sigue siendo solo del docente ───────────────────
def test_fr004_la_copia_del_estudiante_no_trae_respuestas_y_el_solucionario_si() -> None:
    content = reading(2, expected="RESPUESTA SOLO DOCENTE")
    student = body_of(html_for("lectura_comprensiva", content))
    teacher = body_of(html_for("lectura_comprensiva", content, soluciones=True))

    assert "RESPUESTA SOLO DOCENTE" not in student and "El río baja despacio." not in questions_sheet(student)
    assert teacher.count("RESPUESTA SOLO DOCENTE") == 2
    assert 'class="aline"' not in teacher
    assert teacher.count('<div class="newpage">') == 1 and "<b>Nombre:</b>" not in questions_sheet(teacher)


# ── FR-005: PDF real, sin truncar ───────────────────────────────────────────
def pages_of(material: dict, *, soluciones: bool = False) -> list[str]:
    pytest.importorskip("weasyprint", reason="El PDF real necesita WeasyPrint (contenedor o CI)")
    import fitz

    with fitz.open(stream=render_material_pdf(material, soluciones), filetype="pdf") as document:
        return [page.get_text() for page in document]


def flat(text: str) -> str:
    """Texto en una línea, sin la marca de la cabecera ni el pie de página.

    Al extraer el texto, ambos caen al final de la hoja, en medio de una oración partida entre dos hojas.
    """
    marks = r"XCalificator(?: · Plataforma Educativa IA\s+—\s+Página \d+)?"
    return " ".join(re.sub(marks, " ", text).split())


@pytest.mark.parametrize("repeat", [4, 150])
def test_fr005_pdf_real_la_lectura_y_las_preguntas_no_comparten_hoja(repeat: int) -> None:
    pages = pages_of({"tipo": "lectura_comprensiva", "contenido_json": reading(4, repeat=repeat)})
    first = next(index for index, text in enumerate(pages) if HEADING in text)

    assert first >= 1 and (first == 1) == (repeat == 4)
    # Se cuenta sobre las hojas unidas: una oración puede quedar partida entre dos hojas. Ninguna se pierde.
    assert flat(" ".join(pages[:first])).count(SENTENCE) == repeat
    assert all(SENTENCE not in flat(text) for text in pages[first:])
    assert all("Pregunta número" not in text for text in pages[:first])
    assert "Nombre:" in pages[first]
    assert all(f"Pregunta número {n} sobre el río." in flat(" ".join(pages[first:])) for n in range(1, 5))


def test_fr005_pdf_real_un_cuestionario_largo_continua_en_otra_hoja_sin_perder_preguntas() -> None:
    content = reading(14, expected="x" * 400)
    pages = pages_of({"tipo": "lectura_comprensiva", "contenido_json": content})
    first = next(index for index, text in enumerate(pages) if HEADING in text)

    assert len(pages) - first >= 2
    questions = flat(" ".join(pages[first:]))
    assert all(f"Pregunta número {n} sobre el río." in questions for n in range(1, 15))


@pytest.mark.parametrize("image", [False, True])
def test_fr005_pdf_real_el_cuento_con_y_sin_ilustracion_deja_las_preguntas_en_hoja_aparte(image: bool) -> None:
    pages = pages_of({"tipo": "cuento", "contenido_json": story(3, image=image)})

    assert len(pages) == 2
    assert "Había una vez una gota" in flat(pages[0]) and "Todo camino enseña algo." in flat(pages[0])
    assert HEADING not in pages[0] and HEADING in pages[1]
    assert all(f"¿Qué pasó en la parte {n}?" in flat(pages[1]) for n in (1, 2, 3))
