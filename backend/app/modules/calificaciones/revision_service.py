"""Reapertura docente transaccional con evidencia histórica e idempotencia."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from app.modules.calificaciones import evidence_service, grading_queue_service
from app.modules.calificaciones.models import Calificacion, CalificacionRevision
from app.modules.calificaciones.evidence_manifest import EvidenceManifestError, read_manifest
from app.modules.calificaciones.evidence_preparation import (
    ScanAdmissionContext, admission_draft, persist_scan_sources, read_verified_asset,
)
from app.modules.evaluaciones.grading_visual_context import grading_job_reference
from app.modules.feedback_sharing.invalidations import suspend_grade_publications
from app.services.storage_service import resolve_upload_path, save_upload
from app.core.config import settings


def normalized_version(value: datetime) -> datetime:
    return (
        value.replace(tzinfo=timezone.utc)
        if value.tzinfo is None
        else value.astimezone(timezone.utc)
    )


def ensure_reprocessing_allowed(
    grade, expected_version: datetime, confirmed: bool
) -> None:
    if normalized_version(grade.updated_at) != normalized_version(expected_version):
        raise HTTPException(
            409,
            "La calificación cambió. Actualiza la vista antes de volver a enviarla.",
        )
    if grade.estado in {"procesando", "anulada"}:
        raise HTTPException(
            409,
            "Esta calificación está procesándose o fue anulada. No se enviará otra vez.",
        )
    if (
        grade.revisado_por_docente
        or grade.nota_confirmada is not None
        or grade.estado in {"confirmada", "ajustada", "publicada"}
    ) and not confirmed:
        raise HTTPException(
            409,
            "Confirma que deseas reabrir la nota. Conservaremos el resultado anterior en el historial.",
        )


def revision_snapshot(grade) -> dict:
    delivery = grade.entrega
    fields = (
        "nota_sugerida",
        "nota_confirmada",
        "confianza",
        "feedback",
        "estado",
        "revisado_por_docente",
        "updated_at",
        "resultado_json",
    )
    data = {name: getattr(grade, name, None) for name in fields}
    data["entrega"] = {
        name: getattr(delivery, name, None)
        for name in (
            "archivo_url",
            "tipo",
            "respuesta_texto",
            "visual_text_json",
            "evidencia_manifiesto",
            "contenido_version_id",
            "estado",
        )
    }
    # Round-trip deep copy; no references survive the queue's JSON replacement.
    return json.loads(json.dumps(jsonable_encoder(data, custom_encoder={Decimal: str})))


def operation_fingerprint(*, version, reason, confirmed, content) -> str:
    value = {
        "version": normalized_version(version).isoformat(),
        "reason": reason or "",
        "confirmed": confirmed,
        "content": hashlib.sha256(content).hexdigest() if content is not None else None,
    }
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


async def delete_unarchived_evidence(db, url: str | None) -> None:
    if url and not await db.scalar(
        select(CalificacionRevision.id)
        .where(CalificacionRevision.archivo_url == url)
        .limit(1)
    ):
        evidence_service._delete_replaced_evidence(url)


async def archive_scan_before_legacy_replacement(db, delivery, actor_id) -> None:
    """Student retry remains legacy, but cannot leave a stale active manifest.

    Called inside the existing authorized replacement transaction, before writing
    its new evidence. No commit, deletion, publication or model invocation here.
    """
    manifest = read_manifest(delivery)
    if manifest is None:
        return
    grade = await db.scalar(select(Calificacion).options(selectinload(Calificacion.entrega)).where(Calificacion.entrega_id == delivery.id).with_for_update(of=Calificacion))
    if grade is None:
        raise HTTPException(409, "La entrega anterior necesita revisión antes de cambiar su evidencia.")
    if await db.scalar(text("SELECT id FROM ai_jobs WHERE entrega_id=:delivery AND estado IN ('queued','running','retrying') LIMIT 1"), {"delivery": delivery.id}):
        raise HTTPException(409, "Esta evidencia está en cola o calificándose. Espera a que termine antes de reemplazarla.")
    from uuid import uuid4
    db.add(CalificacionRevision(
        id=uuid4(), calificacion_id=grade.id, actor_id=actor_id, accion="cambiar_evidencia",
        motivo=None, request_fingerprint=hashlib.sha256(("legacy-replacement:" + str(manifest.version_id)).encode()).hexdigest(),
        archivo_url=delivery.archivo_url, snapshot_json=revision_snapshot(grade),
    ))
    delivery.evidencia_manifiesto = None


async def reprocess_grade(
    db,
    *,
    grade,
    evaluation,
    actor_id,
    request_id,
    expected_version,
    confirmed,
    reason=None,
    bundle=None,
    scan_replacement=None,
):
    if bundle is not None and scan_replacement is not None:
        raise HTTPException(400, "Elige una sola forma de cambiar la evidencia.")
    scan_context = None
    if scan_replacement is not None:
        if grade.entrega is None:
            raise HTTPException(409, "Esta calificación no tiene una entrega para cambiar su evidencia.")
        submission, sources = scan_replacement
        scan_context = ScanAdmissionContext(request_id, actor_id, grade.entrega.id, evaluation.id, grade.estudiante_id, evaluation.materia_id)
        scan_fingerprint = admission_draft(scan_context, submission, sources)["fingerprint"]
    reason = (reason or "").strip() or None
    content = (
        (
            bundle.source_fingerprint.encode()
            if getattr(bundle, "source_fingerprint", "")
            else bundle.content
        )
        if bundle
        else None
    )
    if scan_context is not None:
        content = scan_fingerprint.encode()
    fingerprint = operation_fingerprint(
        version=expected_version, reason=reason, confirmed=confirmed, content=content
    )
    existing = await db.get(CalificacionRevision, request_id)
    if existing:
        if (
            existing.calificacion_id != grade.id
            or existing.actor_id != actor_id
            or existing.request_fingerprint != fingerprint
        ):
            raise HTTPException(
                409,
                "La solicitud ya se usó con otros datos. Actualiza la vista antes de continuar.",
            )
        return grade
    if scan_context is not None:
        from app.modules.calificaciones.models import Entrega
        admitted = await db.scalar(select(Entrega.id).where(Entrega.evidencia_manifiesto["request_id"].astext == str(request_id)).limit(1))
        if admitted is not None:
            raise HTTPException(409, "Esta solicitud pertenece a una entrega anterior. Abre de nuevo «Cambiar evidencia» para preparar otra solicitud.")
    ensure_reprocessing_allowed(grade, expected_version, confirmed)
    delivery = grade.entrega
    if not delivery or not delivery.archivo_url:
        raise HTTPException(
            409,
            "Esta entrega no tiene evidencia. Añade primero una entrega con foto o PDF.",
        )
    active = await db.scalar(
        text(
            "SELECT id FROM ai_jobs WHERE entrega_id=:delivery AND estado IN ('queued','running','retrying') LIMIT 1"
        ),
        {"delivery": delivery.id},
    )
    if active:
        raise HTTPException(
            409, "Esta entrega ya está en cola o calificándose. Espera a que termine."
        )
    # Keep the historical evaluation context, including its visual material.
    await grading_job_reference(db, evaluation, delivery)
    if bundle is None and scan_context is None:
        try:
            manifest = read_manifest(delivery)
            if manifest is not None:
                # Preparation may have failed halfway. Keep the same version
                # and its checkpoints; never require a consultation PDF to retry.
                for page in manifest.pages:
                    await read_verified_asset(page.source)
                    if page.prepared is not None:
                        await read_verified_asset(page.prepared)
            elif not resolve_upload_path(delivery.archivo_url).is_file():
                raise ValueError("missing")
        except (OSError, ValueError, EvidenceManifestError) as exc:
            raise HTTPException(
                409,
                "No está disponible la evidencia anterior. Usa «Cambiar evidencia».",
            ) from exc
    revision = CalificacionRevision(
        id=request_id,
        calificacion_id=grade.id,
        actor_id=actor_id,
        accion="cambiar_evidencia" if bundle or scan_context is not None else "recalificar",
        motivo=reason,
        request_fingerprint=fingerprint,
        archivo_url=delivery.archivo_url,
        snapshot_json=revision_snapshot(grade),
    )
    db.add(revision)
    metadata = (
        evidence_service._mixed_evidence_metadata(evaluation, delivery)
        if delivery.tipo == "mixta"
        else (delivery.visual_text_json or {}).get("evidencia_consolidada")
    )
    new_url = None
    try:
        if bundle:
            limit = int(getattr(settings, "MAX_EVIDENCE_TOTAL_MB", 40)) * 1024 * 1024
            new_url = await save_upload(
                bundle.content,
                bundle.filename,
                subfolder="entregas",
                max_size_bytes=limit,
            )
            delivery.archivo_url = new_url
            delivery.evidencia_manifiesto = None
            if delivery.tipo != "mixta":
                delivery.tipo = "pdf" if bundle.mime == "application/pdf" else "foto"
            metadata = evidence_service._evidence_bundle_metadata(
                evaluation, delivery, bundle
            )
        elif scan_context is not None:
            manifest = await persist_scan_sources(scan_context, submission, sources)
            delivery.evidencia_manifiesto = manifest.model_dump(mode="json")
            delivery.archivo_url = f"{settings.PUBLIC_UPLOADS_BASE_URL.rstrip('/')}/{manifest.pages[0].source.key}"
            if delivery.tipo != "mixta":
                delivery.tipo = "pdf" if len(manifest.pages) > 1 else "foto"
            metadata = {"cantidad_paginas": len(manifest.pages), "tipo_documento": delivery.tipo}
        await suspend_grade_publications(db, grade.id)
        return await grading_queue_service.enqueue_persisted_grading(
            db,
            evaluacion=evaluation,
            entrega=delivery,
            estudiante_id=grade.estudiante_id,
            profesor_id=actor_id,
            evidence_metadata=metadata,
            calificacion=grade,
        )
    except Exception:
        await db.rollback()
        # Never delete on uncertain commit/refresh outcome: an admitted job may
        # reference this file. A failed pre-commit upload is safe to collect later.
        raise
