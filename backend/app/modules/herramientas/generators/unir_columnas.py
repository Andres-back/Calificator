"""Unir columnas: el LLM aporta pares término↔definición; Python baraja la
columna derecha y arma la clave de respuestas."""
from __future__ import annotations

from app.core.logging import get_logger
from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.puzzle_builder import build_matching, strip_accents
from app.modules.herramientas.schemas import UnirColumnasRequest
from app.services.llm_router import LLMRouter

logger = get_logger(__name__)

MIN_PAIRS = 3


def _pair_key(text: str) -> str:
    return " ".join(strip_accents(str(text)).casefold().split()).strip(" .,;:")


def unique_pairs(pairs: list[dict]) -> list[dict]:
    """Descarta parejas que repiten un lado: una respuesta repetida vuelve ambigua la actividad."""
    seen_left: set[str] = set()
    seen_right: set[str] = set()
    unique: list[dict] = []
    for pair in pairs:
        left, right = _pair_key(pair.get("izquierda", "")), _pair_key(pair.get("derecha", ""))
        if not left or not right or left == right or left in seen_left or right in seen_right:
            continue
        seen_left.add(left)
        seen_right.add(right)
        unique.append(pair)
    return unique


def _extract_pairs(result: dict) -> list[dict]:
    pairs: list[dict] = []
    candidates = []
    for key in ("pares", "parejas", "items", "columnas"):
        val = result.get(key)
        if isinstance(val, list):
            candidates += val
    for item in candidates:
        if isinstance(item, dict):
            a = item.get("izquierda") or item.get("concepto") or item.get("termino")
            b = item.get("derecha") or item.get("definicion") or item.get("pareja")
            if a and b:
                pairs.append({"izquierda": str(a).strip(), "derecha": str(b).strip()})
    return pairs


async def generate(req: UnirColumnasRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    prompt = f"""{TOOLS_SYSTEM}

{ctx}

Genera {req.cantidad_pares} pares de "término ↔ definición" del tema, para una
actividad de unir columnas. El término (izquierda) debe ser corto (1-3 palabras)
y la definición (derecha) una frase breve y clara para el grado.
Cada definición debe corresponder a un solo término: no repitas ni uses dos que
signifiquen lo mismo. Todo debe tratar del tema indicado.
Devuelve SOLO JSON:
{{"titulo":"...","instrucciones":"...","pares":[{{"izquierda":"...","derecha":"..."}}]}}"""

    result = await llm.generate_json("unir_columnas", prompt)
    if not isinstance(result, dict):
        result = {}

    pairs = unique_pairs(_extract_pairs(result))[: req.cantidad_pares]
    if len(pairs) < MIN_PAIRS:
        logger.warning("Unir columnas: la IA aportó %d parejas válidas.", len(pairs))

    matching = build_matching(pairs)

    titulo = (result.get("titulo") or req.titulo or "Unir columnas").strip()
    instrucciones = (
        result.get("instrucciones")
        or "Une con una línea cada término de la columna izquierda con su "
        "definición en la columna derecha."
    ).strip()

    return {
        "titulo": titulo,
        "instrucciones": instrucciones,
        **matching,
    }
