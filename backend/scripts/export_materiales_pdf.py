from __future__ import annotations

import json
import random
import re
import subprocess
import unicodedata
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from pypdf import PdfWriter
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "output" / "pdf"
TMP_DIR = ROOT / "tmp" / "pdfs"
DATA_FILE = TMP_DIR / "materiales_generados.json"

TOOL_ORDER = [
    "sopa_letras",
    "crucigrama",
    "cuento",
    "guia",
    "taller",
    "examen",
    "rubrica",
    "plan_refuerzo",
]

TOOL_LABELS = {
    "sopa_letras": "Sopa de Letras",
    "crucigrama": "Crucigrama",
    "cuento": "Cuento",
    "guia": "Guia",
    "taller": "Taller",
    "examen": "Examen",
    "rubrica": "Rubrica",
    "plan_refuerzo": "Plan de Refuerzo",
}

FILL_CELL = "__FILL_CELL__"

PRIMARY = HexColor("#4F46E5")
PRIMARY_DARK = HexColor("#312E81")
PRIMARY_LIGHT = HexColor("#E0E7FF")
ACCENT = HexColor("#7C3AED")
TEAL = HexColor("#0F766E")
AMBER_LIGHT = HexColor("#FEF3C7")
AMBER_DARK = HexColor("#92400E")
GRAY_900 = HexColor("#111827")
GRAY_700 = HexColor("#374151")
GRAY_500 = HexColor("#6B7280")
GRAY_300 = HexColor("#D1D5DB")
GRAY_200 = HexColor("#E5E7EB")
GRAY_100 = HexColor("#F3F4F6")


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "material"


def fetch_latest_materials() -> list[dict[str, Any]]:
    if DATA_FILE.exists() and DATA_FILE.stat().st_size > 3:
        materials = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        return sorted(materials, key=lambda item: TOOL_ORDER.index(item["tipo"]))

    tool_list = ",".join(f"'{tool}'" for tool in TOOL_ORDER)
    order_array = f"ARRAY[{tool_list}]"
    query = (
        "WITH ranked AS ("
        "SELECT DISTINCT ON (tipo) id::text, tipo, titulo, contenido_json, created_at "
        "FROM materiales_generados "
        f"WHERE tipo IN ({tool_list}) "
        "ORDER BY tipo, created_at DESC"
        ") "
        "SELECT COALESCE(jsonb_agg(jsonb_build_object("
        "'id', id, 'tipo', tipo, 'titulo', titulo, "
        "'contenido_json', contenido_json, 'created_at', created_at"
        f") ORDER BY array_position({order_array}, tipo)), '[]'::jsonb)::text "
        "FROM ranked;"
    )
    result = subprocess.run(
        [
            "docker",
            "compose",
            "exec",
            "-T",
            "postgres",
            "psql",
            "-U",
            "xcalificator",
            "-d",
            "xcalificator_db",
            "-tA",
            "-c",
            query,
        ],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        raise RuntimeError(f"psql query failed: {result.stderr.strip() or result.stdout.strip()}")
    materials = json.loads(result.stdout.strip())
    if len(materials) != len(TOOL_ORDER):
        found = sorted(item.get("tipo") for item in materials)
        raise RuntimeError(f"Expected 8 generated materials, found {len(materials)}: {found}")
    return materials


def get_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "XTitle",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=27,
            alignment=TA_CENTER,
            textColor=PRIMARY,
            spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "XSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            alignment=TA_CENTER,
            textColor=GRAY_500,
            spaceAfter=14,
        ),
        "section": ParagraphStyle(
            "XSection",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=ACCENT,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "XBody",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=GRAY_700,
            spaceAfter=6,
        ),
        "body_bold": ParagraphStyle(
            "XBodyBold",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=14,
            textColor=GRAY_900,
            spaceAfter=5,
        ),
        "small": ParagraphStyle(
            "XSmall",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=GRAY_500,
        ),
        "cell": ParagraphStyle(
            "XCell",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=GRAY_900,
        ),
    }


def para(text: Any, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(str(text or "")), style)


def markup(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


def bullets(items: list[Any], style: ParagraphStyle) -> ListFlowable:
    return ListFlowable(
        [ListItem(para(item, style), leftIndent=10) for item in items if str(item).strip()],
        bulletType="bullet",
        leftIndent=18,
    )


def section_bar(label: str, width: float) -> Table:
    t = Table([[label]], colWidths=[width], hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), ACCENT),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return t


