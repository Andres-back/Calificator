"""Admission and verified reads of immutable private evidence assets.

This module never calls models. Pixel preparation belongs to the grading job,
not the API request, and a manifest is never inferred from a legacy upload.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
from io import BytesIO
import json
from uuid import UUID, uuid5
import warnings

import aiofiles
from fastapi import UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image, UnidentifiedImageError

from app.core.config import settings
from app.modules.calificaciones.evidence_manifest import (
    EvidenceAsset, EvidenceManifest, EvidenceManifestError, ManifestPage, ScanSubmission,
    canonical_pages_fingerprint, manifest_fingerprint,
)
from app.services.evidence_scan import ALGORITHM, MAX_SOURCE_BYTES
from app.services.storage_service import (
    PrivateEvidenceConflict, read_upload_limited, resolve_private_upload_path,
    save_private_evidence_asset,
)


@dataclass(frozen=True)
class SourceImage:
    content: bytes
    mime: str
    width: int
    height: int
    exif_orientation: int
    sha256: str


@dataclass(frozen=True)
class ScanAdmissionContext:
    request_id: UUID
    actor_id: UUID
    delivery_id: UUID
    evaluacion_id: UUID
    estudiante_id: UUID
    materia_id: UUID


@dataclass(frozen=True)
class CanonicalEvidencePage:
    number: int
    content: bytes
    mime: str
    width: int
    height: int
    sha256: str

    def __post_init__(self):
        if self.mime != "image/jpeg" or not 1 <= self.number <= 10 or not isinstance(self.content, bytes) or not self.content or len(self.content) > 2_500_000 or not all(type(n) is int and 2 <= n <= 2200 for n in (self.width, self.height)) or hashlib.sha256(self.content).hexdigest() != self.sha256:
            raise EvidenceManifestError("No pudimos comprobar una página preparada. Conservamos su original.")


@dataclass(frozen=True)
class CanonicalEvidencePages:
    version_id: UUID
    delivery_id: UUID
    fingerprint: str
    pages: tuple[CanonicalEvidencePage, ...]

    def __post_init__(self):
        if not self.pages or len(self.pages) > 10 or tuple(page.number for page in self.pages) != tuple(range(1, len(self.pages) + 1)):
            raise EvidenceManifestError("El orden de las páginas preparadas no es válido.")
        if not isinstance(self.version_id, UUID) or not isinstance(self.delivery_id, UUID) or self.fingerprint != canonical_pages_fingerprint(self.version_id, [page.sha256 for page in self.pages]):
            raise EvidenceManifestError("La versión de las páginas preparadas no coincide.")

    def images(self) -> list[tuple[bytes, str, int]]:
        return [(page.content, page.mime, page.number) for page in self.pages]


def scan_limits() -> tuple[int, int, int]:
    return (
        min(10, max(1, int(settings.MAX_EVIDENCE_FILES))),
        min(MAX_SOURCE_BYTES, max(1, int(settings.MAX_EVIDENCE_FILE_MB)) * 1024 * 1024),
        min(40 * 1024 * 1024, max(1, int(settings.MAX_EVIDENCE_TOTAL_MB)) * 1024 * 1024),
    )


def inspect_scan_source(content: bytes) -> SourceImage:
    if not content or len(content) > MAX_SOURCE_BYTES:
        raise EvidenceManifestError("Cada foto debe pesar máximo 10 MB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as image:
                mime = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}.get(image.format)
                if not mime or min(image.size) < 2:
                    raise ValueError("unsupported")
                # PNG.getexif() can call load() when eXIf follows IDAT. Walk
                # bounded compressed chunks instead; never decode pixels here.
                exif_bytes = image.info.get("exif")
                if image.format == "PNG" and not exif_bytes:
                    offset = 8
                    while offset + 12 <= len(content):
                        length = int.from_bytes(content[offset:offset + 4], "big")
                        end = offset + 12 + length
                        if end > len(content):
                            raise ValueError("invalid_png_chunk")
                        if content[offset + 4:offset + 8] == b"eXIf":
                            exif_bytes = b"Exif\0\0" + content[offset + 8:offset + 8 + length]
                            break
                        offset = end
                orientation = 1
                if isinstance(exif_bytes, bytes) and exif_bytes:
                    exif = Image.Exif()
                    exif.load(exif_bytes)
                    orientation = exif.get(274, 1)
                if type(orientation) is not int or orientation not in range(1, 9):
                    orientation = 1
                width, height = reversed(image.size) if orientation in {5, 6, 7, 8} else image.size
                return SourceImage(content, mime, width, height, orientation, hashlib.sha256(content).hexdigest())
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise EvidenceManifestError("No pudimos abrir una foto. Selecciona JPG, PNG o WebP; los PDF siguen por la opción habitual.") from exc


async def validate_scan_sources(uploads: list[UploadFile], submission: ScanSubmission) -> tuple[SourceImage, ...]:
    count, per_file, total_limit = scan_limits()
    if not uploads or len(uploads) > count or len(uploads) != len(submission.pages):
        raise EvidenceManifestError("Las hojas no coinciden con la preparación. Revisa el paquete antes de enviarlo.")
    sources: list[SourceImage] = []
    total = 0
    for upload, page in zip(uploads, submission.pages, strict=True):
        try:
            content = await read_upload_limited(upload, min(per_file, total_limit - total))
        except ValueError as exc:
            raise EvidenceManifestError("El paquete de fotos supera el tamaño permitido. Reduce su tamaño antes de enviarlo.") from exc
        source = await run_in_threadpool(inspect_scan_source, content)
        if page.recipe is not None and ((source.width, source.height) != (page.recipe.width, page.recipe.height) or source.width * source.height > 16_000_000):
            raise EvidenceManifestError("La preparación no corresponde a esta foto o supera su capacidad. Usa la foto original o repite el ajuste.")
        sources.append(source)
        total += len(content)
    return tuple(sources)


def admission_draft(context: ScanAdmissionContext, submission: ScanSubmission, sources: tuple[SourceImage, ...]) -> dict:
    if len(sources) != len(submission.pages):
        raise EvidenceManifestError("El paquete no contiene todas sus hojas.")
    data = {
        "schema_version": 1, "version_id": str(context.request_id), "request_id": str(context.request_id),
        "actor_id": str(context.actor_id), "delivery_id": str(context.delivery_id),
        "evaluacion_id": str(context.evaluacion_id), "estudiante_id": str(context.estudiante_id), "materia_id": str(context.materia_id),
        "algorithm": ALGORITHM, "created_at": datetime.now(timezone.utc).isoformat(), "state": "admitted",
        "pages": [{
            "page_id": str(page.page_id), "revision": page.revision,
            "decision": page.decision, "rotation": page.rotation,
            "recipe": page.recipe.model_dump(mode="json") if page.recipe else None,
            "source": {"sha256": source.sha256, "mime": source.mime, "size_bytes": len(source.content),
                       "width": source.width, "height": source.height, "exif_orientation": source.exif_orientation},
        } for page, source in zip(submission.pages, sources, strict=True)],
    }
    data["fingerprint"] = manifest_fingerprint(data)
    return data


async def persist_scan_sources(context: ScanAdmissionContext, submission: ScanSubmission, sources: tuple[SourceImage, ...]) -> EvidenceManifest:
    """Write a stable intent receipt before sources; no commit or cleanup guesses."""
    from app.modules.calificaciones.evidence_scan_reconciliation import ScanReceipt
    from app.services.storage_service import MIME_EXTENSIONS
    data = admission_draft(context, submission, sources)
    for page, source in zip(data["pages"], sources, strict=True):
        identity = uuid5(context.request_id, f"source:{context.actor_id}:{page['page_id']}:{source.sha256}")
        page["source"]["key"] = f".private/evidence-scan/sources/{identity.hex}{MIME_EXTENSIONS[source.mime]}"
    manifest = EvidenceManifest.model_validate(data)
    receipt = ScanReceipt.from_manifest(manifest)
    try:
        await save_private_evidence_asset(
            json.dumps(receipt.model_dump(mode="json"), sort_keys=True, separators=(",", ":")).encode(), "application/json", category="receipts",
            asset_id=uuid5(context.request_id, f"receipt:{context.actor_id}"),
        )
        for page, source in zip(data["pages"], sources, strict=True):
            key = await save_private_evidence_asset(source.content, source.mime, category="sources",
                asset_id=uuid5(context.request_id, f"source:{context.actor_id}:{page['page_id']}:{source.sha256}"))
            if page["source"]["key"] != key:
                raise EvidenceManifestError("La fuente no corresponde a esta solicitud.")
        return manifest
    except PrivateEvidenceConflict as exc:
        raise EvidenceManifestError("Esta solicitud ya contiene otros datos. Actualiza la vista antes de volver a enviarla.") from exc


async def read_verified_asset(asset: EvidenceAsset) -> bytes:
    try:
        path = resolve_private_upload_path(asset.key)
        async with aiofiles.open(path, "rb") as source:
            content = await source.read(asset.size_bytes + 1)
        if len(content) != asset.size_bytes or hashlib.sha256(content).hexdigest() != asset.sha256:
            raise ValueError("changed")
        return content
    except (OSError, ValueError) as exc:
        raise EvidenceManifestError("La evidencia guardada no coincide con su registro. No se enviará otra imagen en su lugar.") from exc


async def resolve_canonical_pages(delivery, manifest: EvidenceManifest, *, verify_sources: bool = True) -> CanonicalEvidencePages:
    manifest.require_delivery(delivery)
    fingerprint = manifest.canonical_fingerprint
    pages = []
    for index, page in enumerate(manifest.pages, 1):
        if verify_sources:
            await read_verified_asset(page.source)
        if page.prepared is None:
            raise EvidenceManifestError("La evidencia todavía se está preparando.")
        content = await read_verified_asset(page.prepared)
        pages.append(CanonicalEvidencePage(index, content, page.prepared.mime, page.prepared.width, page.prepared.height, page.prepared.sha256))
    return CanonicalEvidencePages(manifest.version_id, manifest.delivery_id, fingerprint, tuple(pages))


def prepared_manifest_page(page: ManifestPage, prepared: EvidenceAsset, matrix) -> ManifestPage:
    return ManifestPage.model_validate({**page.model_dump(mode="json"), "prepared": prepared.model_dump(mode="json"), "source_to_prepared": matrix})
