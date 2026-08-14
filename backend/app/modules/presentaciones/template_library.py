"""Plantillas visuales nativas de XCalificator.

Los patrones útiles del antiguo editor externo se conservaron como reglas
propias: portada visual, imagen con explicación, alternancia izquierda/derecha,
contenido editable y lienzo visual completo.
"""

from __future__ import annotations

from typing import Literal


SlideLayout = Literal[
    "cover", "full_image", "split-left", "split-right", "text", "math-arrays"
]


def choose_layout(
    *,
    role: str,
    index: int,
    layout_hint: str,
    has_visual: bool,
) -> SlideLayout:
    normalized_role = str(role or "").strip().lower()
    hint = str(layout_hint or "").strip().lower().replace("_", "-")

    if index == 0 or normalized_role == "cover" or hint == "cover":
        return "cover"
    if hint == "full-image":
        return "full_image"
    if hint in {"editable", "text"} or not has_visual:
        return "text"

    # Patrón rescatado de image-and-description: imagen y explicación breve
    # en columnas equilibradas. Alternar evita una secuencia monótona.
    return "split-left" if index % 2 else "split-right"


def layout_family(layout: str) -> str:
    if layout in {"split-left", "split-right"}:
        return "image-and-description"
    if layout == "full_image":
        return "visual-canvas"
    if layout == "cover":
        return "cover"
    return "editable-content"
