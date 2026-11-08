"""Version-bound editing of the teacher's saved evidence without trusting paths."""
from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from typing import Annotated
from uuid import UUID, uuid5

from fastapi import HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from app.modules.calificaciones.evidence_manifest import (
    Digest, EvidenceManifestError, ManifestPage, ScanSubmission, ScanSubmissionPage, read_manifest,
)
from app.modules.calificaciones.evidence_preparation import (
    SourceImage, inspect_scan_source, read_verified_asset, scan_limits,
)
from app.services.evidence_scan import ScanRecipe
from app.services.storage_service import read_upload_limited, resolve_upload_path


class EditPage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    referencia: UUID | None = None
    archivo_indice: Annotated[int, Field(strict=True, ge=0, lt=10)] | None = None
    rotacion: Annotated[int, Field(strict=True)] | None = None
    receta: ScanRecipe | None = None

    @model_validator(mode="after")
    def valid_source(self):
        if (self.referencia is None) == (self.archivo_indice is None):
            raise ValueError("Indica una sola fuente por hoja")
        if self.rotacion not in {None, 0, 90, 180, 270}:
            raise ValueError("Giro no admitido")
        if self.receta is not None and self.rotacion is not None and self.rotacion != self.receta.rotation:
            raise ValueError("El giro no coincide con la preparación")
        return self


class EditSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")
    fingerprint: Digest
    paginas: Annotated[list[EditPage], Field(min_length=1, max_length=10)]

    @model_validator(mode="after")
    def unique_sources(self):
        for attr in ("referencia", "archivo_indice"):
            items = [getattr(page, attr) for page in self.paginas if getattr(page, attr) is not None]
            if len(set(items)) != len(items):
                raise ValueError("No repitas una hoja")
        return self


@dataclass(frozen=True)
class StoredPage:
    ref: UUID
    manifest_page: ManifestPage | None
    legacy_source: SourceImage | None = None

    async def source(self) -> SourceImage:
        if self.manifest_page is None:
            assert self.legacy_source is not None
            return self.legacy_source
        asset = self.manifest_page.source
        content = await read_verified_asset(asset)
        if asset.width is None or asset.height is None:
            raise EvidenceManifestError("No pudimos comprobar la fuente original de esta hoja.")
        return SourceImage(content, asset.mime, asset.width, asset.height, asset.exif_orientation, asset.sha256)


@dataclass(frozen=True)
class EditingEvidence:
    fingerprint: str
    pages: tuple[StoredPage, ...]


def _render_legacy_pdf(data: bytes, page_limit: int) -> tuple[SourceImage, ...]:
    """Each page of a historical PDF becomes an editable sheet (Spec 159).

    The stored PDF is only read: nothing is written until the teacher saves.
    """
    import fitz
    from PIL import Image

    try:
        document = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:  # PyMuPDF raises several private error types.
        raise EvidenceManifestError("El PDF de esta entrega está dañado.") from exc
    with document:
        if not 1 <= len(document) <= page_limit:
            raise EvidenceManifestError("El PDF de esta entrega no tiene hojas editables.")
        sheets = []
        for page in document:
            zoom = min(150 / 72, 2200 / max(page.rect.width, page.rect.height))
            pixmap = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            stream = BytesIO()
            Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples).save(stream, format="JPEG", quality=92)
            sheets.append(inspect_scan_source(stream.getvalue()))
        return tuple(sheets)


def _bounded_legacy_sources(path: Path, limit: int, page_limit: int) -> tuple[str, tuple[SourceImage, ...]]:
    with path.open("rb") as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise EvidenceManifestError("Esta entrega no conserva fotos originales editables.")
    digest = sha256(data).hexdigest()
    if data.startswith(b"%PDF-"):
        return digest, _render_legacy_pdf(data, page_limit)
    return digest, (inspect_scan_source(data),)


