"""Render de materiales a PDF con HTML/CSS (WeasyPrint).

Clona la estética del frontend de XCalificator (tema índigo/violeta, tarjetas
redondeadas, insignias de color, cables SVG en unir-columnas/emparejar, chips
tipo píldora) para que el material impreso luzca como la app, en vez de las
tablas planas de reportlab.

Función pública: ``render_material_pdf(material, soluciones=False) -> bytes``.
"""
from __future__ import annotations

import re
from html import escape
from typing import Any

# ── Paleta (igual que el frontend) ──────────────────────────────────────────
INDIGO = "#4F46E5"
INDIGO_DARK = "#3730A3"
VIOLET = "#7C3AED"
GRAY = "#374151"
CABLE_COLORS = [
    "#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
    "#06B6D4", "#EF4444", "#84CC16", "#F97316", "#14B8A6",
]

TOOL_LABELS = {
    "sopa_letras": "Sopa de Letras",
    "crucigrama": "Crucigrama",
    "unir_columnas": "Unir Columnas",
    "emparejar": "Emparejar",
    "cuento": "Cuento",
    "para_colorear": "Para Colorear",
    "guia": "Guía de Aprendizaje",
    "taller": "Taller",
    "examen": "Examen",
    "rubrica": "Rúbrica",
    "plan_refuerzo": "Plan de Refuerzo",
}

