"""Spec 182: ubica cada pregunta en la hoja con una cuadrícula rotulada.

Los modelos de visión estiman mal coordenadas numéricas, sobre todo en fotos de
lado, pero nombran bien celdas rotuladas. Se dibuja una cuadrícula sobre la
misma página que ve el docente, el modelo responde celdas y aquí se convierten
en recuadros. Solo ubica: nunca lee ni califica respuestas.
"""
from __future__ import annotations

from io import BytesIO
import json
import re

from PIL import Image, ImageDraw, ImageFont

MAX_SIDE = 1600
LONG_CELLS, SHORT_CELLS = 16, 12
MAX_QUESTIONS = 120
_CELL = re.compile(r"^\s*([A-Za-z])\s*(\d{1,2})\s*$")


def grid_shape(width: int, height: int) -> tuple[int, int]:
    """Columnas y filas: celdas casi cuadradas, más celdas en el lado largo."""
    return (SHORT_CELLS, LONG_CELLS) if height >= width else (LONG_CELLS, SHORT_CELLS)


def draw_grid(content: bytes) -> tuple[bytes, int, int]:
    """Devuelve un JPEG con la cuadrícula y su número de columnas y filas."""
    with Image.open(BytesIO(content)) as source:
        image = source.convert("RGB")
    if max(image.size) > MAX_SIDE:
        image.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    width, height = image.size
    cols, rows = grid_shape(width, height)
    draw = ImageDraw.Draw(image)
    size = max(11, min(width / cols, height / rows) // 4)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", int(size))
    except OSError:
        font = ImageFont.load_default()
    for col in range(cols + 1):
        x = round(col * width / cols)
        draw.line([(x, 0), (x, height)], fill=(230, 0, 0), width=1)
    for row in range(rows + 1):
        y = round(row * height / rows)
        draw.line([(0, y), (width, y)], fill=(230, 0, 0), width=1)
    for col in range(cols):
        for row in range(rows):
            draw.text((col * width / cols + 2, row * height / rows + 1), cell_name(col, row), fill=(210, 0, 0), font=font)
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=85)
    return buffer.getvalue(), cols, rows


def cell_name(col: int, row: int) -> str:
    return f"{chr(65 + col)}{row + 1}"


def prompt(cols: int, rows: int, numbers: list[str]) -> str:
    last = chr(64 + cols)
    wanted = ", ".join(numbers[:MAX_QUESTIONS])
    return (
        f"La hoja tiene encima una cuadrícula roja: columnas A-{last} de izquierda a derecha y filas 1-{rows} "
        "de arriba abajo; cada celda tiene su nombre en la esquina superior izquierda. La foto puede estar "
        "girada: no la enderezes, nombra las celdas tal como se ven. "
        f"Ubica en esta hoja cada una de estas preguntas que aparezca: {wanted}. "
        "Para cada una, el rectángulo de celdas que cubre la pregunta completa: número, enunciado, opciones "
        "y el espacio de respuesta. Omite las preguntas que no estén en esta hoja. No leas ni califiques "
        "respuestas. Devuelve SOLO JSON: "
        '{"preguntas": [{"numero": "1", "desde": "celda de una esquina", "hasta": "celda de la esquina opuesta"}]}'
    )


def _cell(value: object, cols: int, rows: int) -> tuple[int, int] | None:
    match = _CELL.match(str(value or ""))
    if not match:
        return None
    col, row = ord(match.group(1).upper()) - 65, int(match.group(2)) - 1
    return (col, row) if 0 <= col < cols and 0 <= row < rows else None


def cells_to_box(start: object, end: object, cols: int, rows: int) -> list[float] | None:
    first, second = _cell(start, cols, rows), _cell(end, cols, rows)
    if first is None or second is None:
        return None
    left, right = sorted((first[0], second[0]))
    top, bottom = sorted((first[1], second[1]))
    # Un rectángulo que cubre casi toda la hoja no ubica nada.
    if (right - left + 1) * (bottom - top + 1) > cols * rows * 0.5:
        return None
    return [
        round(left / cols, 4),
        round(top / rows, 4),
        round((right - left + 1) / cols, 4),
        round((bottom - top + 1) / rows, 4),
    ]


def parse_locations(content: object, cols: int, rows: int, numbers: list[str]) -> dict[str, list[float]]:
    """Número de pregunta → recuadro normalizado. Ignora lo que no se pidió o no es válido."""
    if isinstance(content, str):
        match = re.search(r"\{.*\}", content, re.S)
        if not match:
            return {}
        try:
            content = json.loads(match.group(0))
        except json.JSONDecodeError:
            return {}
    items = content.get("preguntas") if isinstance(content, dict) else None
    if not isinstance(items, list):
        return {}
    wanted = {str(number).strip() for number in numbers}
    found: dict[str, list[float]] = {}
    for item in items[:MAX_QUESTIONS]:
        if not isinstance(item, dict):
            continue
        number = str(item.get("numero") or "").strip()
        box = cells_to_box(item.get("desde"), item.get("hasta"), cols, rows)
        if number in wanted and box is not None and number not in found:
            found[number] = box
    return found
