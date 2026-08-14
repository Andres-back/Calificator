from __future__ import annotations

import asyncio
from pathlib import Path
from uuid import UUID

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

EXPORT_FORMATS = ("pptx", "pdf")


def _exports_dir() -> Path:
    return Path(settings.UPLOADS_DIR).resolve() / "presentaciones"


def _safe_export_path(presentation_id: UUID, fmt: str) -> Path:
    if fmt not in EXPORT_FORMATS:
        raise ValueError("Unsupported presentation export format")

    base = _exports_dir()
    candidate = (base / f"{presentation_id}.{fmt}").resolve()
    try:
        candidate.relative_to(base)
    except ValueError as exc:
        raise ValueError("Unsafe presentation export path") from exc
    return candidate


async def cleanup_presentation_exports(presentation_id: UUID) -> None:
    """Delete only local PPTX/PDF exports owned by this presentation.

    Missing files and unlink failures are non-fatal so the database deletion is
    not blocked by filesystem drift.
    """
    for fmt in EXPORT_FORMATS:
        try:
            path = _safe_export_path(presentation_id, fmt)
        except ValueError:
            logger.warning(
                "Skipping unsafe export cleanup for presentation %s (%s)",
                presentation_id,
                fmt,
            )
            continue

        try:
            await asyncio.to_thread(path.unlink, missing_ok=True)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not delete presentation export %s: %s", path, exc)
