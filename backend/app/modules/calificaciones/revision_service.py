"""Reapertura docente transaccional con evidencia histórica e idempotencia."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select, text

from app.modules.calificaciones import evidence_service, grading_queue_service
from app.modules.calificaciones.models import CalificacionRevision
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
):
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
    if bundle is None:
        try:
            if not resolve_upload_path(delivery.archivo_url).is_file():
                raise ValueError("missing")
        except (OSError, ValueError) as exc:
            raise HTTPException(
                409,
                "No está disponible la evidencia anterior. Usa «Cambiar evidencia».",
            ) from exc
    revision = CalificacionRevision(
        id=request_id,
        calificacion_id=grade.id,
        actor_id=actor_id,
        accion="cambiar_evidencia" if bundle else "recalificar",
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
            if delivery.tipo != "mixta":
                delivery.tipo = "pdf" if bundle.mime == "application/pdf" else "foto"
            metadata = evidence_service._evidence_bundle_metadata(
                evaluation, delivery, bundle
            )
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