BASE_CSS = f"""
@page {{
  size: Letter;
  margin: 44px 42px 48px 42px;
  @bottom-center {{
    content: "XCalificator · Plataforma Educativa IA   —   Página " counter(page);
    font-size: 8px; color: #9CA3AF;
  }}
}}
* {{ box-sizing: border-box; }}
body {{ font-family: 'DejaVu Sans', sans-serif; color: {GRAY}; font-size: 11px; }}
.topbar {{
  margin: -44px -42px 18px -42px;
  background: linear-gradient(90deg, {INDIGO}, {VIOLET});
  color: #fff; padding: 13px 42px;
  display: flex; justify-content: space-between; align-items: center;
}}
.topbar .htitle {{ font-size: 13px; font-weight: bold; }}
.topbar .brand {{ font-size: 9px; opacity: .92; }}
.title {{ text-align: center; color: {INDIGO}; font-size: 23px; font-weight: bold; margin: 2px 0 1px; }}
.subtitle {{ text-align: center; color: #9CA3AF; font-size: 8.5px; margin-bottom: 14px; }}
.sectionbar {{
  background: {VIOLET}; color: #fff; font-weight: bold; font-size: 12px;
  padding: 8px 13px; border-radius: 9px; margin: 14px 0 12px; letter-spacing: .4px;
}}
.instr {{
  background: #FFFBEB; border: 1px solid #FDE68A; color: #92400E;
  border-radius: 12px; padding: 11px 14px; font-size: 10.5px; margin-bottom: 12px;
}}
.instr.indigo {{ background: #EEF2FF; border-color: #C7D2FE; color: {INDIGO_DARK}; }}
.cluecol {{ width: 50%; vertical-align: top; padding-right: 14px; }}
.clueh {{ color: {VIOLET}; font-size: 12px; font-weight: bold; margin: 4px 0 6px; }}
.clue {{ font-size: 10.5px; margin: 0 0 5px; line-height: 1.35; }}
.clue .n {{ display: inline-block; min-width: 16px; font-weight: bold; color: {INDIGO}; }}
/* ── Crucigrama ── */
table.cw {{ border-collapse: separate; border-spacing: 2px; margin: 0 auto; }}
table.cw td {{
  width: 27px; height: 27px; padding: 0; text-align: center; vertical-align: middle;
  position: relative; font-family: 'DejaVu Sans Mono', monospace; font-weight: bold; font-size: 13px;
}}
td.cell {{ background: #fff; border: 1.2px solid #CBD5E1; color: #111827; border-radius: 5px; }}
td.block {{ background: transparent; border: 0; }}
td .num {{ position: absolute; top: 0; left: 1px; font-size: 7px; font-weight: bold;
          color: {INDIGO}; font-family: 'DejaVu Sans', sans-serif; line-height: 1; }}
.cw-wrap {{ display: inline-block; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 10px; }}
/* ── Sopa de letras ── */
table.ws {{ border-collapse: collapse; margin: 0 auto; border: 2px solid #C7D2FE; border-radius: 8px; }}
table.ws td {{
  width: 25px; height: 25px; text-align: center; vertical-align: middle;
  font-family: 'DejaVu Sans Mono', monospace; font-weight: bold; font-size: 13px;
  color: #374151; border: 1px solid #EEF2FF;
}}
table.ws td.hit {{ background: #DCFCE7; color: #15803D; border-radius: 50%; }}
.bank {{ text-align: center; margin-top: 14px; }}
.pill {{
  display: inline-block; background: #EEF2FF; color: {INDIGO_DARK};
  border: 1px solid #C7D2FE; border-radius: 999px; padding: 4px 13px;
  font-size: 10.5px; font-weight: bold; margin: 3px;
}}
.bank-title {{ color: {VIOLET}; font-weight: bold; font-size: 11px; margin-bottom: 8px; text-align: left; }}
/* ── Matching (unir / emparejar) ── */
.colhead {{ font-size: 9px; font-weight: bold; color: #6B7280; text-transform: uppercase;
            letter-spacing: .6px; }}
.mcard {{
  position: absolute; display: flex; align-items: center; gap: 9px;
  border: 1.6px solid #E5E7EB; border-radius: 12px; background: #fff;
  padding: 0 12px; font-size: 11px; font-weight: 500; color: #1F2937;
}}
.badge {{
  min-width: 22px; width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: bold; color: #fff; flex-shrink: 0;
}}
.answerkey {{ margin-top: 16px; }}
.answerkey .pill {{ background: #ECFDF5; border-color: #A7F3D0; color: #15803D; }}
/* ── Texto genérico (cuento/guía/taller/examen/rúbrica/plan) ── */
.card {{ border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }}
.h3 {{ color: {VIOLET}; font-size: 12.5px; font-weight: bold; margin: 12px 0 6px; }}
.p {{ font-size: 11px; line-height: 1.5; margin: 0 0 7px; }}
ul.li {{ margin: 4px 0 8px; padding-left: 18px; }}
ul.li li {{ font-size: 11px; line-height: 1.45; margin-bottom: 3px; }}
.moraleja {{ background: #FEF3C7; border: 1px solid #FCD34D; color: #92400E;
             border-radius: 12px; padding: 11px 14px; font-size: 11px; }}
.story-grid {{ display: grid; grid-template-columns: 42% 58%; gap: 14px; align-items: start; }}
.story-panel {{ background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 14px; padding: 13px 15px; }}
.material-image {{ max-width: 100%; max-height: 390px; object-fit: contain; border-radius: 12px; }}
.image-box {{ text-align: center; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 9px; background: #fff; }}
.coloring-image {{ max-width: 100%; max-height: 650px; object-fit: contain; }}
.placeholder {{ border: 1px dashed #CBD5E1; border-radius: 12px; background: #F8FAFC; padding: 18px; color: #64748B; }}
.infobox {{ background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px;
            padding: 10px; margin-bottom: 10px; }}
.line {{ border-bottom: 1px solid #D1D5DB; height: 15px; margin: 3px 0; }}
table.grid {{ border-collapse: collapse; width: 100%; font-size: 10px; }}
table.grid th {{ background: #EEF2FF; color: {INDIGO_DARK}; font-weight: bold;
                 padding: 7px 8px; border: 1px solid #D1D5DB; text-align: left; }}
table.grid td {{ padding: 6px 8px; border: 1px solid #E5E7EB; vertical-align: top; }}
.opt {{ font-size: 11px; margin: 3px 0 3px 8px; }}
.opt .circle {{ color: {INDIGO}; font-weight: bold; }}
.pts {{ color: {VIOLET}; font-weight: bold; font-size: 10px; }}
"""


