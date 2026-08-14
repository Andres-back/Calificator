"""
Normaliza el JSON de diapositivas antes de renderizarlo y exportarlo.
Reglas críticas:
- Nunca pasar image=undefined.
- Si falla una imagen, usar placeholder.
- Arrays siempre deben existir (nunca None).
"""

from __future__ import annotations

PLACEHOLDER_IMAGE = "/static/placeholder_educational.svg"


def normalize_slide(slide: dict) -> dict:
    """Normaliza un slide individual."""
    normalized = dict(slide)

    # Título siempre debe ser string
    if not normalized.get("title"):
        normalized["title"] = "Diapositiva"

    # Puntos/bullets siempre lista de strings
    bullets = normalized.get("bullets") or normalized.get("points") or []
    if not isinstance(bullets, list):
        bullets = [str(bullets)]
    normalized["bullets"] = [str(b) for b in bullets if b]

    # Imagen: nunca None ni undefined
    image = normalized.get("image")
    if not image or image in ("undefined", "null", ""):
        normalized["image"] = PLACEHOLDER_IMAGE

    # Notas del presentador
    if not normalized.get("notes"):
        normalized["notes"] = ""

    return normalized


def normalize_presentation(slides: list[dict]) -> list[dict]:
    """Normaliza toda la presentación."""
    if not slides:
        return [
            {
                "title": "Sin contenido",
                "bullets": [],
                "image": PLACEHOLDER_IMAGE,
                "notes": "",
            }
        ]
    return [normalize_slide(s) for s in slides]
