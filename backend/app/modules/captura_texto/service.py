"""Texto desde una foto o un archivo, para llenar cualquier campo sin digitar (Spec 201).

Lee fotos (JPG, PNG, WEBP), PDF con texto o escaneados, Word, Excel, CSV y
texto plano. Devuelve solo el texto: no guarda el archivo ni cambia datos.
"""
from __future__ import annotations

import csv
import io
import re
import zipfile
from dataclasses import dataclass, field
from uuid import UUID

MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_TEXT_CHARS = 60_000
MAX_SCANNED_PAGES = 6
MAX_SHEET_ROWS = 2_000

KIND_LABELS = {
    "imagen": "foto",
    "pdf": "PDF",
    "pdf_escaneado": "PDF escaneado",
    "docx": "Word",
    "xlsx": "Excel",
    "csv": "CSV",
    "texto": "texto",
}

PLAIN_TRANSCRIPTION_PROMPT = """Eres un transcriptor. Copia TODO el texto visible en la imagen, de forma literal y completa,
en el orden natural de lectura. Conserva párrafos, títulos, numeración, tildes y signos. No resumas, no corrijas,
no expliques y no añadas nada que no esté escrito. Si hay una tabla, escribe cada fila en una línea separando las
celdas con « | ». Si una palabra no se lee, escribe [ilegible].
Devuelve SOLO JSON válido con este formato:
{"texto_extraido": "texto completo con saltos de línea", "usable": true, "alertas": []}
Si la imagen no contiene texto legible, devuelve "texto_extraido": "" y "usable": false."""


class UnsupportedFile(ValueError):
    """El archivo no es de un tipo que se pueda leer."""


@dataclass
class CapturedText:
    texto: str
    origen: str
    advertencias: list[str] = field(default_factory=list)
    paginas: int = 1


def detect_kind(content: bytes, filename: str) -> str:
    """Identifica el archivo por su contenido; la extensión solo desempata."""
    name = (filename or "").lower()
    if content[:3] == b"\xff\xd8\xff" or content[:4] == b"\x89PNG" or (content[:4] == b"RIFF" and content[8:12] == b"WEBP"):
        return "imagen"
    if content[:4] == b"%PDF":
        return "pdf"
    if content[:4] == b"PK\x03\x04":
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                names = set(archive.namelist())
        except zipfile.BadZipFile as exc:
            raise UnsupportedFile("El archivo está dañado.") from exc
        if "word/document.xml" in names:
            return "docx"
        if "xl/workbook.xml" in names:
            return "xlsx"
        raise UnsupportedFile("Ese tipo de archivo no se puede leer.")
    if name.endswith((".csv", ".tsv")):
        return "csv"
    if name.endswith((".txt", ".md")) or _looks_like_text(content):
        return "texto"
    raise UnsupportedFile("Ese tipo de archivo no se puede leer.")


def _looks_like_text(content: bytes) -> bool:
    sample = content[:4096]
    return bool(sample) and b"\x00" not in sample and sum(1 for byte in sample if byte < 9) == 0