def _e(value: Any) -> str:
    return escape(str(value if value is not None else ""))


def _image_src(image: Any) -> str | None:
    if not isinstance(image, dict) or image.get("is_placeholder"):
        return None
    b64 = image.get("b64_data")
    if b64:
        return f"data:image/png;base64,{b64}"
    return image.get("url")


def _render_image_box(image: Any, *, alt: str, cls: str = "material-image") -> str:
    src = _image_src(image)
    if src:
        return f'<div class="image-box"><img class="{cls}" src="{_e(src)}" alt="{_e(alt)}"/></div>'
    prompt = image.get("prompt") if isinstance(image, dict) else ""
    return f'<div class="placeholder"><b>Imagen pendiente o de reserva.</b><br/>{_e(prompt)}</div>'


# ── Crucigrama ───────────────────────────────────────────────────────────────
def _render_crucigrama(c: dict, soluciones: bool) -> str:
    nested = c.get("crucigrama") or {}
    grid = nested.get("grid") or c.get("grilla") or []
    horiz = c.get("preguntas_horizontales") or nested.get("pistas_horizontal") or []
    vert = c.get("preguntas_vertical") or c.get("preguntas_verticales") or nested.get("pistas_vertical") or []

    numbers: dict[tuple[int, int], int] = {}
    for item in list(horiz) + list(vert):
        try:
            numbers[(int(item["fila"]), int(item["columna"]))] = item.get("numero")
        except (KeyError, TypeError, ValueError):
            continue

    rows_html = []
    for r, row in enumerate(grid):
        cells = []
        for col, ch in enumerate(row):
            ch = str(ch or "").strip()
            if ch:
                num = numbers.get((r, col))
                badge = f'<span class="num">{_e(num)}</span>' if num else ""
                letter = _e(ch.upper()) if soluciones else ""
                cells.append(f'<td class="cell">{badge}{letter}</td>')
            else:
                cells.append('<td class="block"></td>')
        rows_html.append("<tr>" + "".join(cells) + "</tr>")
    grid_html = f'<table class="cw">{"".join(rows_html)}</table>'

    def clue_list(items: list) -> str:
        out = []
        for it in sorted(items, key=lambda x: x.get("numero") or 0):
            out.append(f'<p class="clue"><span class="n">{_e(it.get("numero"))}.</span> {_e(it.get("pista"))}</p>')
        return "".join(out)

    clues = f"""
    <table style="width:100%"><tr>
      <td class="cluecol"><div class="clueh">Horizontales</div>{clue_list(horiz)}</td>
      <td class="cluecol"><div class="clueh">Verticales</div>{clue_list(vert)}</td>
    </tr></table>"""

    return f"""
    <div class="instr indigo">{_e(c.get("instrucciones") or "Lee cada pista y completa el crucigrama.")}</div>
    <div class="sectionbar">CRUCIGRAMA</div>
    <div style="text-align:center; margin: 6px 0 16px;"><div class="cw-wrap">{grid_html}</div></div>
    {clues}"""