async def read_editing_evidence(delivery) -> EditingEvidence:
    if not delivery or not delivery.archivo_url:
        raise HTTPException(404, "Esta entrega todavía no tiene evidencia.")
    try:
        manifest = read_manifest(delivery)
        if manifest is not None:
            fingerprint = sha256(f"evidence-edit:{delivery.id}:{manifest.version_id}:{manifest.fingerprint}".encode()).hexdigest()
            return EditingEvidence(fingerprint, tuple(StoredPage(page.page_id, page) for page in manifest.pages))
        # A historical single image is its own source. A historical PDF has no
        # preserved photos: each page is rendered as an editable sheet and is
        # never presented as an original (original_disponible stays false).
        page_limit, file_limit, total_limit = scan_limits()
        path = resolve_upload_path(delivery.archivo_url)
        is_pdf = path.suffix.lower() == ".pdf"
        digest, sources = await run_in_threadpool(
            _bounded_legacy_sources, path, total_limit if is_pdf else min(file_limit, total_limit), page_limit,
        )
        if len(sources) == 1 and not is_pdf:
            fingerprint = sha256(f"evidence-edit:{delivery.id}:legacy:{sources[0].sha256}".encode()).hexdigest()
            return EditingEvidence(fingerprint, (StoredPage(uuid5(delivery.id, fingerprint), None, sources[0]),))
        fingerprint = sha256(f"evidence-edit:{delivery.id}:legacy-pdf:{digest}".encode()).hexdigest()
        return EditingEvidence(fingerprint, tuple(
            StoredPage(uuid5(delivery.id, f"{fingerprint}:{number}"), None, source)
            for number, source in enumerate(sources, 1)
        ))
    except (OSError, ValueError, EvidenceManifestError) as exc:
        raise HTTPException(409, "No podemos editar las hojas de esta evidencia. Puedes consultarla o reemplazar la entrega completa.") from exc


async def resolve_edited_pages(raw: str, uploads: list[UploadFile], base: EditingEvidence, request_id: UUID):
    try:
        if len(raw.encode("utf-8")) > 16_384:
            raise ValueError("too large")
        editing = EditSubmission.model_validate_json(raw)
    except ValueError as exc:
        raise HTTPException(422, "El paquete de hojas no es válido.") from exc
    if editing.fingerprint != base.fingerprint:
        raise HTTPException(409, "La evidencia cambió. Abre de nuevo el editor de hojas.")
    page_limit, file_limit, total_limit = scan_limits()
    by_ref = {page.ref: page for page in base.pages}
    if len(editing.paginas) > page_limit or {p.archivo_indice for p in editing.paginas if p.archivo_indice is not None} != set(range(len(uploads))):
        raise HTTPException(422, "Las fotos nuevas no coinciden con el paquete o superan su límite.")
    if any(p.referencia is not None and p.referencia not in by_ref for p in editing.paginas):
        raise HTTPException(409, "Una hoja ya no pertenece a esta evidencia.")
    total = 0
    pages = []
    sources = []
    reused: dict[UUID, ManifestPage] = {}
    try:
        for page in editing.paginas:
            saved = by_ref.get(page.referencia) if page.referencia is not None else None
            old = saved.manifest_page if saved else None
            if saved:
                source = await saved.source()
                page_id = saved.ref
            else:
                assert page.archivo_indice is not None
                source = await run_in_threadpool(inspect_scan_source, await read_upload_limited(uploads[page.archivo_indice], min(file_limit, total_limit - total)))
                page_id = uuid5(request_id, f"new-page:{page.archivo_indice}")
            total += len(source.content)
            if len(source.content) > file_limit or total > total_limit:
                raise EvidenceManifestError("El paquete supera su tamaño permitido.")
            if page.receta is not None:
                recipe = page.receta
                rotation = recipe.rotation
            elif page.rotacion is not None or "receta" in page.model_fields_set:
                recipe = None
                rotation = page.rotacion if page.rotacion is not None else (old.rotation if old else 0)
            else:
                recipe = old.recipe if old else None
                rotation = old.rotation if old else 0
            if recipe is not None and ((recipe.width, recipe.height) != (source.width, source.height) or source.width * source.height > 16_000_000):
                raise EvidenceManifestError("La preparación no corresponde a la hoja original.")
            changed = old is not None and (old.recipe != recipe or old.rotation != rotation)
            pages.append(ScanSubmissionPage(
                page_id=page_id, revision=old.revision + int(changed) if old else 0,
                decision="prepared" if recipe is not None else "original",
                rotation=rotation, recipe=recipe, confirmed=True,
            ))
            if old:
                if not changed and old.prepared is not None:
                    await read_verified_asset(old.prepared)
                reused[page_id] = old
            sources.append(source)
        return ScanSubmission(schema_version=1, pages=tuple(pages)), tuple(sources), reused
    except (EvidenceManifestError, ValidationError, ValueError) as exc:
        raise HTTPException(422, "No pudimos comprobar todas las hojas o el tamaño del paquete.") from exc
