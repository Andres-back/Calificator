"""Conservative print-only layout decisions, shared by PDF and Word."""

from copy import deepcopy
from decimal import Decimal, InvalidOperation
from io import BytesIO
import re

from PIL import Image, ImageChops

from app.modules.evaluaciones.print_settings import (
    MaterialLayout,
    resolve_print_settings,
)


def option_columns(options: list[str]) -> int:
    return (
        2
        if 1 < len(options) <= 4
        and max(map(len, options), default=0) <= 90
        and sum(map(len, options)) <= 240
        else 1
    )


def prepare_print_material(material: dict) -> dict:
    """Resolve only an explicit evaluation preference; never rewrite its source."""
    # Presentation metadata is computed here, never trusted from a stored question.
    prepared = deepcopy(material)
    content = prepared.get("contenido_json") or {}
    for key in list(content):
        if key.startswith("_print_"):
            content.pop(key)
    for question in content.get("preguntas") or []:
        if isinstance(question, dict):
            for key in list(question):
                if key.startswith("_print_"):
                    question.pop(key)
    resolved = (
        resolve_print_settings(content.get("configuracion_impresion"))
        if material.get("tipo") == "examen"
        else None
    )
    if resolved is None:
        return prepared
    from app.modules.evaluaciones.visual_render import ResolvedVisualBlock

    content["impresion_compacta"] = resolved.distribucion == "compacta"
    content["advertencias_impresion"] = []
    questions = content.get("preguntas") or []
    section_material = {'_evaluation_visuals': content.get('_document_visuals') or []}
    for question in [*questions, section_material]:
        identifier = question.get("contenido_id")
        override = next(
            (
                value
                for key, value in resolved.configuracion.respuestas.items()
                if str(key) == identifier
            ),
            None,
        )
        try:
            stored = max(
                1,
                min(
                    12, int(question.get("lineas_respuesta") or resolved.lineas_abierta)
                ),
            )
        except (ValueError, TypeError):
            stored = resolved.lineas_abierta
        question["_print_lines"] = (
            (override.lineas if override and override.lineas else stored)
            if not question.get("opciones")
            else 0
        )
        if (
            not (override and override.lineas)
            and not question.get("lineas_respuesta")
            and re.search(r"_{3,}", str(question.get("enunciado") or ""))
        ):
            question["_print_lines"] = (
                0  # The printed statement already contains answer blanks.
            )
        question["_print_drawing_mm"] = override.dibujo_mm if override else None
        if question['_print_drawing_mm']:
            question['_print_lines'] = 0
        layouts = {}
        visuals = []
        for item in question.get("_evaluation_visuals") or []:
            layout = resolved.configuracion.materiales.get(
                item.block.id
            ) or MaterialLayout(ancho_porcentaje=100)
            layouts[str(item.block.id)] = layout.model_dump(mode="json")
            data = item.image_bytes
            if resolved.blanco_negro and data:
                with Image.open(BytesIO(data)) as source:
                    r, g, b = source.convert("RGB").split()
                    colored = (
                        max(
                            ImageChops.difference(r, g).getextrema()[1],
                            ImageChops.difference(g, b).getextrema()[1],
                        )
                        > 12
                    )
                    if colored and not layout.convertir_color_confirmado:
                        content["advertencias_impresion"].append(
                            "Se conserva una figura a color. Confirma que el color no es necesario para responder antes de convertirla."
                        )
                    elif colored:
                        target = BytesIO()
                        alpha = 'A' in source.getbands() or 'transparency' in source.info
                        derivative = source.convert('RGBA').convert('LA') if alpha else source.convert('L')
                        derivative.save(target, 'PNG')
                        data = target.getvalue()
            visuals.append(ResolvedVisualBlock(item.block, data))
        question["_evaluation_visuals"] = visuals
        question["_print_visual_layouts"] = layouts
        question["_print_lateral"] = bool(
            len(visuals) == 1
            and visuals[0].block.tipo in {"imagen", "dibujo"}
            and layouts[str(visuals[0].block.id)]["disposicion"] == "lateral"
            and layouts[str(visuals[0].block.id)]["ancho_porcentaje"] <= 50
        )
        if not question['_print_lateral'] and any(layout['disposicion'] == 'lateral' for layout in layouts.values()):
            content['advertencias_impresion'].append('Una pregunta tiene varios materiales o una tabla detallada: se colocan debajo para conservar su lectura.')
        question["_print_option_columns"] = (
            option_columns([str(value) for value in question.get("opciones") or []])
            if resolved.distribucion == "compacta" and not question["_print_lateral"]
            else 1
        )
    if content.get('documento') is not None:
        content['_document_visuals'] = section_material['_evaluation_visuals']
    try:
        scores = [Decimal(str(question["puntaje"])) for question in questions]
        if scores and all(score.is_finite() and score == scores[0] for score in scores):
            content["_print_common_score"] = format(scores[0].normalize(), "f")
    except (KeyError, InvalidOperation):
        pass
    return prepared


