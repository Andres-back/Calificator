from copy import deepcopy
import re

import pytest

from app.modules.herramientas.pdf_render import render_material_html


def material(kind="cuento", questions=None):
    content = {"titulo": "Un viaje de prueba", "imagen": {"b64_data": "synthetic"}}
    if kind == "cuento":
        content.update(parrafos=["Narración sintética conservada."], preguntas_comprension=questions or [])
    else:
        content.update(texto="Narración sintética conservada.", preguntas=questions or [])
    return {"tipo": kind, "contenido_json": content}


def test_model_question_prefix_does_not_duplicate_printed_number():
    value = material(questions=["1. ¿Qué pasó?", "2) ¿Por qué?"])
    before = deepcopy(value)
    html = render_material_html(value)
    assert '>1.</span> ¿Qué pasó?' in html
    assert '>2.</span> ¿Por qué?' in html
    assert value == before


@pytest.mark.parametrize("kind", ["cuento", "lectura_comprensiva"])
def test_reading_follows_title_then_image_then_text_then_new_page_questions(kind):
    value = material(kind, ["¿Quién viajó?"])
    html = render_material_html(value)
    assert html.index('<div class="title">') < html.index('<img ') < html.index("Narración sintética conservada.") < html.index('<section class="worksheet-questions"')
    assert "break-before: page" in html
    assert 'class="story-grid"' not in html


@pytest.mark.parametrize("kind", ["cuento", "lectura_comprensiva"])
def test_no_questions_does_not_create_an_empty_question_page(kind):
    html = render_material_html(material(kind))
    assert '<section class="worksheet-questions"' not in html


@pytest.mark.parametrize("kind", ["cuento", "lectura_comprensiva"])
def test_question_numbering_is_projection_and_answers_are_not_leaked(kind):
    value = material(kind, [{"numero": 8, "enunciado": "¿Quién viajó?", "respuesta_esperada": "Nico"}, {"numero": 8, "enunciado": "Justifica tu opinión.", "respuesta_esperada": "PRIVATE_SOLUTION"}])
    before = deepcopy(value)
    html = render_material_html(value)
    assert 'class="question-number">1.</span>' in html
    assert 'class="question-number">2.</span>' in html
    assert "PRIVATE_SOLUTION" not in html
    assert value == before


@pytest.mark.parametrize("question,expected", [
    ({"enunciado": "¿Quién viajó?", "respuesta_esperada": "Nico"}, 2),
    ({"enunciado": "Explica tu opinión.", "respuesta_esperada": "Sí"}, 4),
    ({"enunciado": "¿Por qué viajó?", "tipo": "inferencial", "respuesta_esperada": "Por aprender"}, 4),
    ({"enunciado": "Describe el final.", "respuesta_esperada": "Una respuesta razonada de varias oraciones. " * 5}, 4),
    ("¿Quién viajó?", 3),
])
def test_answer_space_uses_available_metadata_without_adding_ai(question, expected):
    html = render_material_html(material("lectura_comprensiva", [question]))
    assert len(re.findall('class="answer-line"', html)) == expected
    assert 'class="question-start"' in html


def test_teacher_solution_has_no_work_lines_and_does_not_invent_old_story_answers():
    value = material("lectura_comprensiva", [{"enunciado": "¿Quién viajó?", "respuesta_esperada": "Nico", "justificacion": "Lo dice el título."}])
    html = render_material_html(value, soluciones=True)
    assert "Nico" in html
    assert "Lo dice el título." in html
    assert 'class="answer-line"' not in html
    assert 'class="answer-line"' not in render_material_html(material(questions=["¿Quién viajó?"]), soluciones=True)


def test_long_text_and_missing_image_are_not_truncated_or_replaced():
    value = material("lectura_comprensiva", ["¿Qué comprendiste?"])
    value["contenido_json"].pop("imagen")
    value["contenido_json"]["texto"] = "Conservar este párrafo completo. " * 200
    html = render_material_html(value)
    assert html.count("Conservar este párrafo completo.") == 200
    assert '<img ' not in html
    assert 'class="placeholder"' not in html
