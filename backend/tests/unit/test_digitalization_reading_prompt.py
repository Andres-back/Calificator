"""Spec 179: al digitalizar, las instrucciones de lectura llegan al modelo de visión.

Las pruebas sustituyen solo la llamada al proveedor (`VisionExtractor._one`), no
`vision_agent`: el fallo original pasó inadvertido porque todas las pruebas de
digitalización reemplazaban `vision_agent` completo.
"""
from __future__ import annotations

import asyncio
import json
from io import BytesIO

import pytest
from PIL import Image

from app.modules.calificaciones.agents import AgentContext, vision_agent
from app.modules.evaluaciones import digitalize_service
from app.modules.evaluaciones import reading_completeness as rc
from app.modules.evaluaciones import visual_import_service
from app.services.vision_extractor import ExtractedAnswer, VisionExtractor, VisionPageResult

GRADING_PRIORITY = "busca las respuestas del estudiante"
EVIDENCE_HEADER = "EVIDENCIA GRÁFICA DEL ESTUDIANTE"


def _sheet() -> bytes:
    image = Image.new("RGB", (640, 840), "white")
    for y in range(40, 800, 36):
        image.paste("black", (35, y, 590, y + 3))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class _Client:
    """Cliente sin red: la lectura real se sustituye en `VisionExtractor._one`."""

    api_key = "clave-sintetica"

    def __init__(self) -> None:
        self._tracking: dict = {}

    async def close(self) -> None:
        return None


@pytest.fixture
def provider(monkeypatch: pytest.MonkeyPatch) -> dict:
    """Captura el prompt que saldría hacia el proveedor y devuelve una hoja leída."""
    sent: dict = {"prompts": [], "page": None}

    async def fake_one(self, item, total, blueprint, purpose):
        sent["prompts"].append(self._prompt(blueprint, item[0], total, purpose))
        return sent["page"] or VisionPageResult(
            page=item[0], status="extracted", page_text="1. ¿Qué es el clima?\nA) El relieve.\nB) La atmósfera.")

    monkeypatch.setattr(VisionExtractor, "_one", fake_one)
    monkeypatch.setattr(digitalize_service, "OpenCodeClient", _Client)
    return sent


def _context() -> AgentContext:
    return AgentContext(evaluacion_nombre="Hoja", nota_maxima=5.0, blueprint={"nombre": "Hoja"},
                        image_bytes=_sheet(), image_mime="image/png")


def test_the_digitalization_rules_reach_the_vision_model(provider: dict) -> None:
    asyncio.run(digitalize_service._extract_image_text(_sheet(), "image/png", "hoja.png"))

    prompt = provider["prompts"][0]
    assert digitalize_service.DIGITALIZATION_VISION_PROMPT.strip() in prompt
    assert GRADING_PRIORITY not in prompt


def test_the_document_prompt_asks_for_the_printed_sheet_in_order_one_element_per_line(provider: dict) -> None:
    asyncio.run(digitalize_service._extract_image_text(_sheet(), "image/png", "hoja.png"))

    prompt = provider["prompts"][0]
    for rule in ("un elemento por renglón", "en el orden", "secciones", "cada opción", "no renumeres",
                 "palabra por palabra"):
        assert rule in prompt, rule
    example = json.loads(prompt.split("Devuelve SOLO JSON:\n", 1)[1])
    assert {"page_text", "answers", "warnings", "page_role", "document_quality"} <= set(example)
    assert "regions" not in example["answers"][0]


def test_the_literal_reread_instruction_reaches_the_vision_model(provider: dict) -> None:
    asyncio.run(digitalize_service._extract_image_text(
        _sheet(), "image/png", "Hoja 1",
        prompt_override=digitalize_service.DIGITALIZATION_VISION_PROMPT + rc.LITERAL_READING_PROMPT))

    assert rc.LITERAL_READING_PROMPT.strip() in provider["prompts"][0]