def print_css(configuration: dict | None) -> str:
    resolved = resolve_print_settings(configuration)
    if resolved is None:
        return ""
    font = resolved.fuente_pt
    gap = {"compacta": 1, "media": 4, "amplia": 7}[resolved.distribucion]
    accent = "#111" if resolved.blanco_negro else "#4338ca"
    return f"""
    @page {{ size:Letter; margin:12mm 14mm 13mm; }}
    body {{ font-size:{font}pt; color:#111; }}
    .topbar,.sectionbar {{ display:none; }}
    .title {{ font-size:{font + 5.5}pt; text-align:left; color:{accent}; margin:0 0 2pt; }}
    .subtitle {{ text-align:left; font-size:10pt; color:#333; margin:0 0 5pt; }}
    .header-form {{ margin:0 0 3pt; }}
    .header-form td {{ padding:2pt; font-size:10pt; }}
    .header-line {{ min-width:52mm; }} .header-line.short {{ min-width:26mm; }}
    .instr {{ border:0; border-bottom:.6pt solid #999; border-radius:0; background:white!important;
        color:#111!important; border-color:#999!important; font-size:{max(10, font - 0.5)}pt;
        line-height:1.1; padding:2pt 0 3pt; margin-bottom:3pt; }}
    .card {{ padding:{gap}pt 0!important; margin-bottom:{gap}pt!important; border-radius:0; border-color:#aaa; background:white; }}
    .h3 {{ color:{accent}; }} table.grid th {{ background:#eee; color:#111; }}
    table.grid td,table.grid th {{ border-color:#999; }}
    .p {{ font-size:{font}pt; line-height:1.1; margin:0 0 2pt; }}
    .opt {{ font-size:{font}pt; line-height:1.05; margin:1pt 0; }}
    .opt {{ color:#111!important; }} .opt .circle,.pts {{ color:{accent}; }} .pts {{ font-size:{max(10, font - 0.5)}pt; }}
    .compact-options td {{ padding:1pt 4pt 1pt 0!important; }}
    .line {{ height:{5.5 + gap / 2}mm; margin:0; border-color:#777; }}
    .question-figure-row {{ width:100%; border-collapse:collapse; table-layout:fixed; }}
    .question-figure-row td {{ vertical-align:top; padding:0; }}
    .question-figure-text {{ padding-right:5mm!important; }}
    .print-visual figure {{ margin:2pt 0!important; }}
    .print-visual img {{ max-width:100%!important; width:100%!important; height:auto!important;
        max-height:190mm!important; object-fit:contain; }}
    .question-figure-row .print-visual img {{ max-height:100mm!important; }}
    figcaption,.figure-caption {{ font-size:{max(10, font - 0.5)}pt; line-height:1.15; margin:1pt 0; }}
    """
