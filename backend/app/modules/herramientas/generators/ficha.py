"""Ficha didáctica: hoja de trabajo con ejercicios variados sobre un tema."""
from __future__ import annotations

from app.core.logging import get_logger
from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.schemas import FichaRequest
from app.services.llm_router import LLMRouter

logger = get_logger(__name__)


async def generate(req: FichaRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    prompt = f"""{TOOLS_SYSTEM}

{ctx}

Genera una ficha didáctica con {req.cantidad_ejercicios} ejercicios variados
(completar, opción múltiple, desarrollo corto, verdadero/falso, dibujar) para
reforzar el tema. Cada ejercicio debe tener instrucciones claras para el
estudiante y un espacio de respuesta. Para los ejercicios con respuestas
cerradas incluye la respuesta correcta en "respuesta_esperada".
Devuelve SOLO JSON:
{{"titulo":"...","objetivo":"...","instrucciones":"...","ejercicios":[{{"numero":1,"tipo":"...","enunciado":"...","respuesta_esperada":"...","espacio_respuesta":true}}]}}"""

    result = await llm.generate_json("ficha", prompt)
    if not isinstance(result, dict):
        result = {}

    ejercicios = result.get("ejercicios", [])
    if not isinstance(ejercicios, list):
        ejercicios = []

    titulo = (result.get("titulo") or req.titulo or "Ficha didáctica").strip()
    objetivo = (result.get("objetivo") or "").strip()
    instrucciones = (result.get("instrucciones") or "Resuelve los siguientes ejercicios.").strip()

    return {
        "titulo": titulo,
        "objetivo": objetivo,
        "instrucciones": instrucciones,
        "ejercicios": ejercicios,
    }
