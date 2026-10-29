"""Async supervisor for bounded per-page CPU work in the existing grading job."""
from __future__ import annotations

import asyncio
from io import BytesIO
import json
from pathlib import Path
import sys
from typing import Annotated, Literal

from PIL import Image
from pydantic import BaseModel, ConfigDict, Field

from app.modules.calificaciones.evidence_manifest import EvidenceAsset, Matrix
from app.services.evidence_scan import ALGORITHM, MAX_PREPARED_BYTES, PreparedEvidenceScan, ScanRecipe
from app.services.storage_service import get_upload_dir

PAGE_TIMEOUT_SECONDS = 8.0
MAX_OUTPUT_BYTES = MAX_PREPARED_BYTES + 8192
PACKAGE_ROOT = Path(__file__).resolve().parents[2]


class EvidencePreparationError(ValueError):
    pass


class _Result(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ok: Literal[True]
    mime: Literal["image/jpeg"]
    width: Annotated[int, Field(strict=True, ge=2, le=2200)]
    height: Annotated[int, Field(strict=True, ge=2, le=2200)]
    size_bytes: Annotated[int, Field(strict=True, gt=0, le=MAX_PREPARED_BYTES)]
    source_sha256: Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
    source_to_prepared: Matrix
    algorithm: Literal[ALGORITHM]


def preparation_environment() -> dict[str, str]:
    return {"PYTHONPATH": str(PACKAGE_ROOT), "PYTHONDONTWRITEBYTECODE": "1", "PYTHONUNBUFFERED": "1",
            "PYTHONNOUSERSITE": "1", "LC_ALL": "C.UTF-8", "OPENBLAS_NUM_THREADS": "1",
            "OMP_NUM_THREADS": "1", "MKL_NUM_THREADS": "1"}


async def run_page_preparation(source: EvidenceAsset, *, recipe: ScanRecipe | None, rotation: int) -> PreparedEvidenceScan:
    if "/sources/" not in source.key or source.mime == "application/pdf":
        raise EvidencePreparationError("La fuente de esta hoja no es válida. Conservamos su archivo.")
    payload = {"uploads_root": str(get_upload_dir().resolve()), "source_key": source.key,
               "source_sha256": source.sha256, "recipe": recipe.model_dump(mode="json") if recipe else None,
               "rotation": rotation}
    try:
        process = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "app.services.evidence_scan_worker", cwd=str(PACKAGE_ROOT), env=preparation_environment(),
            stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
    except OSError as exc:
        raise EvidencePreparationError("No pudimos iniciar la preparación. Conservamos el original para volver a intentarlo.") from exc

    async def exchange() -> bytes:
        process.stdin.write(json.dumps(payload, separators=(",", ":"), allow_nan=False).encode())
        await process.stdin.drain()
        process.stdin.close()
        output = bytearray()
        while chunk := await process.stdout.read(min(65536, MAX_OUTPUT_BYTES + 1 - len(output))):
            output.extend(chunk)
            if len(output) > MAX_OUTPUT_BYTES:
                raise EvidencePreparationError("La copia preparada supera el tamaño permitido. Conservamos su original.")
        await process.wait()
        return bytes(output)

    try:
        raw = await asyncio.wait_for(exchange(), PAGE_TIMEOUT_SECONDS)
        line, separator, content = raw.partition(b"\n")
        if not separator or len(line) > 8192:
            raise ValueError("invalid_output")
        header = json.loads(line)
        if process.returncode != 0 or header.get("ok") is not True:
            raise ValueError("preparation_failed")
        result = _Result.model_validate(header)
        if result.source_sha256 != source.sha256 or len(content) != result.size_bytes:
            raise ValueError("source_changed")
        with Image.open(BytesIO(content)) as image:
            if image.format != "JPEG" or image.size != (result.width, result.height):
                raise ValueError("invalid_output")
        return PreparedEvidenceScan(content, result.mime, result.width, result.height,
                                    result.source_sha256, [list(row) for row in result.source_to_prepared], result.algorithm)
    except TimeoutError as exc:
        raise EvidencePreparationError("La preparación tardó más de lo permitido. Conservamos el original para que puedas continuar sin escaneo.") from exc
    except (ValueError, OSError) as exc:
        if isinstance(exc, EvidencePreparationError):
            raise
        raise EvidencePreparationError("No pudimos preparar esta hoja con seguridad. Conservamos el original; puedes revisar la foto o continuar sin escaneo.") from exc
    finally:
        if process.returncode is None:
            try:
                process.kill()
            except ProcessLookupError:
                pass
            await process.wait()
