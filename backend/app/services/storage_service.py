"""Servicio de almacenamiento local para uploads."""
from __future__ import annotations

import uuid
from pathlib import Path
from urllib.parse import unquote, urlparse

import aiofiles
from fastapi import UploadFile

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

ALLOWED_MIME = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"
}
MAX_SIZE_BYTES = int(getattr(settings, "MAX_IMAGE_SIZE_MB", 10)) * 1024 * 1024
UPLOAD_CHUNK_SIZE = 1024 * 1024
MIME_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}
PRIVATE_MIME_EXTENSIONS = {
    **MIME_EXTENSIONS,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


def get_upload_dir() -> Path:
    path = Path(settings.UPLOADS_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_upload(
    content: bytes,
    original_filename: str,
    subfolder: str = "general",
    max_size_bytes: int | None = None,
) -> str:
    """
    Guarda un archivo en disco con nombre UUID y devuelve la URL pública relativa.
    """
    effective_limit = max_size_bytes or MAX_SIZE_BYTES
    if len(content) > effective_limit:
        raise ValueError(f"File exceeds maximum size of {effective_limit // (1024 * 1024)} MB")

    mime = validate_mime(content, original_filename)
    ext = MIME_EXTENSIONS[mime]
    filename = f"{uuid.uuid4().hex}{ext}"
    dest_dir = get_upload_dir() / subfolder
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename

    async with aiofiles.open(dest_path, "wb") as f:
        await f.write(content)

    public_url = f"{settings.PUBLIC_UPLOADS_BASE_URL}/{subfolder}/{filename}"
    logger.debug("Saved upload: %s", public_url)
    return public_url


class UploadTooLargeError(ValueError):
    pass


async def read_upload_limited(upload: UploadFile, max_bytes: int) -> bytes:
    """Lee por bloques y detiene el consumo en cuanto supera el límite."""
    content = bytearray()
    while chunk := await upload.read(UPLOAD_CHUNK_SIZE):
        content.extend(chunk)
        if len(content) > max_bytes:
            raise UploadTooLargeError(
                f"El archivo supera el límite de {max_bytes // (1024 * 1024)} MB",
            )
    return bytes(content)


async def save_private_upload(
    content: bytes,
    mime: str,
    *,
    subfolder: str,
) -> str:
    """Guarda un archivo temporal con nombre y extensión controlados por el servidor."""
    extension = PRIVATE_MIME_EXTENSIONS.get(mime)
    if not extension:
        raise ValueError("Tipo de archivo privado no permitido")
    relative_path = Path(".private") / subfolder / f"{uuid.uuid4().hex}{extension}"
    destination = get_upload_dir() / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(destination, "wb") as target:
        await target.write(content)
    return relative_path.as_posix()


def resolve_private_upload_path(relative_path: str) -> Path:
    uploads_root = get_upload_dir().resolve()
    candidate = (uploads_root / relative_path).resolve()
    private_root = (uploads_root / ".private").resolve()
    if candidate == private_root or private_root not in candidate.parents:
        raise ValueError("Ruta privada fuera del almacenamiento permitido")
    return candidate


def resolve_upload_path(public_url: str) -> Path:
    """Resuelve una referencia interna sin permitir salir de UPLOADS_DIR."""
    uploads_root = get_upload_dir().resolve()
    public_prefix = urlparse(settings.PUBLIC_UPLOADS_BASE_URL).path.rstrip("/")
    parsed_path = unquote(urlparse(public_url).path)
    expected_prefix = f"{public_prefix}/" if public_prefix else "/"
    if not parsed_path.startswith(expected_prefix):
        raise ValueError("La entrega no apunta al almacenamiento interno permitido")
    candidate = (uploads_root / parsed_path[len(expected_prefix):]).resolve()
    if candidate == uploads_root or uploads_root not in candidate.parents:
        raise ValueError("Ruta de entrega fuera del almacenamiento permitido")
    return candidate


def validate_mime(content: bytes, filename: str) -> str:
    """
    Detecta el MIME real por magic bytes. No confía en la extensión.
    """
    magic_map = {
        b"\xff\xd8\xff": "image/jpeg",
        b"\x89PNG": "image/png",
        b"RIFF": "image/webp",
        b"%PDF": "application/pdf",
    }
    for magic, mime in magic_map.items():
        if content[: len(magic)].startswith(magic):
            if mime not in ALLOWED_MIME:
                raise ValueError(f"MIME type {mime} not allowed")
            return mime
    raise ValueError("Unknown or disallowed file type")
