"""Sopa de letras: la grilla se construye en Python a partir de las palabras
del profesor. El LLM solo se usa (de forma opcional y tolerante a fallos) para
enriquecer el banco con una pista breve por palabra.

Antes se le pedía al modelo que dibujara la grilla, y casi nunca contenía las
palabras en las posiciones indicadas. Ahora cada palabra está garantizada.
"""
from __future__ import annotations

from app.core.logging import get_logger
from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.puzzle_builder import build_word_search, normalize_word
from app.modules.herramientas.schemas import SopaLetrasRequest
from app.services.llm_router import LLMRouter

logger = get_logger(__name__)


async def _pistas_opcionales(req: SopaLetrasRequest, llm: LLMRouter) -> dict[str, str]:
    """Intenta obtener una pista por palabra. Cualquier fallo se ignora."""
    try:
        ctx = build_base_context(req)
        palabras = ", ".join(req.palabras_clave)
        prompt = f"""{TOOLS_SYSTEM}

{ctx}
Palabras: {palabras}

Para cada palabra da una pista corta (máx. 8 palabras), apropiada para el grado.
Devuelve SOLO JSON: {{"pistas":[{{"palabra":"...","pista":"..."}}]}}"""
        result = await llm.generate_json("sopa_letras_pistas", prompt)
        out: dict[str, str] = {}
        for item in (result or {}).get("pistas", []):
            if isinstance(item, dict):
                key = normalize_word(item.get("palabra", ""))
                pista = str(item.get("pista", "")).strip()
                if key and pista:
                    out[key] = pista
        return out
    except Exception as exc:  # noqa: BLE001
        logger.info("Sopa de letras: pistas opcionales no disponibles: %s", exc)
        return {}


async def generate(req: SopaLetrasRequest, llm: LLMRouter) -> dict:
    puzzle = build_word_search(
        req.palabras_clave,
        size=req.tamanio_grilla,
        allow_diagonal=True,
        allow_reverse=True,
    )

    pistas = await _pistas_opcionales(req, llm)
    banco = []
    for palabra in puzzle["banco_palabras"]:
        entry = {"palabra": palabra}
        if palabra in pistas:
            entry["pista"] = pistas[palabra]
        banco.append(entry)

    titulo = (req.titulo or "Sopa de letras").strip()
    instrucciones = (
        f"Encuentra las {len(puzzle['banco_palabras'])} palabras del banco en la "
        "sopa de letras. Pueden estar en horizontal, vertical o diagonal, y "
        "algunas al revés. Enciérralas en un círculo."
    )

    return {
        "titulo": titulo,
        "instrucciones": instrucciones,
        # Claves de compatibilidad con el frontend existente.
        "grilla": puzzle["grid"],
        "palabras": puzzle["palabras"],
        "banco_palabras": puzzle["banco_palabras"],
        "banco": banco,
        "sopa_letras": {
            "grid": puzzle["grid"],
            "palabras": puzzle["palabras"],
            "size": puzzle["size"],
        },
        "palabras_sin_ubicar": puzzle["palabras_sin_ubicar"],
    }