def _decode(content: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


PAGE_MARKER = re.compile(r"^\s*=+\s*P[ÁA]GINA\s+\d+\s*=+\s*$", re.IGNORECASE)


def _tidy(text: str) -> str:
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    # El lector de hojas antepone un marcador de página que no es parte del texto.
    lines = [line for line in lines if not PAGE_MARKER.match(line)]
    cleaned: list[str] = []
    for line in lines:
        if line or (cleaned and cleaned[-1]):
            cleaned.append(line)
    return "\n".join(cleaned).strip()[:MAX_TEXT_CHARS]


def _row_text(cells) -> str:
    values = ["" if cell is None else str(cell).strip() for cell in cells]
    while values and not values[-1]:
        values.pop()
    return " | ".join(values) if any(values) else ""


def text_from_docx(content: bytes) -> str:
    """Párrafos y tablas en el orden del documento."""
    import docx
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    document = docx.Document(io.BytesIO(content))
    parts: list[str] = []
    for element in document.element.body.iterchildren():
        if element.tag.endswith("}p"):
            text = Paragraph(element, document).text.strip()
            if text:
                parts.append(text)
        elif element.tag.endswith("}tbl"):
            rows = [_row_text(cell.text for cell in row.cells) for row in Table(element, document).rows]
            parts.append("\n".join(row for row in rows if row))
    return "\n\n".join(part for part in parts if part)


def text_from_xlsx(content: bytes) -> tuple[str, list[str]]:
    import openpyxl

    workbook = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    parts: list[str] = []
    warnings: list[str] = []
    try:
        sheets = [sheet for sheet in workbook.worksheets if sheet.sheet_state == "visible"] or workbook.worksheets
        for sheet in sheets:
            rows: list[str] = []
            for index, row in enumerate(sheet.iter_rows(values_only=True)):
                if index >= MAX_SHEET_ROWS:
                    warnings.append(f"La hoja «{sheet.title}» es muy larga; se leyeron las primeras {MAX_SHEET_ROWS} filas.")
                    break
                line = _row_text(row)
                if line:
                    rows.append(line)
            if rows:
                parts.append((f"{sheet.title}\n" if len(sheets) > 1 else "") + "\n".join(rows))
    finally:
        workbook.close()
    return "\n\n".join(parts), warnings


def text_from_csv(content: bytes) -> str:
    raw = _decode(content)
    try:
        dialect = csv.Sniffer().sniff(raw[:4096], delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    rows = [_row_text(row) for row in csv.reader(io.StringIO(raw), dialect)]
    return "\n".join(row for row in rows if row)


async def _read_image(content: bytes, mime: str, name: str, user_id: UUID | None) -> tuple[str, list[str]]:
    from app.modules.evaluaciones.digitalize_service import _extract_image_text

    return await _extract_image_text(content, mime, name, user_id, None, prompt_override=PLAIN_TRANSCRIPTION_PROMPT)


def _image_mime(content: bytes) -> str:
    if content[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    return "image/png" if content[:4] == b"\x89PNG" else "image/webp"


async def capture_text(content: bytes, filename: str, user_id: UUID | None, *, read_image=_read_image) -> CapturedText:
    """Devuelve el texto del archivo. ``read_image`` se inyecta en pruebas."""
    if not content:
        raise UnsupportedFile("El archivo está vacío.")
    kind = detect_kind(content, filename)
    warnings: list[str] = []
    pages = 1
    if kind == "imagen":
        text, warnings = await read_image(content, _image_mime(content), filename or "foto", user_id)
    elif kind == "pdf":
        from app.modules.dba.document_service import extraer_texto_pdf

        text = extraer_texto_pdf(content).strip()
        if not text:
            kind = "pdf_escaneado"
            text, warnings, pages = await _read_scanned_pdf(content, filename, user_id, read_image)
    elif kind == "docx":
        text = text_from_docx(content)
    elif kind == "xlsx":
        text, warnings = text_from_xlsx(content)
    elif kind == "csv":
        text = text_from_csv(content)
    else:
        text = _decode(content)
    text = _tidy(text)
    if not text:
        warnings = [*warnings, "No se encontró texto legible. Prueba con una foto más nítida o con otro archivo."]
    return CapturedText(texto=text, origen=KIND_LABELS[kind], advertencias=list(dict.fromkeys(warnings))[:6], paginas=pages)


async def _read_scanned_pdf(content: bytes, filename: str, user_id: UUID | None, read_image) -> tuple[str, list[str], int]:
    import fitz

    parts: list[str] = []
    warnings: list[str] = []
    with fitz.open(stream=content, filetype="pdf") as document:
        total = document.page_count
        for index in range(min(total, MAX_SCANNED_PAGES)):
            pixmap = document[index].get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            try:
                page_text, page_warnings = await read_image(pixmap.tobytes("png"), "image/png", f"{filename or 'PDF'} · hoja {index + 1}", user_id)
            except Exception:  # noqa: BLE001 - una hoja ilegible no debe perder las demás
                page_text, page_warnings = "", [f"No se pudo leer la hoja {index + 1}."]
            if page_text.strip():
                parts.append(page_text.strip())
            warnings.extend(page_warnings)
        if total > MAX_SCANNED_PAGES:
            warnings.append(f"El PDF tiene {total} hojas; se leyeron las primeras {MAX_SCANNED_PAGES}.")
    return "\n\n".join(parts), warnings, min(total, MAX_SCANNED_PAGES)
