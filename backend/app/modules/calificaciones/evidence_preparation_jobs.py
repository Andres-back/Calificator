"""Per-page durable preparation in the existing grading job and claim lease."""
from __future__ import annotations

import hashlib
from uuid import UUID, uuid5

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select

from app.core.config import settings
from app.modules.calificaciones.evidence_manifest import EvidenceAsset, EvidenceManifest, EvidenceManifestError, read_manifest
from app.modules.calificaciones.evidence_preparation import (
    CanonicalEvidencePages, prepared_manifest_page, read_verified_asset, resolve_canonical_pages,
)
from app.modules.calificaciones.models import Entrega
from app.modules.jobs import service as jobs_service
from app.services.evidence_scan_process import run_page_preparation
from app.services.storage_service import save_private_evidence_asset


def manifest_job_reference(delivery) -> dict:
    manifest = read_manifest(delivery)
    if manifest is None:
        return {}
    return {"_evidence_manifest": {"schema_version": 1, "version_id": str(manifest.version_id), "fingerprint": manifest.fingerprint}}


async def _locked_manifest(db, delivery_id: UUID, job_id: UUID, claim_token: str, expected: dict) -> tuple[Entrega, EvidenceManifest]:
    await jobs_service.lock_owned_job(db, job_id, claim_token)
    delivery = await db.scalar(select(Entrega).where(Entrega.id == delivery_id).with_for_update().execution_options(populate_existing=True))
    if delivery is None:
        raise jobs_service.JobOwnershipLost("Esta entrega ya no está disponible para el trabajo.")
    manifest = read_manifest(delivery)
    if manifest is None or manifest_job_reference(delivery).get("_evidence_manifest") != expected:
        raise jobs_service.JobOwnershipLost("La evidencia cambió; esta ejecución no puede reemplazar su preparación.")
    return delivery, manifest


async def guard_manifest_job(db, delivery_id: UUID, job_id: UUID, claim_token: str) -> EvidenceManifest:
    job_input = await jobs_service.get_job_input(db, job_id)
    expected = job_input.get("_evidence_manifest")
    if not isinstance(expected, dict) or job_input.get("entrega_ids") != [str(delivery_id)]:
        raise jobs_service.JobOwnershipLost("El trabajo no tiene la versión de evidencia solicitada.")
    _, manifest = await _locked_manifest(db, delivery_id, job_id, claim_token, expected)
    return manifest


async def _progress(db, job_id: UUID, claim_token: str, *, page: int, total: int, complete: bool = False):
    saved = await jobs_service.update_job_progress(db, job_id, progreso=10 if complete else round((page - 1) * 10 / total), resultado_json={
        "claim_token": claim_token, "stage": "model_inference" if complete else "evidence_preparation",
        "stage_message": "Evidencia preparada. Iniciando la lectura." if complete else f"Preparando evidencia, hoja {page} de {total}",
        "evidence_page": page, "evidence_pages": total,
    })
    if not saved:
        raise jobs_service.JobOwnershipLost("La preparación perdió su trabajo antes de guardar el progreso.")
    await db.commit()


def _consultation_pdf(images: CanonicalEvidencePages) -> bytes:
    import fitz
    with fitz.open() as document:
        for image in images.pages:
            width, height = image.width * 72 / 150, image.height * 72 / 150
            page = document.new_page(width=width, height=height)
            page.insert_image(page.rect, stream=image.content)
        # No random document ID; retrying a lost acknowledgement must be stable.
        return document.tobytes(no_new_id=True, garbage=0, deflate=False)