def instruction_box(text: str, width: float) -> Table:
    t = Table([[para(text, get_styles()["body"])]], colWidths=[width], hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PRIMARY_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.6, PRIMARY),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return t


def student_info_box(width: float) -> Table:
    data = [
        ["Nombre completo:", "", "Fecha:", ""],
        ["Documento:", "", "Grupo / Seccion:", ""],
    ]
    t = Table(data, colWidths=[100, 180, 100, width - 380], hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), GRAY_100),
                ("BOX", (0, 0), (-1, -1), 0.5, GRAY_300),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TEXTCOLOR", (0, 0), (-1, -1), GRAY_700),
                ("LINEBELOW", (1, 0), (1, -1), 0.8, GRAY_300),
                ("LINEBELOW", (3, 0), (3, -1), 0.8, GRAY_300),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return t


def plain_word(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("palabra") or value.get("respuesta") or value.get("texto") or "").strip()
    return str(value or "").strip()


def option_text(value: Any) -> str:
    return re.sub(r"^[A-Ha-h]\)\s*", "", str(value or "").strip())


def data_table(rows: list[list[Any]], widths: list[float]) -> Table:
    formatted = [[cell if hasattr(cell, "wrap") else str(cell) for cell in row] for row in rows]
    t = Table(formatted, colWidths=widths, hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_LIGHT),
                ("TEXTCOLOR", (0, 0), (-1, 0), PRIMARY_DARK),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.4, GRAY_300),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, HexColor("#F8FAFC")]),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


def title_block(material: dict[str, Any], styles: dict[str, ParagraphStyle]) -> list[Any]:
    label = TOOL_LABELS.get(material["tipo"], material["tipo"])
    return [
        Spacer(1, 4),
        para(material["titulo"], styles["title"]),
        para(
            f"{label} - ID: {material['id']} - Generado: {material['created_at']}",
            styles["subtitle"],
        ),
    ]


def render_sopa(material: dict[str, Any], width: float, styles: dict[str, ParagraphStyle]) -> list[Any]:
    c = material["contenido_json"]
    grid = c.get("grilla") or (c.get("sopa_letras") or {}).get("grid") or []
    words = c.get("banco_palabras") or c.get("palabras") or (c.get("sopa_letras") or {}).get("palabras") or []
    word_labels = [plain_word(w).upper() for w in words if plain_word(w)]
    story = title_block(material, styles)
    story.append(instruction_box(c.get("instrucciones") or "Encuentra las palabras en la grilla.", width))
    story.append(Spacer(1, 12))
    story.append(section_bar("SOPA DE LETRAS", width))
    story.append(Spacer(1, 12))

    if grid:
        col_count = len(grid[0])
        cell = max(18, min(30, int((width - 90) / max(col_count, 1))))
        table = Table([[str(cell_value or "").upper() for cell_value in row] for row in grid], colWidths=[cell] * col_count)
        table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.5, PRIMARY_LIGHT),
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F8FAFC")),
                    ("TEXTCOLOR", (0, 0), (-1, -1), PRIMARY_DARK),
                    ("FONTNAME", (0, 0), (-1, -1), "Courier-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 12),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 14))

    if word_labels:
        story.append(para("Palabras a encontrar", styles["section"]))
        rows = []
        row: list[Any] = []
        for word in word_labels:
            row.append(markup(f"<b>{escape(word)}</b>", styles["body"]))
            if len(row) == 4:
                rows.append(row)
                row = []
        if row:
            rows.append(row + [""] * (4 - len(row)))
        t = Table(rows, colWidths=[width / 4] * 4, hAlign="CENTER")
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), PRIMARY_LIGHT),
                    ("TEXTCOLOR", (0, 0), (-1, -1), PRIMARY_DARK),
                    ("BOX", (0, 0), (-1, -1), 0.5, PRIMARY),
                    ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.white),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )
        story.append(t)
    return story


