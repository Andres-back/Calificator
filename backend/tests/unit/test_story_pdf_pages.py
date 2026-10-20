"""Real WeasyPrint gate, also run in the PDF-enabled Docker image."""
from copy import deepcopy

import pytest

pytest.importorskip("weasyprint")

from app.modules.herramientas.pdf_render import count_story_narrative_pages, render_material_pdf


@pytest.mark.parametrize("words,maximum", [(160, 1), (480, 2)])
def test_real_narrative_page_budget_excludes_questions_and_preserves_input(words, maximum):
    # Repeated words here are explicitly a typesetting fixture, not a story.
    content = {"titulo": "Fixture técnica de extensión", "parrafos": ["palabra " * words],
               "moraleja": "Texto de cierre para medir.", "preguntas_comprension": ["¿Pregunta? " * 30] * 15}
    before = deepcopy(content)
    assert count_story_narrative_pages(content) <= maximum
    assert content == before


def test_historical_long_text_is_exported_complete_not_subject_to_new_generation_gate():
    import fitz

    content = {"titulo": "Histórico extenso", "parrafos": ["Texto conservado. " * 1200 + "FINAL_CONSERVADO"]}
    before = deepcopy(content)
    document = fitz.open(stream=render_material_pdf({"tipo": "cuento", "contenido_json": content}), filetype="pdf")
    assert len(document) > 2
    assert "FINAL_CONSERVADO" in document[-1].get_text()
    assert content == before


def test_question_larger_than_page_continues_without_truncation():
    import fitz

    content = {"titulo": "Fixture de enunciado extenso", "parrafos": ["Inicio conservado."],
               "preguntas_comprension": ["Explica " + "situación " * 1400 + "FINAL_PREGUNTA"]}
    before = deepcopy(content)
    document = fitz.open(stream=render_material_pdf({"tipo": "cuento", "contenido_json": content}), filetype="pdf")
    assert len(document) > 2
    assert "Preguntas de comprensión" in document[1].get_text()
    assert any("FINAL_PREGUNTA" in page.get_text() for page in document)
    assert content == before
