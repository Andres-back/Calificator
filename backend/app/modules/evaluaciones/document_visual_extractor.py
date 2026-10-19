"""Loss-preserving source inventory, separate from question/answer inference.

No source annotation becomes an answer key. Every admitted page is rendered,
including PDF pages with selectable text. Associations and publication safety
remain pending review; file detection does not prove semantic understanding.
"""
from __future__ import annotations

import asyncio
import hashlib
import math
import posixpath
from dataclasses import dataclass, field
from io import BytesIO
from typing import Awaitable, Callable
from urllib.parse import urlparse
from uuid import NAMESPACE_URL, uuid5
from xml.etree import ElementTree
from zipfile import ZipFile

import fitz
import httpx
from PIL import Image, ImageOps

from app.core.config import settings
from app.modules.evaluaciones.visual_schemas import VisualCoverage, VisualCoverageWarning
from app.modules.evaluaciones.visual_service import DOCX_MIME, MAX_RESOURCE_BYTES, inspect_resource_bytes

EXTRACTOR_VERSION = "evaluation-visual-1"
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}


class DocumentRendererUnavailable(RuntimeError):
    """Transient conversion failure; preserve the original for a retry."""


class VisualBudgetExceeded(ValueError):
    """Reject the full document; never turn a budget overrun into an omission."""


@dataclass(frozen=True)
class ExtractedAsset:
    content: bytes
    mime: str
    width: int
    height: int
    kind: str
    safety: str


@dataclass(frozen=True)
class SourceElement:
    id: str
    kind: str
    order: int
    text: str = ""
    page: int | None = None
    region: tuple[float, float, float, float] | None = None
    anchor: str | None = None
    asset_key: str | None = None
    data: dict = field(default_factory=dict)


@dataclass(frozen=True)
class DocumentVisualExtraction:
    original_sha256: str
    mime: str
    text: str
    pages: list[SourceElement]
    elements: list[SourceElement]
    assets: dict[str, ExtractedAsset]
    coverage: VisualCoverage
    extractor_version: str = EXTRACTOR_VERSION


async def render_docx(content: bytes, *, transport: httpx.AsyncBaseTransport | None = None) -> bytes:
    target = urlparse(settings.DOCUMENT_RENDERER_URL)
    if target.scheme != "http" or target.hostname != "document-renderer" or target.port != 8080 or target.username or target.password or target.path not in {"", "/"} or target.query or target.fragment:
        raise ValueError("El conversor debe usar el servicio interno de documentos.")
    try:
        async with httpx.AsyncClient(timeout=settings.DOCUMENT_RENDERER_TIMEOUT_SECONDS, follow_redirects=False, trust_env=False, transport=transport) as client:
            async with client.stream("POST", settings.DOCUMENT_RENDERER_URL.rstrip("/") + "/convert", content=content, headers={"Content-Type": DOCX_MIME}) as response:
                if response.status_code in {429, 503, 504}:
                    raise DocumentRendererUnavailable("El conversor está ocupado o tardó demasiado; conserva el trabajo para reintentar.")
                if response.status_code != 200 or response.headers.get("content-type", "").split(";")[0] != "application/pdf":
                    raise ValueError("No pudimos convertir este Word completo. Revisa el archivo o súbelo como PDF.")
                result = bytearray()
                async for chunk in response.aiter_bytes(chunk_size=1024 * 1024):
                    result.extend(chunk)
                    if len(result) > MAX_RESOURCE_BYTES:
                        raise ValueError("El PDF convertido supera el límite permitido; divide el documento.")
                if not result.startswith(b"%PDF"):
                    raise ValueError("No pudimos comprobar el PDF convertido.")
                return bytes(result)
    except (httpx.TimeoutException, httpx.NetworkError) as exc:
        raise DocumentRendererUnavailable("No pudimos conectar con el conversor; conserva el trabajo para reintentar.") from exc