def crossword_grid(horizontal: list[dict[str, Any]], vertical: list[dict[str, Any]]) -> list[list[str]]:
    words = [str(item.get("respuesta") or "").upper().strip() for item in horizontal + vertical]
    words = [re.sub(r"[^A-ZÑ]", "", word) for word in words if word]
    size = max(10, min(16, max((len(w) for w in words), default=8) + 5))
    grid = [["" for _ in range(size)] for _ in range(size)]
    starts: dict[tuple[int, int], str] = {}
    number = 1

    for i, word in enumerate(words[:4]):
        row = 1 + i * 2
        col = 1
        if row >= size:
            break
        for j, char in enumerate(word[: size - col - 1]):
            grid[row][col + j] = FILL_CELL
        starts[(row, col)] = str(number)
        number += 1

    for i, word in enumerate(words[4:8]):
        row = 1
        col = min(size - 2, 2 + i * 3)
        for j, char in enumerate(word[: size - row - 1]):
            grid[row + j][col] = FILL_CELL
        starts[(row, col)] = str(number)
        number += 1

    for (row, col), start_number in starts.items():
        grid[row][col] = start_number

    filled = [(r, c) for r, row in enumerate(grid) for c, value in enumerate(row) if value]
    if not filled:
        return grid
    min_r = max(0, min(r for r, _ in filled) - 1)
    max_r = min(size - 1, max(r for r, _ in filled) + 1)
    min_c = max(0, min(c for _, c in filled) - 1)
    max_c = min(size - 1, max(c for _, c in filled) + 1)
    return [row[min_c : max_c + 1] for row in grid[min_r : max_r + 1]]


def normalize_crossword_word(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or "").upper())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^A-Z]", "", text)


def crossword_entries(horizontal: list[dict[str, Any]], vertical: list[dict[str, Any]]) -> list[dict[str, str]]:
    entries_by_word: dict[str, str] = {}
    for item in list(horizontal or []) + list(vertical or []):
        if not isinstance(item, dict):
            continue
        word = normalize_crossword_word(item.get("respuesta") or item.get("palabra") or item.get("answer"))
        clue = str(item.get("pista") or item.get("pregunta") or item.get("clue") or "").strip()
        if word and word not in entries_by_word:
            entries_by_word[word] = clue
    return [{"word": word, "pista": clue} for word, clue in entries_by_word.items()]


