from __future__ import annotations

from app.modules.herramientas.generators.base import build_base_context
from app.modules.herramientas.schemas import ParaColorearRequest


def build_prompt(req: ParaColorearRequest) -> str:
    ctx = build_base_context(req)
    detail = "lineas simples, pocos detalles" if req.estilo == "simple" else "lineas claras con detalles moderados"
    return (
        "Dibujo educativo para colorear en blanco y negro, estilo libro de colorear infantil. "
        "Solo contornos limpios, fondo blanco, sin color, sin sombras, sin texto pequeno, "
        "sin rellenos oscuros. "
        f"{detail}. "
        f"Contenido solicitado por el docente:\n{ctx}"
    )


def build_content(req: ParaColorearRequest, image: dict) -> dict:
    return {
        "titulo": req.titulo,
        "instrucciones": "Colorea el dibujo siguiendo las indicaciones del docente.",
        "tema": req.tema,
        "estilo": req.estilo,
        "prompt_imagen": build_prompt(req),
        "imagen": image,
        "uso_docente": [
            "Usa el dibujo como actividad de inicio, refuerzo o cierre.",
            "Pide al estudiante nombrar los elementos que reconoce antes de colorear.",
            "Puedes agregar vocabulario, trazos o preguntas alrededor de la imagen impresa.",
        ],
    }
