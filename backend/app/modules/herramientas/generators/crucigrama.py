"""Crucigrama: el LLM solo aporta palabras + pistas; la grilla se arma en Python.

Pedirle la grilla al modelo producía crucigramas irresolubles (letras que no
coincidían con las palabras, intersecciones imposibles). Ahora el modelo se
concentra en lo que hace bien —definiciones pedagógicas— y `build_crossword`
garantiza una grilla válida y conectada.
"""
from __future__ import annotations

from app.core.logging import get_logger
from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.puzzle_builder import build_crossword, normalize_word
from app.modules.herramientas.schemas import CrucigramaRequest
from app.services.llm_router import LLMRouter

logger = get_logger(__name__)

MIN_WORDS = 4


def limit_to_requested(entries: list[dict], grid: dict, cantidad: int) -> dict:
    """Deja como máximo las palabras pedidas por el docente.

    El armado ubica las palabras de la más larga a la más corta y cada una se
    apoya solo en las anteriores; por eso rearmar con las primeras ubicadas
    conserva un crucigrama conectado.
    """
    placed = {item["respuesta"] for item in grid["pistas_horizontal"] + grid["pistas_vertical"]}
    if len(placed) <= cantidad:
        return grid
    ordered = sorted(
        (entry for entry in entries if normalize_word(entry["respuesta"]) in placed),
        key=lambda entry: len(normalize_word(entry["respuesta"])),
        reverse=True,
    )
    trimmed = build_crossword(ordered[:cantidad], max_size=17)
    if trimmed is None:
        return grid
    return trimmed


_EMPTY_GRID = {
    "grid": [], "size": 0, "filas": 0, "columnas": 0,
    "pistas_horizontal": [], "pistas_vertical": [], "palabras_sin_ubicar": [],
}


def _extract_entries(result: dict) -> list[dict]:
    """Recolecta pares respuesta/pista de las distintas formas que el LLM o la
    plantilla local puedan devolver, y los deja listos para el builder."""
    entries: list[dict] = []
    candidates: list = []
    for key in ("palabras", "preguntas", "entradas"):
        val = result.get(key)
        if isinstance(val, list):
            candidates += val
    for key in ("preguntas_horizontales", "preguntas_verticales"):
        val = result.get(key)
        if isinstance(val, list):
            candidates += val
    nested = result.get("crucigrama")
    if isinstance(nested, dict):
        for key in ("pistas_horizontal", "pistas_vertical"):
            val = nested.get(key)
            if isinstance(val, list):
                candidates += val

    seen: set[str] = set()
    for item in candidates:
        if not isinstance(item, dict):
            continue
        respuesta = item.get("respuesta") or item.get("palabra") or ""
        pista = item.get("pista") or item.get("definicion") or item.get("clue") or ""
        norm = normalize_word(respuesta)
        if not norm or not str(pista).strip() or norm in seen:
            continue
        seen.add(norm)
        entries.append({"respuesta": respuesta, "pista": str(pista).strip()})
    return entries


async def generate(req: CrucigramaRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    # Pedimos algunas palabras de más: el armado descarta las que no logran
    # intersección, así nos acercamos a la cantidad solicitada.
    objetivo = req.cantidad_preguntas + 3
    prompt = f"""{TOOLS_SYSTEM}

{ctx}

Genera {objetivo} conceptos clave del tema para un crucigrama, con su pista.
Reglas para cada respuesta:
- UNA sola palabra, sin espacios, sin tildes, sin números (4 a 12 letras ideal).
- Que compartan letras comunes entre sí (facilita los cruces).
- La pista es una definición breve y clara para el grado indicado.
NO dibujes la grilla. Devuelve SOLO JSON:
{{"titulo":"...","instrucciones":"...","palabras":[{{"respuesta":"FOTOSINTESIS","pista":"Proceso por el que las plantas fabrican su alimento."}}]}}"""

    result = await llm.generate_json("crucigrama", prompt)
    if not isinstance(result, dict):
        result = {}

    # Spec 195: sin relleno de otro tema. Con pocas palabras, el control de
    # calidad pide un segundo intento y, si tampoco, el docente ve el motivo.
    entries = _extract_entries(result)
    if len(entries) < MIN_WORDS:
        logger.warning("Crucigrama: la IA aportó %d palabras usables.", len(entries))

    # Algunas candidatas de más ayudan a lograr cruces; después se recorta a lo pedido.
    entries = entries[: max(req.cantidad_preguntas + 4, 8)]

    grid = build_crossword(entries, max_size=17)
    grid = dict(_EMPTY_GRID) if grid is None else limit_to_requested(entries, grid, req.cantidad_preguntas)

    titulo = (result.get("titulo") or req.titulo or "Crucigrama").strip()
    instrucciones = (
        result.get("instrucciones")
        or "Lee cada pista y completa el crucigrama con la palabra correcta. "
        "Los números indican dónde inicia cada palabra (horizontal o vertical)."
    ).strip()

    return {
        "titulo": titulo,
        "instrucciones": instrucciones,
        "preguntas_horizontales": grid["pistas_horizontal"],
        "preguntas_verticales": grid["pistas_vertical"],
        "crucigrama": {
            "grid": grid["grid"],
            "size": grid["size"],
            "filas": grid["filas"],
            "columnas": grid["columnas"],
            "pistas_horizontal": grid["pistas_horizontal"],
            "pistas_vertical": grid["pistas_vertical"],
        },
        "palabras_sin_ubicar": grid["palabras_sin_ubicar"],
        **({"criterios": result["criterios"]} if "criterios" in result else {}),
    }