def build_crossword_payload(horizontal: list[dict[str, Any]], vertical: list[dict[str, Any]]) -> dict[str, Any]:
    """Build a printable crossword grid from clues, following the reference backend layout."""
    entries = crossword_entries(horizontal, vertical)
    if not entries:
        return {"grid": [], "size": 0, "pistas_horizontal": [], "pistas_vertical": []}

    if len(entries) == 1:
        word = entries[0]["word"]
        return {
            "grid": [list(word)],
            "size": len(word),
            "pistas_horizontal": [
                {
                    "numero": 1,
                    "pista": entries[0]["pista"],
                    "respuesta": word,
                    "fila": 0,
                    "columna": 0,
                    "longitud": len(word),
                }
            ],
            "pistas_vertical": [],
        }

    def can_place(grid: dict[tuple[int, int], str], word: str, direction: str, row: int, col: int) -> bool:
        length = len(word)
        if direction == "h":
            if grid.get((row, col - 1)) or grid.get((row, col + length)):
                return False
            for idx, char in enumerate(word):
                r, c = row, col + idx
                existing = grid.get((r, c))
                if existing:
                    if existing != char:
                        return False
                elif grid.get((r - 1, c)) or grid.get((r + 1, c)):
                    return False
        else:
            if grid.get((row - 1, col)) or grid.get((row + length, col)):
                return False
            for idx, char in enumerate(word):
                r, c = row + idx, col
                existing = grid.get((r, c))
                if existing:
                    if existing != char:
                        return False
                elif grid.get((r, c - 1)) or grid.get((r, c + 1)):
                    return False
        return True

    def crossings(grid: dict[tuple[int, int], str], word: str, direction: str, row: int, col: int) -> int:
        total = 0
        for idx, char in enumerate(word):
            r = row + (idx if direction == "v" else 0)
            c = col + (idx if direction == "h" else 0)
            if grid.get((r, c)) == char:
                total += 1
        return total

    def do_place(grid: dict[tuple[int, int], str], word: str, direction: str, row: int, col: int) -> None:
        for idx, char in enumerate(word):
            if direction == "h":
                grid[(row, col + idx)] = char
            else:
                grid[(row + idx, col)] = char

    def grid_bounds(grid: dict[tuple[int, int], str]) -> tuple[int, int, int, int] | None:
        if not grid:
            return None
        rows = [r for r, _ in grid]
        cols = [c for _, c in grid]
        return min(rows), max(rows), min(cols), max(cols)

    def word_bounds(word: str, direction: str, row: int, col: int) -> tuple[int, int, int, int]:
        if direction == "h":
            return row, row, col, col + len(word) - 1
        return row, row + len(word) - 1, col, col

    def merge_bounds(
        base: tuple[int, int, int, int] | None, extra: tuple[int, int, int, int]
    ) -> tuple[int, int, int, int]:
        if base is None:
            return extra
        return min(base[0], extra[0]), max(base[1], extra[1]), min(base[2], extra[2]), max(base[3], extra[3])

    h_hint = sum(1 for item in horizontal or [] if isinstance(item, dict) and normalize_crossword_word(item.get("respuesta")))
    v_hint = sum(1 for item in vertical or [] if isinstance(item, dict) and normalize_crossword_word(item.get("respuesta")))
    total_hint = h_hint + v_hint
    target_h = round(len(entries) * (h_hint / total_hint)) if total_hint else len(entries) // 2
    target_h = max(1, min(len(entries) - 1, target_h))
    target_v = len(entries) - target_h

    rng = random.Random("|".join(entry["word"] for entry in entries))
    best_grid: dict[tuple[int, int], str] = {}
    best_placed: list[dict[str, Any]] = []
    best_score = -10**9

    for attempt in range(32):
        grid: dict[tuple[int, int], str] = {}
        placed: list[dict[str, Any]] = []
        order = list(range(len(entries)))
        if attempt == 0:
            order.sort(key=lambda idx: (-len(entries[idx]["word"]), idx))
        else:
            order.sort(key=lambda idx: -len(entries[idx]["word"]) + rng.randint(-3, 3))

        first = entries[order[0]]
        start_direction = "h" if attempt % 2 == 0 else "v"
        do_place(grid, first["word"], start_direction, 0, 0)
        placed.append(
            {
                "word": first["word"],
                "pista": first["pista"],
                "dir": start_direction,
                "row": 0,
                "col": 0,
            }
        )
        h_count = 1 if start_direction == "h" else 0
        v_count = 1 if start_direction == "v" else 0
        total_crossings = 0
        remaining = order[1:]

        for _ in range(50):
            if not remaining:
                break
            progress = False
            new_remaining: list[int] = []
            for entry_idx in remaining:
                entry = entries[entry_idx]
                word = entry["word"]
                best_pos: tuple[str, int, int, int] | None = None
                best_eval: float | None = None
                bounds = grid_bounds(grid)

                for placed_entry in placed:
                    placed_word = placed_entry["word"]
                    placed_dir = placed_entry["dir"]
                    placed_row = placed_entry["row"]
                    placed_col = placed_entry["col"]
                    for new_idx, new_char in enumerate(word):
                        for old_idx, old_char in enumerate(placed_word):
                            if new_char != old_char:
                                continue
                            if placed_dir == "h":
                                direction = "v"
                                row = placed_row - new_idx
                                col = placed_col + old_idx
                            else:
                                direction = "h"
                                row = placed_row + old_idx
                                col = placed_col - new_idx
                            if not can_place(grid, word, direction, row, col):
                                continue
                            cross = crossings(grid, word, direction, row, col)
                            if cross <= 0:
                                continue
                            h_after = h_count + (1 if direction == "h" else 0)
                            v_after = v_count + (1 if direction == "v" else 0)
                            balance_penalty = abs(h_after - target_h) + abs(v_after - target_v)
                            merged = merge_bounds(bounds, word_bounds(word, direction, row, col))
                            height = merged[1] - merged[0] + 1
                            width = merged[3] - merged[2] + 1
                            area = height * width
                            shape_penalty = abs(height - width)
                            score = cross * 100 - balance_penalty * 8 - area * 0.7 - shape_penalty * 1.4
                            if best_eval is None or score > best_eval:
                                best_eval = score
                                best_pos = (direction, row, col, cross)

                if best_pos:
                    direction, row, col, cross = best_pos
                    do_place(grid, word, direction, row, col)
                    placed.append(
                        {"word": word, "pista": entry["pista"], "dir": direction, "row": row, "col": col}
                    )
                    h_count += 1 if direction == "h" else 0
                    v_count += 1 if direction == "v" else 0
                    total_crossings += cross
                    progress = True
                else:
                    new_remaining.append(entry_idx)

            remaining = new_remaining
            if not progress:
                break

        bounds = grid_bounds(grid)
        if bounds:
            height = bounds[1] - bounds[0] + 1
            width = bounds[3] - bounds[2] + 1
            area = height * width
            shape_penalty = abs(height - width)
        else:
            area = 0
            shape_penalty = 0
        imbalance = abs(h_count - target_h) + abs(v_count - target_v)
        score = len(placed) * 1000 + total_crossings * 50 - len(remaining) * 250 - area * 3 - shape_penalty * 8 - imbalance * 30
        if score > best_score:
            best_score = score
            best_grid = dict(grid)
            best_placed = list(placed)
        if not remaining and imbalance <= 1:
            break

    grid = best_grid
    placed = best_placed

    placed_words = {item["word"] for item in placed}
    for entry in entries:
        if entry["word"] in placed_words:
            continue
        bounds = grid_bounds(grid)
        row = (bounds[1] + 2) if bounds else 0
        col = bounds[2] if bounds else 0
        attempts = 0
        while not can_place(grid, entry["word"], "h", row, col):
            row += 2
            attempts += 1
            if attempts > 30:
                col += 2
                row = (bounds[1] + 2) if bounds else 0
                attempts = 0
        do_place(grid, entry["word"], "h", row, col)
        placed.append({"word": entry["word"], "pista": entry["pista"], "dir": "h", "row": row, "col": col})

    bounds = grid_bounds(grid)
    if not bounds:
        return {"grid": [], "size": 0, "pistas_horizontal": [], "pistas_vertical": []}

    min_r, max_r, min_c, max_c = bounds
    rows = max_r - min_r + 1
    cols = max_c - min_c + 1
    size = max(rows, cols)
    new_grid = [["" for _ in range(size)] for _ in range(size)]
    for (row, col), letter in grid.items():
        new_grid[row - min_r][col - min_c] = letter

    cell_number: dict[tuple[int, int], int] = {}
    next_number = 1
    for row in range(size):
        for col in range(size):
            if not new_grid[row][col]:
                continue
            starts_across = (col == 0 or not new_grid[row][col - 1]) and col + 1 < size and bool(new_grid[row][col + 1])
            starts_down = (row == 0 or not new_grid[row - 1][col]) and row + 1 < size and bool(new_grid[row + 1][col])
            if starts_across or starts_down:
                cell_number[(row, col)] = next_number
                next_number += 1

    final_h: list[dict[str, Any]] = []
    final_v: list[dict[str, Any]] = []
    for item in placed:
        row = item["row"] - min_r
        col = item["col"] - min_c
        number = cell_number.get((row, col))
        if number is None:
            number = next_number
            cell_number[(row, col)] = number
            next_number += 1
        clue = {
            "numero": number,
            "pista": item["pista"],
            "respuesta": item["word"],
            "fila": row,
            "columna": col,
            "longitud": len(item["word"]),
        }
        if item["dir"] == "h":
            final_h.append(clue)
        else:
            final_v.append(clue)

    final_h.sort(key=lambda item: item["numero"])
    final_v.sort(key=lambda item: item["numero"])
    return {"grid": new_grid, "size": size, "pistas_horizontal": final_h, "pistas_vertical": final_v}


