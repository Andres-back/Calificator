"""Detect a reading text replaced by a marker and read only that page again, once.

A vision model sometimes writes "La liebre y la tortuga (lectura)" instead of the
story. A second, literal reading of the same page usually recovers it; when it does
not, the teacher is told which page to fix instead of a generic warning.
"""
from __future__ import annotations

import re
from collections.abc import Awaitable, Callable

from fastapi import HTTPException

from app.core.logging import get_logger

logger = get_logger(__name__)

_TEXT_WORDS = r"(?:lectura|texto|cuento|poema|f[aá]bula|historia|relato|narraci[oó]n)"
_MARKERS = (
    # "(lectura)", "(texto completo)" and summaries such as "(fábula con moraleja: ...)".
    re.compile(r"\(\s*(?:texto\s+de\s+(?:la\s+)?)?" + _TEXT_WORDS + r"\b[^()]{0,300}\)", re.I),
    re.compile(r"\[\s*(?:texto|lectura|cuento)(?![^\]]*RESPUESTA)[^\]]{0,60}\]", re.I),
    re.compile(_TEXT_WORDS + r"\s+(?:omitid[oa]|no\s+transcrit[oa]|resumid[oa])", re.I),
    re.compile(r"^\s*(?:\.{3}|…|\[\s*(?:\.{3}|…)\s*\])\s*$", re.M),
)
_PAGE_HEADER = re.compile(r"^=== P[ÁA]GINA (\d+) ===$", re.M)
# Questions that rely on a reading the transcription does not contain.
_READING_REFERENCE = re.compile(
    r"\b(?:lee|leer|lean)\s+(?:con\s+atenci[oó]n\s+)?(?:el|la|los|las)\s+(?:siguientes?\s+)?" + _TEXT_WORDS
    + r"|\bseg[uú]n\s+(?:el|la)\s+" + _TEXT_WORDS
    + r"|\b(?:de|en)\s+(?:la|el)\s+(?:historia|lectura|texto|cuento|f[aá]bula|relato)\b", re.I)
_FIRST_QUESTION = re.compile(r"(?:^|\s)\d{1,3}\s*[.)]\s+(?=\S)")
_MIN_READING_WORDS = 40

LITERAL_READING_PROMPT = """
Atención: en una lectura anterior de esta hoja, el texto de lectura quedó resumido o
reemplazado por un marcador como "(lectura)", "[texto]" o "...". Transcribe en
page_text el texto de lectura de forma literal y completa, con todos sus párrafos,
en el orden de la hoja, seguido de las preguntas y opciones. No lo resumas, no lo
abrevies, no lo pongas entre paréntesis y no uses marcadores. En esta lectura deja
answers como lista vacía, para no repetir la hoja.
Mantén el resto de reglas.
"""

PageLoader = Callable[[int], Awaitable[tuple[bytes, str] | None]]
PageReader = Callable[[bytes, str, int], Awaitable[tuple[str, list[str]]]]


def has_incomplete_reading(text: str) -> bool:
    return any(pattern.search(text or "") for pattern in _MARKERS)


_ITEM_BOUNDARY = re.compile(r"(?:^|\s)(?:\d{1,3}|[A-Da-d])\s*[.)](?=\s)")


def _longest_prose(body: str) -> int:
    """Words of the longest stretch between numbered questions and lettered options.

    Measuring "text before question 1" fails on "responde las preguntas 1 a 10.";
    a real reading is a long stretch wherever it sits.
    """
    segments = _ITEM_BOUNDARY.split(_PAGE_HEADER.sub("", body))
    return max((len(re.findall(r"\w+", segment)) for segment in segments), default=0)


def pages_to_reread(pages: list[tuple[int, str]]) -> list[int]:
    """Pages with a marker, plus the questions page when no page holds the cited reading."""
    selected = [number for number, body in pages if number and has_incomplete_reading(body)]
    content = [(number, body) for number, body in pages if number]
    has_reading = any(_longest_prose(body) >= _MIN_READING_WORDS for _number, body in content)
    if not has_reading:
        cited = [number for number, body in content if _READING_REFERENCE.search(body) and _FIRST_QUESTION.search(body)]
        selected += cited[:1]
    return sorted(set(selected))