def test_the_scanned_pdf_reading_uses_the_document_rules(provider: dict) -> None:
    import fitz

    document = fitz.open()
    document.new_page()
    asyncio.run(digitalize_service._extract_scanned_pdf(document.tobytes(), "hojas.pdf"))

    assert digitalize_service.DIGITALIZATION_VISION_PROMPT.strip() in provider["prompts"][0]
    assert GRADING_PRIORITY not in provider["prompts"][0]


def test_the_prompts_speak_the_contract_the_extractor_parses() -> None:
    for text in (digitalize_service.DIGITALIZATION_VISION_PROMPT, rc.LITERAL_READING_PROMPT,
                 visual_import_service.VISUAL_PAGE_PROMPT):
        assert "page_text" in text
        assert "texto_preguntas" not in text and "texto_extraido" not in text


def test_a_document_read_without_rules_still_gets_a_document_prompt() -> None:
    extractor = VisionExtractor()
    prompt = extractor._prompt({}, page=2, total=3, purpose="evaluation_document")

    assert "Página 2 de 3" in prompt
    assert "page_text" in prompt and "hoja impresa" in prompt
    assert GRADING_PRIORITY not in prompt


def test_the_grading_prompt_does_not_change(provider: dict) -> None:
    result = asyncio.run(vision_agent(_context(), model="modelo-sintetico", client=_Client()))

    prompt = provider["prompts"][0]
    assert result.error is None
    assert GRADING_PRIORITY in prompt
    assert "un elemento por renglón" not in prompt
    assert "texto_preguntas" not in (result.raw_output or {})


def test_marks_observed_on_an_answered_sheet_are_not_part_of_the_transcription(provider: dict) -> None:
    provider["page"] = VisionPageResult(
        page=1, status="extracted",
        page_text="1. ¿De qué trata el texto?\na) De los juguetes electrónicos.\nb) De los juguetes tradicionales.",
        answers=[ExtractedAnswer(question_number=1, answer="b", page=1, confidence=0.9,
                                 visual_description="La opción b está marcada con un círculo oscuro.")])

    result = asyncio.run(vision_agent(_context(), model="modelo-sintetico", client=_Client(),
                                      prompt_override=digitalize_service.DIGITALIZATION_VISION_PROMPT))
    text, _warnings = asyncio.run(digitalize_service._extract_image_text(_sheet(), "image/png", "hoja.png"))

    assert EVIDENCE_HEADER in result.raw_output["texto_extraido"]
    assert EVIDENCE_HEADER not in result.raw_output["texto_preguntas"]
    assert result.raw_output["texto_preguntas"].startswith("=== PÁGINA 1 ===\n1. ¿De qué trata")
    assert EVIDENCE_HEADER not in text and "círculo oscuro" not in text
    assert "b) De los juguetes tradicionales." in text


def test_a_saved_transcription_drops_the_student_evidence_block() -> None:
    saved = (
        "=== PÁGINA 1 ===\n1. ¿De qué trata el texto?\nb) De los juguetes tradicionales.\n\n"
        "=== PÁGINA 2 ===\n8. Dibuja tu juguete favorito.\n\n"
        "=== EVIDENCIA GRÁFICA DEL ESTUDIANTE ===\n"
        "Pregunta 1 (página 1): La opción b está marcada con un círculo oscuro.\n"
        "Pregunta 8 (página 2): Dibujo de un trompo.")

    cleaned = digitalize_service._strip_student_answer_annotations(saved)

    assert cleaned == ("=== PÁGINA 1 ===\n1. ¿De qué trata el texto?\nb) De los juguetes tradicionales.\n\n"
                       "=== PÁGINA 2 ===\n8. Dibuja tu juguete favorito.")


def test_an_evidence_block_before_another_page_keeps_that_page() -> None:
    text = ("=== PÁGINA 1 ===\n1. Lee.\n\n=== EVIDENCIA GRÁFICA DEL ESTUDIANTE ===\nPregunta 1 (página 1): marca.\n\n"
            "=== PÁGINA 2 ===\n2. Escribe.")

    assert digitalize_service._strip_student_answer_annotations(text) == (
        "=== PÁGINA 1 ===\n1. Lee.\n\n=== PÁGINA 2 ===\n2. Escribe.")
