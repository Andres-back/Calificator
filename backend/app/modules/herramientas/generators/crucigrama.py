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

_FALLBACK_PALABRAS = [
    {"respuesta": "OBSERVAR", "pista": "Primer paso del método científico: mirar con atención."},
    {"respuesta": "REGISTRO", "pista": "Anotar de forma ordenada lo que se descubre."},
    {"respuesta": "EVIDENCIA", "pista": "Dato o prueba que apoya una conclusión."},
    {"respuesta": "HIPOTESIS", "pista": "Explicación tentativa que se pone a prueba."},
    {"respuesta": "EXPERIMENTO", "pista": "Prueba controlada para responder una pregunta."},
    {"respuesta": "CONCLUSION", "pista": "Idea final a la que se llega tras analizar."},
]


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

    entries = _extract_entries(result)
    if len(entries) < 4:
        logger.warning("Crucigrama: el LLM aportó %d palabras usables; usando refuerzo.", len(entries))
        existentes = {normalize_word(e["respuesta"]) for e in entries}
        for fb in _FALLBACK_PALABRAS:
            if normalize_word(fb["respuesta"]) not in existentes:
                entries.append(fb)

    # Limita a un poco más de lo pedido para no saturar la grilla.
    entries = entries[: max(req.cantidad_preguntas + 4, 8)]

    grid = build_crossword(entries, max_size=17)
    if grid is None:
        grid = build_crossword(_FALLBACK_PALABRAS, max_size=17)

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
    }