async def prepare_delivery_evidence(db, *, delivery: Entrega, job_id: UUID, claim_token: str) -> EvidenceManifest:
    initial = read_manifest(delivery)
    if initial is None:
        raise EvidenceManifestError("Esta entrega mantiene el procesamiento de evidencia anterior.")
    job_input = await jobs_service.get_job_input(db, job_id)
    expected = job_input.get("_evidence_manifest")
    if expected != manifest_job_reference(delivery).get("_evidence_manifest") or job_input.get("entrega_ids") != [str(delivery.id)]:
        raise jobs_service.JobOwnershipLost("La evidencia no corresponde al trabajo que la solicitó.")
    current, manifest = await _locked_manifest(db, delivery.id, job_id, claim_token, expected)
    total = len(manifest.pages)
    for index in range(total):
        current, manifest = await _locked_manifest(db, delivery.id, job_id, claim_token, expected)
        page = manifest.pages[index]
        # Verify originals even when an earlier checkpoint already has a derivative.
        await read_verified_asset(page.source)
        if page.prepared is not None:
            await read_verified_asset(page.prepared)
            await db.commit()
            continue
        current.evidencia_manifiesto = EvidenceManifest.model_validate({**manifest.model_dump(mode="json"), "state": "preparing"}).model_dump(mode="json")
        await _progress(db, job_id, claim_token, page=index + 1, total=total)
        # No row locks during bounded pixel work. It cannot call the AI provider.
        result = await run_page_preparation(page.source, recipe=page.recipe, rotation=page.rotation)
        if result.source_sha256 != page.source.sha256 or result.algorithm != manifest.algorithm:
            raise EvidenceManifestError("La copia preparada no corresponde a su fuente. Conservamos el original.")
        identity = uuid5(manifest.version_id, f"prepared:{manifest.actor_id}:{page.page_id}:{manifest.fingerprint}:{manifest.algorithm}")
        key = await save_private_evidence_asset(result.content, result.mime, category="prepared", asset_id=identity)
        asset = EvidenceAsset(key=key, sha256=hashlib.sha256(result.content).hexdigest(), mime=result.mime,
                              size_bytes=len(result.content), width=result.width, height=result.height)
        current, manifest = await _locked_manifest(db, delivery.id, job_id, claim_token, expected)
        pages = list(manifest.pages)
        if pages[index].prepared is None:
            pages[index] = prepared_manifest_page(pages[index], asset, result.source_to_prepared)
            current.evidencia_manifiesto = EvidenceManifest.model_validate({
                **manifest.model_dump(mode="json"), "state": "preparing", "pages": [item.model_dump(mode="json") for item in pages],
            }).model_dump(mode="json")
        elif pages[index].prepared.sha256 != asset.sha256:
            raise EvidenceManifestError("Esta hoja ya tiene otra preparación. Conservamos ambas fuentes para revisarla.")
        await _progress(db, job_id, claim_token, page=index + 1, total=total)

    current, manifest = await _locked_manifest(db, delivery.id, job_id, claim_token, expected)
    candidate = EvidenceManifest.model_validate({**manifest.model_dump(mode="json"), "state": "prepared"})
    images = await resolve_canonical_pages(current, candidate, verify_sources=False)
    if candidate.consultation is None:
        await db.commit()
        if total == 1:
            content, mime = images.pages[0].content, "image/jpeg"
            dimensions = {"width": images.pages[0].width, "height": images.pages[0].height}
        else:
            content, mime = await run_in_threadpool(_consultation_pdf, images), "application/pdf"
            dimensions = {}
        key = await save_private_evidence_asset(content, mime, category="consultations", asset_id=uuid5(candidate.version_id, f"consultation:{candidate.fingerprint}"))
        consultation = EvidenceAsset(key=key, sha256=hashlib.sha256(content).hexdigest(), mime=mime, size_bytes=len(content), **dimensions)
        current, manifest = await _locked_manifest(db, delivery.id, job_id, claim_token, expected)
        candidate = EvidenceManifest.model_validate({**manifest.model_dump(mode="json"), "state": "prepared", "consultation": consultation.model_dump(mode="json")})
    else:
        await read_verified_asset(candidate.consultation)
    current.evidencia_manifiesto = candidate.model_dump(mode="json")
    current.archivo_url = f"{settings.PUBLIC_UPLOADS_BASE_URL.rstrip('/')}/{candidate.consultation.key}"
    if current.tipo != "mixta":
        current.tipo = "pdf" if total > 1 else "foto"
    await _progress(db, job_id, claim_token, page=total, total=total, complete=True)
    # Keep the caller's identity-map object in sync after its checkpoint commits.
    delivery.evidencia_manifiesto = current.evidencia_manifiesto
    delivery.archivo_url = current.archivo_url
    delivery.tipo = current.tipo
    return candidate