def printable_crossword_grid(grid: list[list[Any]], horizontal: list[dict[str, Any]], vertical: list[dict[str, Any]]) -> list[list[str]]:
    display = [["" if str(value or "").strip() else "" for value in row] for row in grid]
    for item in list(horizontal or []) + list(vertical or []):
        if not isinstance(item, dict):
            continue
        try:
            row = int(item.get("fila"))
            col = int(item.get("columna"))
        except (TypeError, ValueError):
            continue
        if 0 <= row < len(display) and 0 <= col < len(display[row]):
            display[row][col] = str(item.get("numero") or "")
    return display


def render_crucigrama(material: dict[str, Any], width: float, styles: dict[str, ParagraphStyle]) -> list[Any]:
    c = material["contenido_json"]
    nested = c.get("crucigrama") or {}
    horizontal = c.get("preguntas_horizontales") or nested.get("pistas_horizontal") or []
    vertical = c.get("preguntas_verticales") or nested.get("pistas_vertical") or []
    story = title_block(material, styles)
    story.append(instruction_box(c.get("instrucciones") or "Completa el crucigrama usando las pistas.", width))
    story.append(Spacer(1, 12))
    story.append(section_bar("CRUCIGRAMA", width))
    story.append(Spacer(1, 12))

    if nested.get("grid"):
        grid = nested.get("grid") or []
        horizontal = nested.get("pistas_horizontal") or horizontal
        vertical = nested.get("pistas_vertical") or vertical
    else:
        payload = build_crossword_payload(horizontal, vertical)
        grid = payload["grid"]
        horizontal = payload["pistas_horizontal"]
        vertical = payload["pistas_vertical"]

    if grid:
        size = max(len(row) for row in grid)
        grid = [list(row) + [""] * (size - len(row)) for row in grid]
    else:
        size = 0
    if grid and size:
        cell = max(20, min(34, int((width - 60) / size)))
        display_grid = printable_crossword_grid(grid, horizontal, vertical)
        t = Table(display_grid, colWidths=[cell] * size, rowHeights=[cell] * len(grid), hAlign="CENTER")
        commands: list[tuple[Any, ...]] = [
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
        ]
        for r, row in enumerate(grid):
            for col, value in enumerate(row):
                if value == FILL_CELL or str(value).strip():
                    commands.extend(
                        [
                            ("BACKGROUND", (col, r), (col, r), colors.white),
                            ("BOX", (col, r), (col, r), 1.0, GRAY_700),
                            ("TEXTCOLOR", (col, r), (col, r), GRAY_900),
                            ("LEFTPADDING", (col, r), (col, r), 2),
                            ("TOPPADDING", (col, r), (col, r), 1),
                        ]
                    )
                else:
                    commands.extend(
                        [
                            ("BACKGROUND", (col, r), (col, r), GRAY_700),
                            ("TEXTCOLOR", (col, r), (col, r), GRAY_700),
                            ("BOX", (col, r), (col, r), 0.5, GRAY_700),
                        ]
                    )
        t.setStyle(TableStyle(commands))
        story.append(t)
        story.append(Spacer(1, 14))

    for label, items in [("Horizontales", horizontal), ("Verticales", vertical)]:
        if not items:
            continue
        story.append(para(label, styles["section"]))
        clue_rows: list[list[Any]] = [["No.", "Pista"]]
        for item in items:
            num = item.get("numero", "")
            clue = item.get("pista") or item.get("pregunta") or ""
            clue_rows.append([num, para(clue, styles["cell"])])
        story.append(data_table(clue_rows, [0.65 * inch, width - 0.65 * inch]))
    return story


