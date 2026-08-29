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

Genera un ejercicio de lectura comprensiva con un texto breve, coherente y
apropiado para el grado, seguido de exactamente {req.cantidad_preguntas}
preguntas. La primera debe ser literal, la segunda inferencial; desde 3
preguntas incluye vocabulario en contexto y desde 4 incluye una pregunta
crítica. Reparte las restantes sin repetir enunciados. Cada respuesta debe
incluir evidencia textual o una justificación verificable.
Devuelve SOLO JSON:
{{
  "titulo":"...",
  "instrucciones":"...",
  "estrategia_lectora":"...",
  "fuente":"Texto original generado para la actividad",
  "texto":"...",
  "preguntas":[{{
    "numero":1,
    "tipo":"literal|inferencial|vocabulario|critica",
    "dificultad":"baja|media|alta",
    "enunciado":"...",
    "respuesta_esperada":"...",
    "evidencia_textual":"...",
    "justificacion":"..."
  }}]
}}"""

    result = await llm.generate_json("lectura_comprensiva", prompt)
    if not isinstance(result, dict):
        result = {}

    preguntas = result.get("preguntas", [])
    if not isinstance(preguntas, list):
        preguntas = []

    titulo = (result.get("titulo") or req.titulo or "Lectura comprensiva").strip()
    texto = (result.get("texto") or "").strip()

    return {**result, "titulo": titulo, "texto": texto, "preguntas": preguntas}
