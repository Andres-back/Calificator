"""Opt-in teacher photo admission using the existing durable grading queue."""
from __future__ import annotations

import hashlib
from uuid import UUID, uuid5

from fastapi import HTTPException
from sqlalchemy import select, text

from app.core.config import settings
from app.modules.calificaciones import grading_queue_service
from app.modules.calificaciones.evidence_manifest import ScanSubmission, read_manifest, scan_request_lock_key
from app.modules.calificaciones.evidence_preparation import ScanAdmissionContext, admission_draft, persist_scan_sources, scan_limits
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.evaluaciones.grading_visual_context import pin_new_submission_content
from app.services.evidence_scan import ALGORITHM


def scan_enabled_for(actor) -> bool:
    if not settings.EVIDENCE_SCAN_ENABLED or getattr(actor, "rol", None) not in {"profesor", "admin"}:
        return False
    allowed = {item.strip() for item in settings.EVIDENCE_SCAN_TEACHER_IDS.split(",") if item.strip()}
    return not allowed or str(actor.id) in allowed


def require_scan_enabled(actor) -> None:
    if not scan_enabled_for(actor):
        raise HTTPException(409, "El escaneo no está habilitado para nuevas fotos. Conservamos tu selección; puedes enviarla por la opción habitual.")


def capability(actor) -> dict:
    count, per_file, total = scan_limits()
    return {"schema_version": 1, "enabled": scan_enabled_for(actor), "max_pages": count,
            "max_file_bytes": per_file, "max_total_bytes": total, "max_scan_pixels": 16_000_000,
            "algorithm": ALGORITHM}


async def lock_scan_request(db, request_id: UUID) -> None:
    key = scan_request_lock_key(request_id)
    await db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": key})


async def lock_evidence_student(db, evaluation_id: UUID, student_id: UUID) -> None:
    key = int.from_bytes(hashlib.sha256(f"evidence-scan-delivery:{evaluation_id}:{student_id}".encode()).digest()[:8], "big", signed=True)
    await db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": key})


async def admit_scan_grading(db, *, evaluation, student_id: UUID, actor, request_id: UUID, submission: ScanSubmission, sources):
    require_scan_enabled(actor)
    # Lock request first, then evaluation/student. Different students do not wait
    # for each other's file writes or queue admission; pixels run in workers.
    await lock_scan_request(db, request_id)
    await lock_evidence_student(db, evaluation.id, student_id)
    existing = await db.scalar(select(Entrega).where(Entrega.evidencia_manifiesto["request_id"].astext == str(request_id)).with_for_update())
    if existing is not None:
        manifest = read_manifest(existing)
        context = ScanAdmissionContext(request_id, actor.id, existing.id, evaluation.id, student_id, evaluation.materia_id)
        if manifest.fingerprint != admission_draft(context, submission, sources)["fingerprint"]:
            raise HTTPException(409, "Esta solicitud ya se usó con otros datos. Actualiza la vista antes de continuar.")
        grade = await db.scalar(select(Calificacion).where(Calificacion.entrega_id == existing.id))
        if grade is None:
            raise HTTPException(409, "La solicitud anterior necesita revisión. No enviaremos una calificación duplicada.")
        return grade
    delivery = await db.scalar(select(Entrega).where(Entrega.evaluacion_id == evaluation.id, Entrega.estudiante_id == student_id)
                               .order_by(Entrega.created_at.desc()).limit(1).with_for_update())
    if delivery is not None:
        grade = await db.scalar(select(Calificacion).where(Calificacion.entrega_id == delivery.id))
        if grade is not None or read_manifest(delivery) is not None:
            raise HTTPException(409, "Esta entrega ya tiene una calificación. Ábrela y usa «Cambiar evidencia» para conservar lo anterior.")
    if evaluation.modalidad == "mixta" and (delivery is None or not delivery.respuesta_texto):
        raise HTTPException(409, "Primero debe guardarse la parte online; después añade las hojas.")
    if delivery is None:
        delivery = Entrega(id=uuid5(request_id, f"delivery:{actor.id}:{evaluation.id}:{student_id}"), evaluacion_id=evaluation.id, estudiante_id=student_id, materia_id=evaluation.materia_id,
                          tipo="pdf" if len(sources) > 1 else "foto", visual_text_json={})
        await pin_new_submission_content(db, evaluation, delivery)
        db.add(delivery)
    context = ScanAdmissionContext(request_id, actor.id, delivery.id, evaluation.id, student_id, evaluation.materia_id)
    manifest = await persist_scan_sources(context, submission, sources)
    delivery.evidencia_manifiesto = manifest.model_dump(mode="json")
    delivery.archivo_url = f"{settings.PUBLIC_UPLOADS_BASE_URL.rstrip('/')}/{manifest.pages[0].source.key}"
    delivery.tipo = "mixta" if evaluation.modalidad == "mixta" else "pdf" if len(sources) > 1 else "foto"
    if delivery.tipo != "mixta":
        delivery.respuesta_texto = None
    await db.flush()
    # One commit admits delivery + immutable sources + grade + both durable jobs.
    # Never delete private assets on a lost DB/broker acknowledgement.
    try:
        return await grading_queue_service.enqueue_persisted_grading(
            db, evaluacion=evaluation, entrega=delivery, estudiante_id=student_id, profesor_id=actor.id,
            evidence_metadata={"cantidad_paginas": len(manifest.pages), "tipo_documento": delivery.tipo},
        )
    except Exception:
        await db.rollback()
        raise
