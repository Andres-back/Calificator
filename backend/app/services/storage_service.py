"""Servicio de almacenamiento local para uploads."""
from __future__ import annotations

import uuid
from pathlib import Path

import aiofiles

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

ALLOWED_MIME = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"
}
MAX_SIZE_BYTES = int(getattr(settings, "MAX_IMAGE_SIZE_MB", 10)) * 1024 * 1024


def get_upload_dir() -> Path:
    path = Path(settings.UPLOADS_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_upload(
    content: bytes,
    original_filename: str,
    subfolder: str = "general",
) -> str:
    """
    Guarda un archivo en disco con nombre UUID y devuelve la URL pública relativa.
    """
    if len(content) > MAX_SIZE_BYTES:
        raise ValueError(f"File exceeds maximum size of {settings.MAX_IMAGE_SIZE_MB} MB")

    ext = Path(original_filename).suffix.lower() or ".bin"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest_dir = get_upload_dir() / subfolder
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename

    async with aiofiles.open(dest_path, "wb") as f:
        await f.write(content)

    public_url = f"{settings.PUBLIC_UPLOADS_BASE_URL}/{subfolder}/{filename}"
    logger.debug("Saved upload: %s", public_url)
    return public_url


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
