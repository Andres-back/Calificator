"""Spec 157: aplica la preparación revisada por el docente a las fotos que se digitalizan.

Reutiliza la misma receta (`ScanRecipe`) y el mismo proceso aislado que la
calificación. Cada foto se escribe como fuente temporal privada, se prepara y
se borra; si algo falla se usa la foto original y se devuelve un aviso.
"""
from __future__ import annotations

import hashlib
from io import BytesIO
import json
import logging
import time
import uuid

from PIL import Image, ImageOps
from pydantic import ValidationError

from app.services.evidence_scan import MAX_SOURCE_BYTES, ScanRecipe
from app.services.evidence_scan_process import run_page_preparation
from app.services.storage_service import MIME_EXTENSIONS, resolve_private_upload_path

logger = logging.getLogger(__name__)

MAX_TOTAL_SECONDS = 30.0
_clock = time.monotonic
_INVALID = "Revisa la preparación de las hojas antes de enviarlas."


def parse_scan_recipes(raw: object, count: int) -> list[ScanRecipe | None] | None:
    """Una receta (o `null`) por foto; ausente significa el flujo de hoy."""
    if not isinstance(raw, str) or not raw:
        return None
    try:
        values = json.loads(raw)
        if not isinstance(values, list) or len(values) != count:
            raise ValueError(_INVALID)
        return [None if value is None else ScanRecipe.model_validate(value) for value in values]
    except (ValueError, ValidationError) as exc:
        raise ValueError(_INVALID) from exc


def page_warning(index: int) -> str:
    return f"No pudimos preparar la hoja {index}. Usamos su foto original."


async def _prepare_one(content: bytes, mime: str, recipe: ScanRecipe) -> bytes:
    from app.modules.calificaciones.evidence_manifest import EvidenceAsset

    with Image.open(BytesIO(content)) as image:
        width, height = ImageOps.exif_transpose(image).size
    key = f".private/evidence-scan/sources/{uuid.uuid4().hex}{MIME_EXTENSIONS[mime]}"
    path = resolve_private_upload_path(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        path.write_bytes(content)
        source = EvidenceAsset(key=key, sha256=hashlib.sha256(content).hexdigest(), mime=mime,
                               size_bytes=len(content), width=width, height=height)
        result = await run_page_preparation(source, recipe=recipe, rotation=recipe.rotation)
        return result.content
    finally:
        path.unlink(missing_ok=True)


async def prepare_scanned_photos(
    photos: list[tuple[bytes, str, str]], recipes: list[ScanRecipe | None],
) -> tuple[list[bytes | None], tuple[str, ...]]:
    """Devuelve la copia preparada por hoja (o `None`) y los avisos de las que fallaron."""
    started = _clock()
    prepared: list[bytes | None] = []
    warnings: list[str] = []
    for index, ((content, _filename, mime), recipe) in enumerate(zip(photos, recipes, strict=True), start=1):
        if recipe is None:
            prepared.append(None)
            continue
        if mime not in MIME_EXTENSIONS or mime == "application/pdf" or len(content) > MAX_SOURCE_BYTES \
                or _clock() - started > MAX_TOTAL_SECONDS:
            prepared.append(None)
            warnings.append(page_warning(index))
            continue
        try:
            prepared.append(await _prepare_one(content, mime, recipe))
        except Exception:  # noqa: BLE001 - nunca bloquea: se usa la foto original
            logger.warning("digitalization_scan_page_failed", extra={"page": index})
            prepared.append(None)
            warnings.append(page_warning(index))
    return prepared, tuple(warnings)