def split_pages(text: str) -> list[tuple[int, str]]:
    """Pages keep their header, so joining them gives back the same text."""
    headers = list(_PAGE_HEADER.finditer(text))
    if not headers:
        return [(1, text)]
    pages = []
    if headers[0].start() > 0:
        pages.append((0, text[:headers[0].start()]))
    for index, header in enumerate(headers):
        end = headers[index + 1].start() if index + 1 < len(headers) else len(text)
        pages.append((int(header.group(1)), text[header.start():end]))
    return pages


def join_pages(pages: list[tuple[int, str]]) -> str:
    return "".join(body for _number, body in pages)


def _with_header(original: str, reread: str, number: int) -> str:
    """A page read on its own comes back as page 1: keep the page's real number."""
    content = _PAGE_HEADER.sub("", reread).strip()
    header = f"=== PÁGINA {number} ===\n" if _PAGE_HEADER.match(original.lstrip()) else ""
    return header + content + ("\n" if original.endswith("\n") else "")


async def complete_readings(text: str, warnings: list[str], *, load_page: PageLoader,
                            read_page: PageReader) -> tuple[str, list[str]]:
    pages = split_pages(text)
    reread_pages = pages_to_reread(pages)
    result_warnings = list(warnings)
    completed = []
    for number, body in pages:
        if number not in reread_pages:
            completed.append((number, body))
            continue
        reread = ""
        try:
            page = await load_page(number)
            if page is not None:
                reread, extra = await read_page(page[0], page[1], number)
        except (HTTPException, ValueError, OSError) as exc:
            logger.warning("digitalization.reading_reread_failed", extra={"page": number, "error": type(exc).__name__})
            reread = ""
        if reread.strip() and not pages_to_reread([(number, reread)]):
            completed.append((number, _with_header(body, reread, number)))
            result_warnings.append(f"Se volvió a leer la hoja {number} para transcribir su lectura completa.")
        else:
            completed.append((number, body))
            result_warnings.append(
                f"La lectura de la hoja {number} quedó incompleta. Revísala o pégala en el borrador antes de publicar.")
    return join_pages(completed), result_warnings


_GENERIC_PAGE_WARNINGS = {
    "La lectura de esta página tardó demasiado; puede reintentarse.",
    "Página no extraída automáticamente.",
    "Faltan páginas; revisión docente obligatoria.",
}


def missing_pages(text: str, total: int) -> list[int]:
    """Pages of the file whose header never came back from the reader."""
    present = {int(match.group(1)) for match in _PAGE_HEADER.finditer(text)}
    return [number for number in range(1, total + 1) if number not in present] if present else []


async def fill_missing_pages(text: str, warnings: list[str], *, total: int, load_page: PageLoader,
                             read_page: PageReader) -> tuple[str, list[str]]:
    """Read each lost page on its own, once, and name the pages that still fail."""
    missing = missing_pages(text, total)
    if not missing:
        return text, warnings
    result_warnings = [warning for warning in warnings if warning not in _GENERIC_PAGE_WARNINGS]
    pages = dict(split_pages(text))
    for number in missing:
        reread, extra = "", []
        try:
            page = await load_page(number)
            if page is not None:
                reread, extra = await read_page(page[0], page[1], number)
        except (HTTPException, ValueError, OSError) as exc:
            logger.warning("digitalization.missing_page_reread_failed", extra={"page": number, "error": type(exc).__name__})
            reread = ""
        if reread.strip():
            pages[number] = _with_header("=== PÁGINA 0 ===\n", reread, number)
            result_warnings += [*extra, f"Se volvió a leer la hoja {number}, que no se había podido leer."]
        else:
            result_warnings.append(f"No pudimos leer la hoja {number}. Revisa que la foto sea nítida y vuelve a "
                                   "digitalizar esa hoja para añadir sus preguntas.")
    joined = ""
    for _number, body in sorted(pages.items()):
        if joined and not joined.endswith("\n"):
            joined += "\n"
        joined += body
    return (joined if text.endswith("\n") else joined.rstrip("\n")), result_warnings


def render_pdf_page(content: bytes, number: int, *, max_side: int = 2200) -> tuple[bytes, str] | None:
    import fitz

    with fitz.open(stream=content, filetype="pdf") as document:
        if not 1 <= number <= len(document):
            return None
        page = document[number - 1]
        zoom = min(150 / 72, max_side / max(page.rect.width, page.rect.height))
        return page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False).tobytes("png"), "image/png"
