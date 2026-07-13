"""Emparejar: variante de unir columnas para relacionar pares afines
(concepto↔ejemplo, palabra↔sinónimo, problema↔resultado). El LLM aporta los
pares; Python baraja y arma la clave."""
from __future__ import annotations

from app.core.logging import get_logger
from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.generators.unir_columnas import _extract_pairs
from app.modules.herramientas.puzzle_builder import build_matching
from app.modules.herramientas.schemas import EmparejarRequest
from app.services.llm_router import LLMRouter

logger = get_logger(__name__)

_FALLBACK_PARES = [
    {"izquierda": "Sólido", "derecha": "Roca"},
    {"izquierda": "Líquido", "derecha": "Agua"},
    {"izquierda": "Gaseoso", "derecha": "Aire"},
    {"izquierda": "Luminoso", "derecha": "Sol"},
]


async def generate(req: EmparejarRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    prompt = f"""{TOOLS_SYSTEM}

{ctx}

Genera {req.cantidad_pares} pares para emparejar (relacionar elementos afines:
concepto↔ejemplo, palabra↔sinónimo, categoría↔elemento). Ambos lados deben ser
cortos (1-4 palabras), apropiados para el grado.
Devuelve SOLO JSON:
{{"titulo":"...","instrucciones":"...","pares":[{{"izquierda":"...","derecha":"..."}}]}}"""

    result = await llm.generate_json("emparejar", prompt)
    if not isinstance(result, dict):
        result = {}

    pairs = _extract_pairs(result)
    if len(pairs) < 3:
        logger.warning("Emparejar: LLM aportó %d pares; usando refuerzo.", len(pairs))
        pairs = (pairs + _FALLBACK_PARES)[: max(req.cantidad_pares, 4)]
    pairs = pairs[: req.cantidad_pares]

    matching = build_matching(pairs)

    titulo = (result.get("titulo") or req.titulo or "Emparejar").strip()
    instrucciones = (
        result.get("instrucciones")
        or "Relaciona cada elemento de la columna izquierda con el que le "
        "corresponde en la columna derecha."
    ).strip()

    return {
        "titulo": titulo,
        "instrucciones": instrucciones,
        **matching,
    }
