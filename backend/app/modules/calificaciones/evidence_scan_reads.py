"""Authenticated manifest readers. Call only after the academic ownership check.

No flag is consulted: disabling new admissions must not hide existing evidence.
Each response owns one verified byte snapshot, not a path reopened after hashing.
"""
from __future__ import annotations

import hashlib
from typing import Literal

from fastapi import HTTPException, Response

from app.modules.calificaciones.evidence_manifest import EvidenceManifest, EvidenceManifestError
from app.modules.calificaciones.evidence_preparation import read_verified_asset
from app.services.answer_evidence_regions import evidence_version
from app.services.evidence_scan_process import EvidencePreparationError, run_page_preparation

EvidenceVariant = Literal["original", "preparada"]


def require_original_access(actor, *, is_owner_student: bool) -> None:
    # A teacher who is also the recipient must still use the student boundary.
    if is_owner_student or getattr(actor, "rol", None) not in {"profesor", "admin"}:
        raise HTTPException(403, "La foto original está disponible solo para el docente autorizado.")


async def manifest_response(manifest: EvidenceManifest, *, variant: EvidenceVariant,
                            page_number: int | None = None, requested_version: str | None = None) -> Response:
    try:
        if page_number is not None and not 1 <= page_number <= len(manifest.pages):
            raise HTTPException(404, "Página de evidencia no encontrada")
        if variant == "original":
            # Distinct namespace: canonical regions must never overlay a source.
            fingerprint = hashlib.sha256(("original:" + manifest.fingerprint).encode()).hexdigest()
        else:
            fingerprint = manifest.canonical_fingerprint
        token = evidence_version(manifest.delivery_id, fingerprint)
        if requested_version is not None and requested_version != token:
            raise HTTPException(409, "La evidencia cambió. Actualiza la revisión para consultar su hoja vigente.")
        if variant == "original":
            page = manifest.pages[(page_number or 1) - 1]
            content = await read_verified_asset(page.source)
            mime = page.source.mime
            if page_number is not None:
                # Display copy strips metadata; original download remains exact.
                prepared = await run_page_preparation(page.source, recipe=None, rotation=page.rotation)
                content, mime = prepared.content, prepared.mime
        elif page_number is not None:
            page = manifest.pages[page_number - 1]
            if page.prepared is None:
                raise EvidenceManifestError("La evidencia todavía se está preparando.")
            content, mime = await read_verified_asset(page.prepared), page.prepared.mime
        else:
            asset = manifest.consultation
            # Single-page prepared files can be read before consultation recovery.
            if asset is None and len(manifest.pages) == 1:
                asset = manifest.pages[0].prepared
            if asset is None:
                raise EvidenceManifestError("La vista completa todavía se está preparando. Puedes revisar sus hojas.")
            content, mime = await read_verified_asset(asset), asset.mime
        extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf"}[mime]
        headers = {
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": f'inline; filename="evidencia-{variant}{"-" + str(page_number) if page_number else ""}.{extension}"',
            "X-Evidence-Version": token,
            "X-Evidence-Variant": variant,
            "X-Evidence-Pages": str(len(manifest.pages)),
        }
        if page_number is not None:
            headers["X-Evidence-Page"] = str(page_number)
        return Response(content, media_type=mime, headers=headers)
    except (EvidenceManifestError, EvidencePreparationError) as exc:
        raise HTTPException(409, str(exc)) from exc
