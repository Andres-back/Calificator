"""Lectura comprensiva: texto seguido de preguntas de comprensión."""
from __future__ import annotations

from app.core.logging import get_logger
from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.schemas import LecturaComprensivaRequest
from app.services.llm_router import LLMRouter

logger = get_logger(__name__)


async def generate(req: LecturaComprensivaRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    prompt = f"""{TOOLS_SYSTEM}

{ctx}

Genera un ejercicio de lectura comprensiva con un texto breve y apropiado para
el grado, seguido de {req.cantidad_preguntas} preguntas de comprensión. Las
preguntas deben incluir al menos 2 de inferencia y 1 de vocabulario en
contexto. Cada pregunta debe tener su respuesta correcta.
Devuelve SOLO JSON:
{{"titulo":"...","texto":"...","preguntas":[{{"numero":1,"tipo":"literal|inferencial|vocabulario","enunciado":"...","respuesta_esperada":"..."}}]}}"""

    result = await llm.generate_json("lectura_comprensiva", prompt)
    if not isinstance(result, dict):
        result = {}

    preguntas = result.get("preguntas", [])
    if not isinstance(preguntas, list):
        preguntas = []

    titulo = (result.get("titulo") or req.titulo or "Lectura comprensiva").strip()
    texto = (result.get("texto") or "").strip()

    return {
        "titulo": titulo,
        "texto": texto,
        "preguntas": preguntas,
    }