class _Inventory:
    def __init__(self, content: bytes, mime: str):
        self.digest = hashlib.sha256(content).hexdigest()
        self.mime = mime
        self.pages: list[SourceElement] = []
        self.elements: list[SourceElement] = []
        self.assets: dict[str, ExtractedAsset] = {}
        self.warnings: list[VisualCoverageWarning] = []
        self.total_bytes = 0

    def asset(self, content: bytes, *, kind="imagen", safety="pendiente_revision") -> str:
        metadata = inspect_resource_bytes(content, clase="imagen")
        with Image.open(BytesIO(content)) as image:
            corrected = ImageOps.exif_transpose(image)
            if max(corrected.size) > settings.VISION_MAX_IMAGE_SIDE or image.format not in {"PNG", "JPEG", "WEBP"} or image.getexif():
                corrected.thumbnail((settings.VISION_MAX_IMAGE_SIDE, settings.VISION_MAX_IMAGE_SIDE))
                output = BytesIO()
                corrected.save(output, format="PNG")
                content = output.getvalue()
                metadata = inspect_resource_bytes(content, clase="imagen")
        # Include privacy class: a page must not inherit a publishable crop's flag.
        key = hashlib.sha256(safety.encode() + b"\0" + content).hexdigest()
        if key not in self.assets:
            self.total_bytes += len(content)
            if self.total_bytes > settings.DOCUMENT_VISUAL_MAX_BYTES:
                raise VisualBudgetExceeded("El documento supera el límite de imágenes procesables; divídelo sin omitir páginas.")
            self.assets[key] = ExtractedAsset(content, metadata["mime"], metadata["ancho"], metadata["alto"], kind, safety)
        return key

    def element(self, scope: str, kind: str, **values) -> SourceElement:
        element = SourceElement(str(uuid5(NAMESPACE_URL, self.digest + "/" + scope)), kind, len(self.elements), **values)
        self.elements.append(element)
        if kind != "texto":
            reason = "asociacion_pendiente" if element.asset_key or element.data.get("rows") else "no_conservado"
            self.warnings.append(VisualCoverageWarning(elemento_id=element.id, pagina=element.page, motivo=reason,
                mensaje="Revisa a qué preguntas corresponde este material antes de usarlo." if reason == "asociacion_pendiente" else "No pudimos recuperar este elemento por separado. Compáralo con la página original."))
        return element

    def finish(self) -> DocumentVisualExtraction:
        text = "\n".join(element.text for element in self.elements if element.text)
        if len(text) > settings.PHOTO_GRADING_CONTEXT_BUDGET_CHARS:
            raise ValueError("El texto supera el límite de procesamiento; divide el documento sin omitir contenido.")
        if not self.warnings:
            self.warnings.append(VisualCoverageWarning(pagina=1, motivo="asociacion_pendiente", mensaje="Revisa las preguntas y su contexto antes de publicar."))
        coverage = VisualCoverage(
            detectados=[element.id for element in self.elements],
            conservados=[element.id for element in self.elements if element.text or element.asset_key or element.data.get("rows")],
            paginas_detectadas=[page.page for page in self.pages], paginas_conservadas=[page.page for page in self.pages],
            avisos=self.warnings, estado="requiere_revision",
        )
        return DocumentVisualExtraction(self.digest, self.mime, text, self.pages, self.elements, self.assets, coverage)


def _region(rect: fitz.Rect, page: fitz.Rect) -> tuple[float, float, float, float]:
    return (max(0, min(1, (rect.x0 - page.x0) / page.width)), max(0, min(1, (rect.y0 - page.y0) / page.height)),
            max(0, min(1, (rect.x1 - page.x0) / page.width)), max(0, min(1, (rect.y1 - page.y0) / page.height)))


def _extract_pdf(inventory: _Inventory, content: bytes) -> None:
    inspect_resource_bytes(content, clase="original")  # Reject protected/over-limit in full, before rendering.
    with fitz.open(stream=content, filetype="pdf") as document:
        for index, page in enumerate(document):
            bounds = page.rect
            if not all(math.isfinite(value) and 0 < value <= 14400 for value in (bounds.width, bounds.height)):
                raise ValueError("La página tiene dimensiones no permitidas; guarda el documento en formato A4 o carta.")
            zoom = min(settings.GRADING_PDF_RENDER_DPI / 72, settings.VISION_MAX_IMAGE_SIDE / max(bounds.width, bounds.height))
            matrix = fitz.Matrix(zoom, zoom)
            page_number = index + 1
            page_key = inventory.asset(page.get_pixmap(matrix=matrix, alpha=False).tobytes("png"), kind="pagina", safety="privado_original")
            inventory.pages.append(SourceElement(str(uuid5(NAMESPACE_URL, inventory.digest + f"/page/{page_number}")), "pagina", index, page=page_number, asset_key=page_key))
            blocks = page.get_text("dict", sort=True)["blocks"]
            has_text = False
            for block_index, block in enumerate(blocks):
                rect = fitz.Rect(block["bbox"]) & bounds
                if rect.is_empty or rect.is_infinite:
                    continue
                scope = f"pdf/{page_number}/block/{block_index}"
                region = _region(rect, bounds)
                if block["type"] == 0:
                    text = "\n".join("".join(span["text"] for span in line["spans"]) for line in block["lines"])
                    if text.strip():
                        has_text = True
                        inventory.element(scope, "texto", text=text, page=page_number, region=region)
                elif block["type"] == 1:
                    try:
                        image_key = inventory.asset(block["image"])
                    except VisualBudgetExceeded:
                        raise
                    except ValueError:
                        # A rendered region preserves masks/unsupported image encodings.
                        image_key = inventory.asset(page.get_pixmap(matrix=matrix, clip=rect, alpha=False).tobytes("png"))
                    inventory.element(scope, "imagen", page=page_number, region=region, asset_key=image_key)
            # Drawing clusters preserve native vector graphs, formula outlines and
            # table borders; the full page separately preserves labels/legends.
            for drawing_index, rect in enumerate(page.cluster_drawings()):
                rect = (fitz.Rect(rect) + (-8, -8, 8, 8)) & bounds
                if rect.is_empty:
                    continue
                key = inventory.asset(page.get_pixmap(matrix=matrix, clip=rect, alpha=False).tobytes("png"))
                inventory.element(f"pdf/{page_number}/vector/{drawing_index}", "vectorial", page=page_number, region=_region(rect, bounds), asset_key=key)
            if not has_text:
                inventory.warnings.append(VisualCoverageWarning(pagina=page_number, motivo="formato_no_interpretable",
                    mensaje="Conservamos esta página como imagen. Falta leer sus preguntas y comprobar sus figuras."))


