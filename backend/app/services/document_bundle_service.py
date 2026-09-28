"""Preparación común de documentos privados aportados por docentes.

Este servicio comparte la normalización segura de imágenes/PDF, pero no
arrastra estados ni reglas de las entregas estudiantiles.
"""
from __future__ import annotations

import zipfile
from dataclasses import dataclass
from io import BytesIO

from fastapi import UploadFile

from app.core.config import settings
from app.services.evidence_bundle_service import (
    ALLOWED_IMAGE_MIMES,
    EvidenceBundleError,
    build_evidence_bundle,
)
from app.services.storage_service import read_upload_limited, validate_mime


DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class DocumentBundleError(ValueError):
    """Error de validación que puede mostrarse sin filtrar datos internos."""


@dataclass(frozen=True)
class DocumentBundle:
    content: bytes
    filename: str
    mime: str
    page_count: int
    source_type: str
    original_names: list[str]


def _is_docx(content: bytes) -> bool:
    if not content.startswith(b"PK"):
        return False
    try:
        with zipfile.ZipFile(BytesIO(content)) as archive:
            members = archive.infolist()
            names = {member.filename for member in members}
            document = next((member for member in members if member.filename == "word/document.xml"), None)
            if document is None or document.file_size > 10 * 1024 * 1024:
                return False
            if sum(member.file_size for member in members) > 100 * 1024 * 1024:
                return False
    except (zipfile.BadZipFile, OSError):
        return False
    return "[Content_Types].xml" in names and "word/document.xml" in names


async def build_document_bundle(
    uploads: UploadFile | list[UploadFile],
    *,
    rotations: list[int] | None = None,
) -> DocumentBundle:
    """Valida atómicamente fotos ordenadas, un PDF o un DOCX."""
    files = list(uploads) if isinstance(uploads, (list, tuple)) else [uploads]
    if not files:
        raise DocumentBundleError("Selecciona al menos una foto o un documento")

    # Un DOCX es el único formato admitido que no maneja el normalizador de
    # evidencias. Se detecta por estructura ZIP, nunca solo por extensión/MIME.
    if len(files) == 1:
        upload = files[0]
        max_total = max(1, int(settings.MAX_EVIDENCE_TOTAL_MB)) * 1024 * 1024
        try:
            content = await read_upload_limited(upload, max_total)
        except ValueError as exc:
            raise DocumentBundleError("El documento supera el límite total de 40 MB") from exc
        if _is_docx(content):
            return DocumentBundle(
                content=content,
                filename=upload.filename or "material.docx",
                mime=DOCX_MIME,
                page_count=1,
                source_type="documento",
                original_names=[upload.filename or "material.docx"],
            )
        await upload.seek(0)

    try:
        bundle = await build_evidence_bundle(files, rotations=rotations)
    except EvidenceBundleError as exc:
        raise DocumentBundleError(str(exc)) from exc

    source_type = "pdf" if bundle.mime == "application/pdf" else "foto"
    # Varias fotos se consolidan como PDF, pero siguen siendo una fuente de
    # tipo foto para conservar su procedencia y orden original.
    if bundle.evidence_type in {"foto", "fotos"}:
        source_type = "foto"
    names = [str(item.get("nombre") or "hoja") for item in bundle.metadata.get("archivos", [])]
    return DocumentBundle(
        content=bundle.content,
        filename=bundle.filename,
        mime=bundle.mime,
        page_count=bundle.page_count,
        source_type=source_type,
        original_names=names,
    )


def detect_supported_mime(content: bytes, filename: str) -> str:
    """Utilidad pública para pruebas y validaciones puntuales."""
    if _is_docx(content):
        return DOCX_MIME
    mime = validate_mime(content, filename)
    if mime not in ALLOWED_IMAGE_MIMES | {"application/pdf"}:
        raise DocumentBundleError("Tipo de documento no admitido")
    return mime
