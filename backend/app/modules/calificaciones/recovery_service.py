"""Operator-only, scoped recovery. No public endpoint and no grade fabrication."""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.calificaciones.grading_queue_service import enqueue_persisted_grading
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.evaluaciones.models import Evaluacion
from app.services.storage_service import (
    resolve_private_upload_path,
    resolve_upload_path,
)


def recovery_skip_reason(grade: Calificacion, delivery: Entrega) -> str | None:
    """Conservative: even a zero or an unconfirmed existing suggestion is excluded."""
    if grade.nota_sugerida is not None or grade.nota_confirmada is not None:
        return "existing_score"
    if grade.revisado_por_docente or grade.estado in {
        "confirmada",
        "ajustada",
        "publicada",
        "anulada",
    }:
        return "teacher_decision"
    if grade.estado != "requiere_revision" or delivery.estado != "requiere_reintento":
        return "not_failed"
    if not delivery.archivo_url:
        return "missing_evidence"
    return None


def _snapshot(row) -> dict:
    return {column.name: getattr(row, column.name) for column in row.__table__.columns}


async def recover_failed_grade(
    db: AsyncSession,
    *,
    grade_id: UUID,
    evaluation_id: UUID,
    teacher_id: UUID,
    execute: bool = False,
) -> dict:
    """Revalidate under row locks, back up, audit, then use the normal grading queue."""
    query = select(Calificacion).where(Calificacion.id == grade_id)
    if execute:
        query = query.with_for_update().execution_options(populate_existing=True)
    grade = await db.scalar(query)
    if (
        grade is None
        or grade.evaluacion_id != evaluation_id
        or grade.profesor_id != teacher_id
    ):
        raise ValueError(
            "La calificación no pertenece a la evaluación y docente indicados."
        )
    evaluation = await db.get(Evaluacion, evaluation_id)
    if (
        evaluation is None
        or evaluation.profesor_id != teacher_id
        or evaluation.deleted_at is not None
        or evaluation.estado in {"cerrada", "borrador"}
    ):
        raise ValueError("La evaluación no está disponible para esta recuperación.")
    query = select(Entrega).where(Entrega.id == grade.entrega_id)
    if execute:
        query = query.with_for_update().execution_options(populate_existing=True)
    delivery = await db.scalar(query)
    if (
        delivery is None
        or delivery.evaluacion_id != evaluation_id
        or delivery.estudiante_id != grade.estudiante_id
    ):
        raise ValueError("No coincide la entrega original de la calificación.")
    reason = recovery_skip_reason(grade, delivery)
    result = {
        "grade_id": str(grade_id),
        "eligible": reason is None,
        "reason": reason,
        "queued": False,
    }
    if reason:
        return result
    path = resolve_upload_path(delivery.archivo_url)
    if not path.is_file():
        return {**result, "eligible": False, "reason": "evidence_not_found"}
    active = await db.scalar(
        text(
            "SELECT id FROM ai_jobs WHERE entrega_id=CAST(:id AS uuid) AND estado IN ('queued','running','retrying') LIMIT 1"
        ),
        {"id": str(delivery.id)},
    )
    if active is not None:
        return {**result, "eligible": False, "reason": "active_job"}
    if not execute:
        return result

    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    original_digest = digest.hexdigest()
    snapshot = {
        "version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "grade": _snapshot(grade),
        "delivery": _snapshot(delivery),
        "evidence_sha256": original_digest,
    }
    encoded = json.dumps(
        snapshot, ensure_ascii=False, sort_keys=True, default=str
    ).encode("utf-8")
    backup_key = f".private/grading-recovery/{uuid4().hex}.json"
    backup = resolve_private_upload_path(backup_key)
    backup.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    descriptor = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "wb") as target:
        target.write(encoded)
        target.flush()
        os.fsync(target.fileno())
    metadata = {
        "operator": "system_hotfix112",
        "grade_id": str(grade.id),
        "evaluation_id": str(evaluation_id),
        "backup_key": backup_key,
        "backup_sha256": hashlib.sha256(encoded).hexdigest(),
        "evidence_sha256": original_digest,
    }
    # Persist in the same transaction as queue admission. Actor NULL denotes the
    # maintenance operator, not an action falsely attributed to the teacher.
    await db.execute(
        text(
            "INSERT INTO audit_events (actor_id,event,entity_type,entity_id,metadata) VALUES (NULL,'grading_recovery_112','calificacion',:id,CAST(:metadata AS jsonb))"
        ),
        {"id": str(grade.id), "metadata": json.dumps(metadata)},
    )
    payload = grade.resultado_json if isinstance(grade.resultado_json, dict) else {}
    evidence = payload.get("evidencia_consolidada")
    await enqueue_persisted_grading(
        db,
        evaluacion=evaluation,
        entrega=delivery,
        estudiante_id=grade.estudiante_id,
        profesor_id=teacher_id,
        calificacion=grade,
        evidence_metadata=evidence if isinstance(evidence, dict) else None,
    )
    return {
        **result,
        "queued": True,
        "backup_sha256": metadata["backup_sha256"],
        "evidence_sha256": original_digest,
    }
