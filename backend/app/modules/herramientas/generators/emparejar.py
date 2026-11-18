"""Emparejar: variante de unir columnas para relacionar pares afines
(concepto↔ejemplo, palabra↔sinónimo, problema↔resultado). El LLM aporta los
pares; Python baraja y arma la clave."""
from __future__ import annotations

from app.core.logging import get_logger
from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.generators.unir_columnas import MIN_PAIRS, _extract_pairs, unique_pairs
from app.modules.herramientas.puzzle_builder import build_matching
from app.modules.herramientas.schemas import EmparejarRequest
from app.services.llm_router import LLMRouter

logger = get_logger(__name__)

PAIR_RULES = """Reglas obligatorias:
- Cada elemento de la derecha corresponde a UN solo elemento de la izquierda, y al revés.
  Si un estudiante puede defender dos parejas distintas, la actividad está mal hecha.
- No repitas elementos ni uses dos que signifiquen lo mismo o se solapen
  (por ejemplo "Invertebrado" y "Sin columna vertebral", o "Mamífero" y "Animal").
- Todas las parejas son del mismo tipo de relación (todas concepto-definición, o todas
  ejemplo-categoría con categorías distintas, o todas causa-efecto).
- Todo debe tratar del tema indicado."""


async def generate(req: EmparejarRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    prompt = f"""{TOOLS_SYSTEM}

{ctx}

Genera {req.cantidad_pares} pares para relacionar (concepto↔definición breve,
ejemplo↔categoría, causa↔efecto). Ambos lados deben ser cortos (1-6 palabras) y
apropiados para el grado.
{PAIR_RULES}
Devuelve SOLO JSON:
{{"titulo":"...","instrucciones":"...","pares":[{{"izquierda":"...","derecha":"..."}}]}}"""

    result = await llm.generate_json("emparejar", prompt)
    if not isinstance(result, dict):
        result = {}

    # Spec 195: sin relleno de otro tema. Si llegan pocas parejas, el control de
    # calidad pide un segundo intento y, si tampoco, el docente ve el motivo.
    pairs = unique_pairs(_extract_pairs(result))[: req.cantidad_pares]
    if len(pairs) < MIN_PAIRS:
        logger.warning("Emparejar: la IA aportó %d parejas válidas.", len(pairs))

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
