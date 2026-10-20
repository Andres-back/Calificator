"""Checks for new stories only; never rewrites persisted resources."""
from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Callable


class StoryQualityError(ValueError):
    """A generated draft needs the single bounded textual correction."""


def validate_story(content: dict, request: object, *, page_counter: Callable[[dict], int] | None = None) -> None:
    if not isinstance(content, dict):
        raise StoryQualityError("Devuelve un cuento con título, párrafos y preguntas completos.")
    paragraphs = content.get("parrafos")
    if not isinstance(paragraphs, list) or len(paragraphs) < 3 or any(
        not isinstance(p, str) or not p.strip() for p in paragraphs
    ):
        raise StoryQualityError("Escribe al menos tres párrafos completos: inicio, desarrollo y cierre.")
    words = len(" ".join(paragraphs).split())
    maximum = 230 if getattr(request, "longitud", "corto") == "corto" else 560
    if not 120 <= words <= maximum:
        raise StoryQualityError(f"Ajusta la narración a entre 120 y {maximum} palabras, sin relleno.")
    normalized = [" ".join(re.findall(r"\w+", p.casefold())) for p in paragraphs]
    for index, paragraph in enumerate(normalized):
        if any(SequenceMatcher(None, paragraph, earlier).ratio() >= 0.88 for earlier in normalized[:index]):
            raise StoryQualityError("No repitas párrafos; cada uno debe hacer avanzar la historia.")
    sentences = [" ".join(re.findall(r"\w+", s.casefold())) for s in re.split(r"[.!?]+", " ".join(paragraphs))]
    substantive = [s for s in sentences if len(s.split()) >= 9]
    if len(substantive) != len(set(substantive)):
        raise StoryQualityError("No repitas frases de relleno dentro de la historia.")
    characters = content.get("personajes")
    if not str(content.get("titulo") or "").strip() or not isinstance(characters, list) or not characters or any(
        not isinstance(c, str) or not c.strip() for c in characters
    ):
        raise StoryQualityError("Incluye título y personajes de la historia.")
    questions = content.get("preguntas_comprension")
    if not isinstance(questions, list) or not questions or any(
        not isinstance(q, (str, dict)) or not (
            q.strip() if isinstance(q, str) else str(q.get("enunciado") or q.get("pregunta") or q.get("texto") or "").strip()
        ) for q in questions
    ):
        raise StoryQualityError("Incluye preguntas de comprensión basadas en la historia.")
    preference = getattr(request, "moraleja", "automatico")
    moral = str(content.get("moraleja") or "").strip()
    if preference == "con" and not moral:
        raise StoryQualityError("Incluye la moraleja solicitada, derivada de los hechos del cuento.")
    if preference == "sin" and moral:
        raise StoryQualityError("Entrega el cuento sin moraleja, como pidió el docente.")
    if page_counter is None:
        from app.modules.herramientas.pdf_render import count_story_narrative_pages
        page_counter = count_story_narrative_pages
    pages = page_counter(content)
    limit = 1 if getattr(request, "longitud", "corto") == "corto" else 2
    if not 1 <= pages <= limit:
        raise StoryQualityError(f"La narración debe caber en {limit} página(s) con su ilustración; acorta sin perder el cierre.")