def render_cuento(material: dict[str, Any], width: float, styles: dict[str, ParagraphStyle]) -> list[Any]:
    c = material["contenido_json"]
    story = title_block(material, styles)
    personajes = c.get("personajes") or []
    if personajes:
        story.append(instruction_box(f"Personajes: {', '.join(personajes)}", width))
        story.append(Spacer(1, 10))
    story.append(section_bar("CUENTO", width))
    story.append(Spacer(1, 10))
    for paragraph in c.get("parrafos", []):
        story.append(para(paragraph, styles["body"]))
    if c.get("moraleja"):
        t = Table([[markup(f"<b>Moraleja:</b> {escape(str(c['moraleja']))}", styles["body"])]], colWidths=[width])
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), AMBER_LIGHT),
                    ("TEXTCOLOR", (0, 0), (-1, -1), AMBER_DARK),
                    ("BOX", (0, 0), (-1, -1), 0.5, AMBER_DARK),
                    ("TOPPADDING", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.append(Spacer(1, 8))
        story.append(t)
    if c.get("preguntas_comprension"):
        story.append(para("Preguntas de comprension", styles["section"]))
        story.append(bullets(c["preguntas_comprension"], styles["body"]))
    return story


def render_guia(material: dict[str, Any], width: float, styles: dict[str, ParagraphStyle]) -> list[Any]:
    c = material["contenido_json"]
    story = title_block(material, styles)
    story.append(section_bar("GUIA DE APRENDIZAJE", width))
    story.append(Spacer(1, 10))
    if c.get("objetivos"):
        story.append(para("Objetivos", styles["section"]))
        story.append(bullets(c["objetivos"], styles["body"]))
    if c.get("introduccion"):
        story.append(instruction_box(c["introduccion"], width))
        story.append(Spacer(1, 10))
    for section in c.get("secciones", []):
        block = [
            markup(f"<b>{escape(str(section.get('titulo', 'Seccion')))}</b>", styles["body_bold"]),
            para(section.get("contenido", ""), styles["body"]),
        ]
        if section.get("actividades"):
            block.append(bullets(section["actividades"], styles["body"]))
        story.append(KeepTogether(block))
        story.append(HRFlowable(width="100%", thickness=0.3, color=GRAY_300, spaceAfter=7))
    if c.get("evaluacion_formativa"):
        story.append(para("Evaluacion formativa", styles["section"]))
        story.append(bullets(c["evaluacion_formativa"], styles["body"]))
    return story


def render_taller(material: dict[str, Any], width: float, styles: dict[str, ParagraphStyle]) -> list[Any]:
    c = material["contenido_json"]
    story = title_block(material, styles)
    story.append(student_info_box(width))
    story.append(Spacer(1, 12))
    story.append(instruction_box(c.get("objetivo") or "Resuelve cada punto de forma clara.", width))
    story.append(Spacer(1, 12))
    story.append(section_bar("TALLER PRACTICO", width))
    story.append(Spacer(1, 8))
    for item in c.get("puntos", []):
        block = [
            markup(f"<b>{escape(str(item.get('numero')))}. {escape(str(item.get('enunciado')))}</b>", styles["body"]),
            para("R: ________________________________________________", styles["body"]),
            para("   ________________________________________________", styles["body"]),
        ]
        story.append(KeepTogether(block))
        story.append(Spacer(1, 8))
    return story


def render_examen(material: dict[str, Any], width: float, styles: dict[str, ParagraphStyle]) -> list[Any]:
    c = material["contenido_json"]
    story = title_block(material, styles)
    story.append(student_info_box(width))
    story.append(Spacer(1, 12))
    story.append(instruction_box(c.get("instrucciones") or "Lee cuidadosamente cada pregunta antes de responder.", width))
    story.append(Spacer(1, 12))
    story.append(section_bar("EXAMEN", width))
    story.append(Spacer(1, 8))

    for item in c.get("preguntas", []):
        num = item.get("numero")
        question = item.get("enunciado")
        points = item.get("puntaje")
        block: list[Any] = [
            markup(
                f"<b>{escape(str(num))}. {escape(str(question))}</b> "
                f"<font color='{ACCENT.hexval()}'><b>[{escape(str(points))} pts]</b></font>",
                styles["body"],
            )
        ]
        for idx, option in enumerate(item.get("opciones") or []):
            letter = chr(65 + idx)
            block.append(markup(f"<font color='{PRIMARY.hexval()}'><b>○</b></font> <b>{letter})</b> {escape(option_text(option))}", styles["body"]))
        if item.get("tipo") in {"abierta", "respuesta_corta"}:
            block.extend(
                [
                    para("R: ________________________________________________", styles["body"]),
                    para("   ________________________________________________", styles["body"]),
                ]
            )
        else:
            block.append(para("Respuesta: ____________________", styles["body"]))
        story.append(KeepTogether(block))
        story.append(HRFlowable(width="100%", thickness=0.3, color=GRAY_300, spaceAfter=8))
    return story


def render_rubrica(material: dict[str, Any], width: float, styles: dict[str, ParagraphStyle]) -> list[Any]:
    c = material["contenido_json"]
    story = title_block(material, styles)
    story.append(section_bar("RUBRICA DE EVALUACION", width))
    story.append(Spacer(1, 10))
    if c.get("escala"):
        story.append(instruction_box(f"Escala: {', '.join(c['escala'])}", width))
        story.append(Spacer(1, 10))
    rows = [["Criterio", "Peso", "Descripcion", "Niveles"]]
    for item in c.get("criterios", []):
        levels = "<br/>".join(f"<b>{escape(str(k))}:</b> {escape(str(v))}" for k, v in item.get("niveles", {}).items())
        rows.append(
            [
                para(item.get("nombre", ""), styles["cell"]),
                f"{item.get('peso_porcentaje', '')}%",
                para(item.get("descripcion", ""), styles["cell"]),
                markup(levels, styles["cell"]),
            ]
        )
    story.append(data_table(rows, [1.0 * inch, 0.55 * inch, 1.75 * inch, width - 3.3 * inch]))
    return story


def render_plan(material: dict[str, Any], width: float, styles: dict[str, ParagraphStyle]) -> list[Any]:
    c = material["contenido_json"]
    story = title_block(material, styles)
    story.append(section_bar("PLAN DE REFUERZO", width))
    story.append(Spacer(1, 10))
    if c.get("objetivo_general"):
        story.append(instruction_box(c["objetivo_general"], width))
        story.append(Spacer(1, 10))
    for week in c.get("semanas", []):
        story.append(markup(f"<b>Semana {escape(str(week.get('semana')))}: {escape(str(week.get('tema')))}</b>", styles["body_bold"]))
        story.append(para(f"Meta: {week.get('meta_semana')}", styles["body"]))
        story.append(para("Actividades", styles["small"]))
        story.append(bullets(week.get("actividades", []), styles["body"]))
        story.append(para("Recursos", styles["small"]))
        story.append(bullets(week.get("recursos", []), styles["body"]))
        story.append(HRFlowable(width="100%", thickness=0.3, color=GRAY_300, spaceAfter=7))
    if c.get("estrategias_apoyo"):
        story.append(para("Estrategias de apoyo", styles["section"]))
        story.append(bullets(c["estrategias_apoyo"], styles["body"]))
    if c.get("indicadores_mejora"):
        story.append(para("Indicadores de mejora", styles["section"]))
        story.append(bullets(c["indicadores_mejora"], styles["body"]))
    return story


def render_material(material: dict[str, Any], width: float, styles: dict[str, ParagraphStyle]) -> list[Any]:
    renderers = {
        "sopa_letras": render_sopa,
        "crucigrama": render_crucigrama,
        "cuento": render_cuento,
        "guia": render_guia,
        "taller": render_taller,
        "examen": render_examen,
        "rubrica": render_rubrica,
        "plan_refuerzo": render_plan,
    }
    return renderers[material["tipo"]](material, width, styles)


def draw_header_footer(canvas: Any, doc: Any, header_title: str) -> None:
    canvas.saveState()
    page_width, page_height = doc.pagesize
    canvas.setFillColor(PRIMARY)
    canvas.rect(0, page_height - 42, page_width, 42, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(doc.leftMargin, page_height - 28, header_title[:62])
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(page_width - doc.rightMargin, page_height - 28, "XCalificator - Plataforma Educativa IA")

    canvas.setFillColor(GRAY_300)
    canvas.rect(0, 0, page_width, 28, fill=1, stroke=0)
    canvas.setFillColor(GRAY_700)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(doc.leftMargin, 10, "Generado desde backend")
    canvas.drawRightString(page_width - doc.rightMargin, 10, f"Pagina {canvas.getPageNumber()}")
    canvas.restoreState()


def build_pdf(path: Path, story: list[Any], header_title: str) -> None:
    doc = SimpleDocTemplate(
        str(path),
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=58,
        bottomMargin=40,
        title=path.stem,
    )
    doc.build(
        story,
        onFirstPage=lambda c, d: draw_header_footer(c, d, header_title),
        onLaterPages=lambda c, d: draw_header_footer(c, d, header_title),
    )


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    styles = get_styles()
    materials = fetch_latest_materials()
    page_width, _ = letter
    content_width = page_width - 108

    pdf_paths: list[Path] = []
    for index, material in enumerate(materials, start=1):
        filename = f"{index:02d}-{material['tipo']}-{slugify(material['titulo'])}.pdf"
        path = OUTPUT_DIR / filename
        build_pdf(path, render_material(material, content_width, styles), material["titulo"])
        pdf_paths.append(path)

    combined_story: list[Any] = []
    for index, material in enumerate(materials):
        if index:
            combined_story.append(PageBreak())
        combined_story.extend(render_material(material, content_width, styles))

    combined_path = OUTPUT_DIR / "generaciones_herramientas_ciencias_naturales.pdf"
    build_pdf(combined_path, combined_story, "Generaciones de herramientas - Ciencias Naturales")

    writer = PdfWriter()
    for path in pdf_paths:
        writer.append(str(path))
    bundle_path = OUTPUT_DIR / "generaciones_herramientas_ciencias_naturales_pack.pdf"
    with bundle_path.open("wb") as fh:
        writer.write(fh)

    print(
        json.dumps(
            {
                "individual": [str(path) for path in pdf_paths],
                "combined": str(combined_path),
                "pack": str(bundle_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
