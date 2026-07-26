"""Flashcards: pares de tarjetas con concepto por un lado y definición por el otro."""
from __future__ import annotations

from app.core.logging import get_logger
from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.schemas import FlashcardsRequest
from app.services.llm_router import LLMRouter

logger = get_logger(__name__)


async def generate(req: FlashcardsRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    prompt = f"""{TOOLS_SYSTEM}

{ctx}

Genera {req.cantidad_tarjetas} tarjetas de estudio (flashcards) sobre el tema.
Cada tarjeta tiene un concepto (anverso, 1-4 palabras) y su definición o
explicación (reverso, 1-3 frases). Apropiado para el grado.
Devuelve SOLO JSON:
{{"titulo":"...","instrucciones":"...","tarjetas":[{{"numero":1,"anverso":"...","reverso":"..."}}]}}"""

    result = await llm.generate_json("flashcards", prompt)
    if not isinstance(result, dict):
        result = {}

    tarjetas = result.get("tarjetas", [])
    if not isinstance(tarjetas, list):
        tarjetas = []

    titulo = (result.get("titulo") or req.titulo or "Flashcards").strip()
    instrucciones = (result.get("instrucciones") or "Estudia cada tarjeta: lee el concepto e intenta recordar la definición.").strip()

    return {
        "titulo": titulo,
        "instrucciones": instrucciones,
        "tarjetas": tarjetas,
    }