# ── Sopa de letras ───────────────────────────────────────────────────────────
def _render_sopa(c: dict, soluciones: bool) -> str:
    nested = c.get("sopa_letras") or {}
    grid = c.get("grilla") or nested.get("grid") or []
    palabras = c.get("palabras") or nested.get("palabras") or []
    banco = c.get("banco_palabras") or [p.get("palabra") if isinstance(p, dict) else p for p in palabras]

    hits: set[tuple[int, int]] = set()
    if soluciones:
        for p in palabras:
            if not isinstance(p, dict):
                continue
            try:
                r, col = int(p["fila"]), int(p["col"])
                rf, cf = int(p.get("fila_fin", r)), int(p.get("col_fin", col))
            except (KeyError, TypeError, ValueError):
                continue
            steps = max(abs(rf - r), abs(cf - col))
            dr = 0 if steps == 0 else (rf - r) // steps
            dc = 0 if steps == 0 else (cf - col) // steps
            for i in range(steps + 1):
                hits.add((r + dr * i, col + dc * i))

    rows_html = []
    for r, row in enumerate(grid):
        cells = []
        for col, ch in enumerate(row):
            cls = "hit" if (r, col) in hits else ""
            cells.append(f'<td class="{cls}">{_e(str(ch or "").upper())}</td>')
        rows_html.append("<tr>" + "".join(cells) + "</tr>")
    grid_html = f'<table class="ws">{"".join(rows_html)}</table>'

    pills = "".join(f'<span class="pill">{_e(str(w).upper())}</span>' for w in banco if w)

    return f"""
    <div class="instr">{_e(c.get("instrucciones") or "Encuentra las palabras del banco en la sopa de letras.")}</div>
    <div class="sectionbar">SOPA DE LETRAS</div>
    <div style="text-align:center; margin: 6px 0;">{grid_html}</div>
    <div class="bank"><div class="bank-title">Palabras a encontrar</div>{pills}</div>"""


# ── Matching (unir columnas / emparejar) ─────────────────────────────────────
def _render_matching(c: dict, soluciones: bool, *, label: str, verb: str) -> str:
    izq = c.get("columna_izquierda") or []
    der = c.get("columna_derecha") or []
    sols = c.get("soluciones") or []

    n = max(len(izq), len(der))
    if n == 0:
        return f'<div class="sectionbar">{escape(label.upper())}</div><p class="p">Sin contenido.</p>'

    # Geometría determinista para poder dibujar cables exactos.
    AREA_W, CARD_W, CARD_H, GAP, HEAD = 700, 300, 40, 14, 22
    height = HEAD + n * (CARD_H + GAP)

    def y_center(i: int) -> float:
        return HEAD + i * (CARD_H + GAP) + CARD_H / 2

    cards = [f'<div class="colhead" style="position:absolute; left:6px; top:0;">Columna A</div>',
             f'<div class="colhead" style="position:absolute; left:{AREA_W - CARD_W + 6}px; top:0;">Columna B</div>']

    # Mapa letra -> índice de fila en la columna derecha (para anclar cables).
    letra_row = {str(d.get("letra")): j for j, d in enumerate(der)}
    # Mapa número izquierdo -> color (por solución), para teñir insignias.
    color_de_num: dict[Any, str] = {}
    if soluciones:
        for i, s in enumerate(sols):
            color_de_num[s.get("numero")] = CABLE_COLORS[i % len(CABLE_COLORS)]

    for i, item in enumerate(izq):
        top = HEAD + i * (CARD_H + GAP)
        num = item.get("numero")
        color = color_de_num.get(num, "#D1D5DB")
        border = f"border-color:{color};" if (soluciones and num in color_de_num) else ""
        cards.append(
            f'<div class="mcard" style="left:0; width:{CARD_W}px; top:{top}px; height:{CARD_H}px; {border}">'
            f'<span class="badge" style="background:{color};">{_e(num)}</span>'
            f'<span>{_e(item.get("texto"))}</span></div>'
        )
    for j, item in enumerate(der):
        top = HEAD + j * (CARD_H + GAP)
        cards.append(
            f'<div class="mcard" style="left:{AREA_W - CARD_W}px; width:{CARD_W}px; top:{top}px; height:{CARD_H}px;">'
            f'<span class="badge" style="background:#9CA3AF;">{_e(item.get("letra"))}</span>'
            f'<span>{_e(item.get("texto"))}</span></div>'
        )

    cables = ""
    if soluciones:
        paths = []
        for i, s in enumerate(sols):
            li = next((k for k, it in enumerate(izq) if it.get("numero") == s.get("numero")), None)
            rj = letra_row.get(str(s.get("letra")))
            if li is None or rj is None:
                continue
            x1, y1 = CARD_W, y_center(li)
            x2, y2 = AREA_W - CARD_W, y_center(rj)
            dx = (x2 - x1) * 0.45
            color = CABLE_COLORS[i % len(CABLE_COLORS)]
            paths.append(
                f'<path d="M{x1},{y1} C{x1 + dx},{y1} {x2 - dx},{y2} {x2},{y2}" '
                f'fill="none" stroke="{color}" stroke-width="2.5" stroke-linecap="round"/>'
            )
            paths.append(f'<circle cx="{x1}" cy="{y1}" r="3.5" fill="{color}"/>')
            paths.append(f'<circle cx="{x2}" cy="{y2}" r="3.5" fill="{color}"/>')
        cables = (f'<svg style="position:absolute; left:0; top:0;" width="{AREA_W}" height="{height}">'
                  f'{"".join(paths)}</svg>')

    area = (f'<div style="position:relative; width:{AREA_W}px; height:{height}px; margin:0 auto;">'
            f'{cables}{"".join(cards)}</div>')

    instr = c.get("instrucciones") or f"Une cada elemento de la columna A con su correspondiente de la columna B."
    body = f"""
    <div class="instr">{_e(instr)}</div>
    <div class="sectionbar">{escape(label.upper())}</div>
    {area}"""

    if soluciones and sols:
        key = "".join(
            f'<span class="pill">{_e(s.get("numero"))} → {_e(s.get("letra"))}</span>' for s in sols
        )
        body += f'<div class="answerkey"><div class="bank-title">Clave de respuestas</div>{key}</div>'
    return body


