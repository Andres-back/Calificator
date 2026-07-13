"""Unir columnas: el LLM aporta pares término↔definición; Python baraja la
columna derecha y arma la clave de respuestas."""
from __future__ import annotations

from app.core.logging import get_logger
from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.puzzle_builder import build_matching
from app.modules.herramientas.schemas import UnirColumnasRequest
from app.services.llm_router import LLMRouter

logger = get_logger(__name__)

_FALLBACK_PARES = [
    {"izquierda": "Observación", "derecha": "Mirar con atención un fenómeno."},
    {"izquierda": "Hipótesis", "derecha": "Explicación tentativa por comprobar."},
    {"izquierda": "Experimento", "derecha": "Prueba controlada para responder una pregunta."},
    {"izquierda": "Conclusión", "derecha": "Idea final tras analizar los resultados."},
]


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
Devuelve SOLO JSON:
{{"titulo":"...","instrucciones":"...","pares":[{{"izquierda":"...","derecha":"..."}}]}}"""

    result = await llm.generate_json("unir_columnas", prompt)
    if not isinstance(result, dict):
        result = {}

    pairs = _extract_pairs(result)
    if len(pairs) < 3:
        logger.warning("Unir columnas: LLM aportó %d pares; usando refuerzo.", len(pairs))
        pairs = (pairs + _FALLBACK_PARES)[: max(req.cantidad_pares, 4)]
    pairs = pairs[: req.cantidad_pares]

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
