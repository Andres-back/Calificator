"""Lista de estudiantes desde un archivo, además de la foto (Spec 202).

Excel, CSV, Word, texto y PDF con texto se leen sin IA: los nombres se toman
de las filas. Un PDF escaneado se lee hoja por hoja como si fueran fotos.
"""
from __future__ import annotations

import re
import unicodedata
from collections.abc import Awaitable, Callable
from typing import Any

from app.modules.captura_texto.service import (
    UnsupportedFile,
    detect_kind,
    text_from_csv,
    text_from_docx,
    text_from_xlsx,
)

MAX_STUDENTS = 100
MAX_SCANNED_PAGES = 3
CELL_SEPARATOR = " | "

HEADER_WORDS = {
    "nombre", "nombres", "apellido", "apellidos", "estudiante", "estudiantes", "alumno", "alumnos", "alumna",
    "completo", "completos", "nombres y apellidos", "apellidos y nombres", "lista", "listado", "curso", "grado",
    "grupo", "docente", "profesor", "profesora", "materia", "asignatura", "area", "fecha", "periodo", "jornada",
    "sede", "institucion", "colegio", "asistencia", "documento", "identificacion", "codigo", "no", "n", "nro", "numero", "item",
    "director", "directora", "ano", "lectivo", "observacion", "observaciones", "firma", "total",
}
NOISE_CELLS = {
    "x", "si", "no", "p", "a", "t", "e", "m", "f", "presente", "ausente", "tarde", "excusa", "masculino", "femenino",
    "activo", "retirado", "ok", "na", "n/a",
}
NAME_PATTERN = re.compile(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$")
LEADING_NUMBER = re.compile(r"^\s*\d{1,3}\s*[.)\-:°º]?\s+")

ReadPhoto = Callable[[bytes, str], Awaitable[list[dict[str, Any]]]]


def _plain(value: str) -> str:
    text = unicodedata.normalize("NFD", value.lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return " ".join(re.sub(r"[^a-z0-9/ ]+", " ", text).split())


def _is_name_cell(cell: str) -> bool:
    plain = _plain(cell)
    if not plain or plain in NOISE_CELLS or plain in HEADER_WORDS or len(plain) < 2:
        return False
    return bool(NAME_PATTERN.match(cell.strip()))


def _is_header(cells: list[str]) -> bool:
    words = [word for cell in cells for word in _plain(cell).split()]
    if not words:
        return True
    return sum(1 for word in words if word in HEADER_WORDS) >= max(1, (len(words) + 1) // 2)


def _presentable(name: str) -> str:
    """Las listas suelen venir en MAYÚSCULAS; se dejan con mayúscula inicial."""
    name = " ".join(name.replace(",", " ").split()).strip(" .-")
    letters = [ch for ch in name if ch.isalpha()]
    if letters and all(ch.isupper() for ch in letters):
        name = " ".join(word.capitalize() if len(word) > 2 or index == 0 else word.lower() for index, word in enumerate(name.split()))
        name = re.sub(r"\b(De|Del|La|Las|Los|Y)\b", lambda match: match.group(1).lower(), name)
        name = name[0].upper() + name[1:] if name else name
    return name


def names_from_text(text: str) -> list[str]:
    """Extrae un nombre por fila. Si hay columnas de apellidos y nombres, las une como «Nombres Apellidos»."""
    names: list[str] = []
    seen: set[str] = set()
    surname_column: int | None = None
    given_column: int | None = None
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        cells = [cell.strip() for cell in line.split(CELL_SEPARATOR)] if CELL_SEPARATOR in line else [LEADING_NUMBER.sub("", line)]
        if _is_header(cells):
            plain_cells = [_plain(cell) for cell in cells]
            surname = [index for index, cell in enumerate(plain_cells) if cell.startswith("apellido")]
            given = [index for index, cell in enumerate(plain_cells) if cell.startswith("nombre") and "apellido" not in cell]
            if surname and given:
                surname_column, given_column = surname[0], given[0]
            continue
        if surname_column is not None and given_column is not None and max(surname_column, given_column) < len(cells) \
                and _is_name_cell(cells[surname_column]) and _is_name_cell(cells[given_column]):
            candidate = f"{cells[given_column]} {cells[surname_column]}"
        else:
            candidate = " ".join(cell for cell in cells if _is_name_cell(cell))
        candidate = _presentable(candidate)
        words = candidate.split()
        if not (2 <= len(words) <= 8) or sum(ch.isalpha() for ch in candidate) < 5 or len(candidate) > 160:
            continue
        key = _plain(candidate)
        if key in seen:
            continue
        seen.add(key)
        names.append(candidate)
        if len(names) >= MAX_STUDENTS:
            break
    return names


def _candidates(names: list[str]) -> list[dict[str, Any]]:
    return [{"nombre": name, "confianza": 0.95, "requiere_revision": False, "advertencias": []} for name in names]


def _photo_mime(content: bytes) -> str:
    if content[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    return "image/png" if content[:4] == b"\x89PNG" else "image/webp"


async def candidates_from_file(content: bytes, filename: str, *, read_photo: ReadPhoto) -> list[dict[str, Any]]:
    """Devuelve los estudiantes detectados en una foto o en un archivo."""
    kind = detect_kind(content, filename)
    if kind == "imagen":
        return await read_photo(content, _photo_mime(content))
    if kind == "pdf":
        from app.modules.dba.document_service import extraer_texto_pdf

        text = extraer_texto_pdf(content).strip()
        if not text:
            return await _scanned_pdf(content, read_photo)
    elif kind == "docx":
        text = text_from_docx(content)
    elif kind == "xlsx":
        text, _ = text_from_xlsx(content)
    elif kind == "csv":
        text = text_from_csv(content)
    else:
        text = content.decode("utf-8-sig", errors="replace")
    return _candidates(names_from_text(text))


async def _scanned_pdf(content: bytes, read_photo: ReadPhoto) -> list[dict[str, Any]]:
    import fitz

    found: list[dict[str, Any]] = []
    seen: set[str] = set()
    with fitz.open(stream=content, filetype="pdf") as document:
        for index in range(min(document.page_count, MAX_SCANNED_PAGES)):
            pixmap = document[index].get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            for candidate in await read_photo(pixmap.tobytes("png"), "image/png"):
                key = _plain(str(candidate.get("nombre") or ""))
                if key and key not in seen:
                    seen.add(key)
                    found.append(candidate)
    return found[:MAX_STUDENTS]


__all__ = ["UnsupportedFile", "candidates_from_file", "detect_kind", "names_from_text"]