# ── Tipos de texto ───────────────────────────────────────────────────────────
def _ul(items: list) -> str:
    lis = "".join(f"<li>{_e(x)}</li>" for x in (items or []) if str(x).strip())
    return f'<ul class="li">{lis}</ul>' if lis else ""


def _render_cuento(c: dict, soluciones: bool) -> str:
    personajes = ", ".join(c.get("personajes") or [])
    parrafos = "".join(f'<p class="p">{_e(p)}</p>' for p in c.get("parrafos") or [])
    out = ['<div class="sectionbar">CUENTO</div>']
    if personajes:
        out.append(f'<div class="instr">Personajes: {_e(personajes)}</div>')
    out.append(parrafos)
    if c.get("moraleja"):
        out.append(f'<div class="moraleja"><b>Moraleja:</b> {_e(c["moraleja"])}</div>')
    if c.get("preguntas_comprension"):
        out.append('<div class="h3">Preguntas de comprensión</div>')
        out.append(_ul(c["preguntas_comprension"]))
    return "".join(out)


def _render_cuento_mejorado(c: dict, soluciones: bool) -> str:
    personajes = ", ".join(c.get("personajes") or [])
    parrafos = "".join(f'<p class="p">{_e(p)}</p>' for p in c.get("parrafos") or [])
    image = _render_image_box(c.get("imagen"), alt=c.get("titulo") or "Cuento")
    out = ['<div class="sectionbar">CUENTO</div>']
    out.append('<div class="story-grid">')
    out.append(image)
    out.append('<div class="story-panel">')
    if personajes:
        out.append(f'<p class="p"><b>Personajes:</b> {_e(personajes)}</p>')
    out.append(parrafos)
    out.append("</div></div>")
    if c.get("moraleja"):
        out.append(f'<div class="moraleja"><b>Moraleja:</b> {_e(c["moraleja"])}</div>')
    if c.get("preguntas_comprension"):
        out.append('<div class="h3">Preguntas de comprension</div>')
        out.append(_ul(c["preguntas_comprension"]))
    return "".join(out)