def _extract_word_native(inventory: _Inventory, content: bytes) -> None:
    with ZipFile(BytesIO(content)) as archive:
        root = ElementTree.fromstring(archive.read("word/document.xml"))
        body = root.find("w:body", NS)
        if body is None:
            raise ValueError("El Word no contiene un cuerpo legible.")
        relations = ElementTree.fromstring(archive.read("word/_rels/document.xml.rels")) if "word/_rels/document.xml.rels" in archive.namelist() else []
        targets = {item.attrib["Id"]: item.attrib["Target"] for item in relations if "Id" in item.attrib and "Target" in item.attrib}
        for index, node in enumerate(body):
            anchor = f"word/document.xml/body/{node.tag.rsplit('}', 1)[-1]}[{index + 1}]"
            text = "".join(part.text or "" for part in node.iter("{" + NS["w"] + "}t"))
            if node.tag == "{" + NS["w"] + "}tbl":
                rows = [["".join(part.text or "" for part in cell.iter("{" + NS["w"] + "}t")) for cell in row.findall("w:tc", NS)] for row in node.findall("w:tr", NS)]
                merged = [{"row": row_index, "cell": cell_index,
                           "grid_span": span.attrib.get("{" + NS["w"] + "}val", "1") if span is not None else "1",
                           "vertical_merge": merge.attrib.get("{" + NS["w"] + "}val", "continue") if merge is not None else None}
                          for row_index, row in enumerate(node.findall("w:tr", NS))
                          for cell_index, cell in enumerate(row.findall("w:tc", NS))
                          for span in [cell.find("w:tcPr/w:gridSpan", NS)]
                          for merge in [cell.find("w:tcPr/w:vMerge", NS)]
                          if span is not None or merge is not None]
                element = inventory.element(anchor, "tabla", anchor=anchor, text="\n".join("\t".join(row) for row in rows),
                    data={"rows": rows, "merged_cells": merged, "structure_requires_review": bool(merged) or len({len(row) for row in rows}) > 1})
                if element.data["structure_requires_review"]:
                    inventory.warnings.append(VisualCoverageWarning(elemento_id=element.id, motivo="formato_no_interpretable",
                        mensaje="Conservamos la tabla y su página. Revisa las celdas combinadas antes de convertirla en una tabla editable."))
            elif text:
                inventory.element(anchor, "texto", anchor=anchor, text=text)
            for image_index, blip in enumerate(node.findall(".//a:blip", NS)):
                target = targets.get(blip.attrib.get("{" + NS["r"] + "}embed", ""), "")
                name = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("word", target))
                image_anchor = anchor + f"/blip[{image_index + 1}]"
                asset_key = None
                if target and name in archive.namelist():
                    try:
                        asset_key = inventory.asset(archive.read(name))
                    except VisualBudgetExceeded:
                        raise
                    except ValueError:
                        pass  # Retain a localized omission, never invent a replacement.
                inventory.element(image_anchor, "imagen", anchor=image_anchor, asset_key=asset_key)


def _extract_photo(inventory: _Inventory, content: bytes) -> None:
    key = inventory.asset(content, kind="pagina", safety="privado_original")
    page = SourceElement(str(uuid5(NAMESPACE_URL, inventory.digest + "/page/1")), "pagina", 0, page=1, asset_key=key)
    inventory.pages.append(page)
    inventory.warnings.append(VisualCoverageWarning(pagina=1, motivo="formato_no_interpretable", mensaje="Conservamos la foto. Falta leer las preguntas y comprobar el material visual."))


async def extract_visual_document(
    content: bytes, mime: str, *, renderer: Callable[[bytes], Awaitable[bytes]] | None = None,
) -> DocumentVisualExtraction:
    metadata = await asyncio.to_thread(inspect_resource_bytes, content, clase="original")
    if mime != metadata["mime"]:
        raise ValueError("El contenido del archivo no coincide con su formato.")
    inventory = _Inventory(content, mime)
    if mime == DOCX_MIME:
        await asyncio.to_thread(_extract_word_native, inventory, content)
        converted = await (renderer or render_docx)(content)
        await asyncio.to_thread(_extract_pdf, inventory, converted)
    elif mime == "application/pdf":
        await asyncio.to_thread(_extract_pdf, inventory, content)
    else:
        await asyncio.to_thread(_extract_photo, inventory, content)
    return inventory.finish()