def _render_para_colorear(c: dict, soluciones: bool) -> str:
    out = ['<div class="sectionbar">PARA COLOREAR</div>']
    if c.get("instrucciones"):
        out.append(f'<div class="instr indigo">{_e(c["instrucciones"])}</div>')
    out.append(_render_image_box(c.get("imagen"), alt=c.get("titulo") or "Para colorear", cls="coloring-image"))
    if c.get("uso_docente"):
        out.append('<div class="h3">Uso docente</div>')
        out.append(_ul(c["uso_docente"]))
    return "".join(out)


def _render_guia(c: dict, soluciones: bool) -> str:
    out = ['<div class="sectionbar">GUÍA DE APRENDIZAJE</div>']
    if c.get("objetivos"):
        out.append('<div class="h3">Objetivos</div>' + _ul(c["objetivos"]))
    if c.get("introduccion"):
        out.append(f'<div class="instr indigo">{_e(c["introduccion"])}</div>')
    for s in c.get("secciones") or []:
        out.append('<div class="card">')
        out.append(f'<div class="h3" style="margin-top:0">{_e(s.get("titulo"))}</div>')
        out.append(f'<p class="p">{_e(s.get("contenido"))}</p>')
        out.append(_ul(s.get("actividades")))
        out.append("</div>")
    if c.get("evaluacion_formativa"):
        out.append('<div class="h3">Evaluación formativa</div>' + _ul(c["evaluacion_formativa"]))
    return "".join(out)


def _render_taller(c: dict, soluciones: bool) -> str:
    out = ['<div class="sectionbar">TALLER</div>']
    if c.get("objetivo"):
        out.append(f'<div class="instr">{_e(c["objetivo"])}</div>')
    for p in c.get("puntos") or []:
        out.append('<div class="card">')
        out.append(f'<p class="p"><b>{_e(p.get("numero"))}.</b> {_e(p.get("enunciado"))}</p>')
        out.append('<div class="line"></div><div class="line"></div>')
        out.append("</div>")
    return "".join(out)


def _render_examen(c: dict, soluciones: bool) -> str:
    out = ['<div class="sectionbar">EXAMEN</div>']
    if c.get("instrucciones"):
        out.append(f'<div class="instr indigo">{_e(c["instrucciones"])}</div>')
    for q in c.get("preguntas") or []:
        out.append('<div class="card">')
        pts = f' <span class="pts">[{_e(q.get("puntaje"))} pts]</span>' if q.get("puntaje") is not None else ""
        out.append(f'<p class="p"><b>{_e(q.get("numero"))}. {_e(q.get("enunciado"))}</b>{pts}</p>')
        for idx, op in enumerate(q.get("opciones") or []):
            letra = chr(65 + idx)
            # El LLM a veces ya antepone "A)"/"a)"; lo quitamos para no duplicar.
            txt = _e(re.sub(r"^\s*[A-Ha-h]\)\s*", "", str(op or "")))
            out.append(f'<p class="opt"><span class="circle">○ {letra})</span> {txt}</p>')
        if soluciones and q.get("respuesta_correcta") is not None:
            out.append(f'<p class="opt" style="color:#15803D"><b>Respuesta:</b> {_e(q.get("respuesta_correcta"))}</p>')
        elif not q.get("opciones"):
            out.append('<div class="line"></div><div class="line"></div>')
        out.append("</div>")
    if c.get("total_puntaje") is not None:
        out.append(f'<p class="p" style="text-align:right"><b>Total: {_e(c["total_puntaje"])} puntos</b></p>')
    return "".join(out)


def _render_rubrica(c: dict, soluciones: bool) -> str:
    out = ['<div class="sectionbar">RÚBRICA DE EVALUACIÓN</div>']
    if c.get("escala"):
        out.append(f'<div class="instr">Escala: {_e(", ".join(c["escala"]))}</div>')
    rows = ['<tr><th>Criterio</th><th>Peso</th><th>Descripción</th><th>Niveles</th></tr>']
    for cr in c.get("criterios") or []:
        niveles = "<br/>".join(f"<b>{_e(k)}:</b> {_e(v)}" for k, v in (cr.get("niveles") or {}).items())
        peso = f'{_e(cr.get("peso_porcentaje"))}%' if cr.get("peso_porcentaje") is not None else ""
        rows.append(
            f'<tr><td><b>{_e(cr.get("nombre"))}</b></td><td>{peso}</td>'
            f'<td>{_e(cr.get("descripcion"))}</td><td>{niveles}</td></tr>'
        )
    out.append(f'<table class="grid">{"".join(rows)}</table>')
    return "".join(out)


def _render_plan(c: dict, soluciones: bool) -> str:
    out = ['<div class="sectionbar">PLAN DE REFUERZO</div>']
    if c.get("objetivo_general"):
        out.append(f'<div class="instr indigo">{_e(c["objetivo_general"])}</div>')
    for w in c.get("semanas") or []:
        out.append('<div class="card">')
        out.append(f'<div class="h3" style="margin-top:0">Semana {_e(w.get("semana"))}: {_e(w.get("tema"))}</div>')
        if w.get("meta_semana"):
            out.append(f'<p class="p"><b>Meta:</b> {_e(w["meta_semana"])}</p>')
        if w.get("actividades"):
            out.append('<p class="p" style="margin-bottom:2px"><b>Actividades</b></p>' + _ul(w["actividades"]))
        if w.get("recursos"):
            out.append('<p class="p" style="margin-bottom:2px"><b>Recursos</b></p>' + _ul(w["recursos"]))
        out.append("</div>")
    if c.get("estrategias_apoyo"):
        out.append('<div class="h3">Estrategias de apoyo</div>' + _ul(c["estrategias_apoyo"]))
    if c.get("indicadores_mejora"):
        out.append('<div class="h3">Indicadores de mejora</div>' + _ul(c["indicadores_mejora"]))
    return "".join(out)


_RENDERERS = {
    "crucigrama": _render_crucigrama,
    "sopa_letras": _render_sopa,
    "unir_columnas": lambda c, s: _render_matching(c, s, label="Unir Columnas", verb="une"),
    "emparejar": lambda c, s: _render_matching(c, s, label="Emparejar", verb="relaciona"),
    "cuento": _render_cuento_mejorado,
    "para_colorear": _render_para_colorear,
    "guia": _render_guia,
    "taller": _render_taller,
    "examen": _render_examen,
    "rubrica": _render_rubrica,
    "plan_refuerzo": _render_plan,
}


def render_material_html(material: dict, soluciones: bool = False) -> str:
    tipo = material.get("tipo")
    contenido = material.get("contenido_json") or {}
    titulo = contenido.get("titulo") or material.get("titulo") or TOOL_LABELS.get(tipo, "Material")
    label = TOOL_LABELS.get(tipo, str(tipo))

    renderer = _RENDERERS.get(tipo)
    inner = renderer(contenido, soluciones) if renderer else f'<p class="p">{_e(contenido)}</p>'

    meta = label
    if soluciones:
        meta += " · HOJA DE RESPUESTAS"
    if material.get("created_at"):
        meta += f" · {_e(str(material['created_at'])[:10])}"

    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{BASE_CSS}</style></head>
<body>
  <div class="topbar"><span class="htitle">{_e(titulo)}</span><span class="brand">XCalificator</span></div>
  <div class="title">{_e(titulo)}</div>
  <div class="subtitle">{_e(meta)}</div>
  {inner}
</body></html>"""


def render_material_pdf(material: dict, soluciones: bool = False) -> bytes:
    """Renderiza un material a PDF (bytes) con la estética de la app."""
    from weasyprint import HTML  # import diferido: dep pesada solo si se usa

    html = render_material_html(material, soluciones)
    return HTML(string=html).write_pdf()
