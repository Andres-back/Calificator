"""Celery task for persistent, idempotent batch grading."""

from __future__ import annotations

import asyncio
import hashlib
import json
from contextlib import suppress
import time
from collections.abc import Callable

from uuid import UUID, uuid4

import aiofiles
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal, engine
from app.modules.calificaciones import photo_service, service as calificaciones_service
from app.modules.calificaciones.breakdown_service import create_automatic_breakdown
from app.modules.calificaciones.grading_service import grade_submission
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.calificaciones.salon_mode_service import update_estudiante_estado
from app.modules.evaluaciones.blueprint_service import evaluation_to_grading_blueprint
from app.modules.evaluaciones.models import Evaluacion
from app.modules.jobs import service as jobs_service
from app.services.storage_service import resolve_upload_path, validate_mime
from app.services.vision_extractor import build_extraction_context
from app.shared.enums import (
    CalificacionEstado,
    EntregaEstado,
    JobEstado,
    JobTipo,
    SalonEstudianteEstado,
)
from app.workers.worker import celery_app

logger = get_logger(__name__)
ProgressCallback = Callable[[int, dict], None]


async def _load_submission(entrega: Entrega) -> dict:
    payload = {
        "student_response_text": entrega.respuesta_texto or None,
        "image_bytes": None,
        "image_mime": "image/jpeg",
    }
    if entrega.archivo_url:
        path = resolve_upload_path(entrega.archivo_url)
        if not path.is_file():
            raise FileNotFoundError("No se encontro el archivo asociado a la entrega")
        async with aiofiles.open(path, "rb") as source:
            content = await source.read()
        payload["image_bytes"] = content
        payload["image_mime"] = validate_mime(content, path.name)
    if not payload["student_response_text"] and not payload["image_bytes"]:
        raise ValueError("La entrega no contiene texto ni archivo para calificar")
    return payload


async def _load_deliveries(
    db: AsyncSession,
    *,
    evaluacion_id: UUID,
    estudiante_ids: list[UUID],
    entrega_ids: list[UUID],
) -> tuple[list[Entrega], list[dict]]:
    if entrega_ids:
        rows = list(
            await db.scalars(
                select(Entrega).where(
                    Entrega.evaluacion_id == evaluacion_id,
                    Entrega.id.in_(entrega_ids),
                )
            )
        )
        by_id = {row.id: row for row in rows}
        missing = [
            {
                "entrega_id": str(item_id),
                "estudiante_id": None,
                "error": "Entrega no encontrada para la evaluacion",
            }
            for item_id in entrega_ids
            if item_id not in by_id
        ]
        return [by_id[item_id] for item_id in entrega_ids if item_id in by_id], missing

    if not estudiante_ids:
        return [], []
    rows = list(
        await db.scalars(
            select(Entrega)
            .where(
                Entrega.evaluacion_id == evaluacion_id,
                Entrega.estudiante_id.in_(estudiante_ids),
            )
            .order_by(Entrega.created_at.desc())
        )
    )
    latest_by_student: dict[UUID, Entrega] = {}
    for row in rows:
        latest_by_student.setdefault(row.estudiante_id, row)
    missing = [
        {
            "entrega_id": None,
            "estudiante_id": str(student_id),
            "error": "El estudiante no tiene una entrega para esta evaluacion",
        }
        for student_id in estudiante_ids
        if student_id not in latest_by_student
    ]
    deliveries = [
        latest_by_student[item] for item in estudiante_ids if item in latest_by_student
    ]
    return deliveries, missing


async def _existing_grade(db: AsyncSession, entrega_id: UUID) -> Calificacion | None:
    return await db.scalar(
        select(Calificacion).where(Calificacion.entrega_id == entrega_id)
    )


def _extraction_fingerprint(
    *,
    image_bytes: bytes | None,
    image_mime: str,
    blueprint: dict,
    ai_config: dict | None,
) -> str | None:
    if not image_bytes:
        return None
    vision_config = (
        (ai_config or {}).get("vision")
        if isinstance((ai_config or {}).get("vision"), dict)
        else ai_config or {}
    )
    metadata = json.dumps(
        {
            "schema_version": 1,
            "mime": image_mime,
            "context": build_extraction_context(blueprint),
            "vision": vision_config,
            "max_side": settings.VISION_MAX_IMAGE_SIDE,
            "pdf_dpi": settings.GRADING_PDF_RENDER_DPI,
        },
        ensure_ascii=False,
        sort_keys=True,
        default=str,
    ).encode("utf-8")
    digest = hashlib.sha256()
    digest.update(image_bytes)
    digest.update(b"\0")
    digest.update(metadata)
    return digest.hexdigest()


async def _keep_job_alive(job_id: UUID, claim_token: str | None) -> None:
    """Renueva el lease mientras el proveedor continúa trabajando."""
    while True:
        await asyncio.sleep(max(5, settings.AI_JOB_HEARTBEAT_SECONDS))
        try:
            async with AsyncSessionLocal() as heartbeat_db:
                renewed = await jobs_service.heartbeat_job(
                    heartbeat_db,
                    job_id,
                    claim_token=claim_token,
                    stage="model_inference",
                )
                await heartbeat_db.commit()
            if not renewed:
                return
        except Exception:  # noqa: BLE001
            logger.warning(
                "Could not renew grading lease",
                extra={"job_id": str(job_id)},
                exc_info=True,
            )


async def _grade_delivery(
    db: AsyncSession,
    *,
    evaluacion: Evaluacion,
    entrega: Entrega,
    profesor_id: UUID,
    ai_config: dict | None = None,
    job_id: UUID | None = None,
    claim_token: str | None = None,
) -> tuple[Calificacion, bool]:
    if job_id and claim_token:
        await jobs_service.lock_owned_job(db, job_id, claim_token)
    existing = await _existing_grade(db, entrega.id)
    queued_payload = (
        entrega.visual_text_json if isinstance(entrega.visual_text_json, dict) else {}
    )
    raw_existing_payload = getattr(existing, "resultado_json", None)
    existing_payload = (
        raw_existing_payload if isinstance(raw_existing_payload, dict) else {}
    )
    queued_marker = queued_payload.get("pipeline_status") in {
        "queued",
        "running",
        "retrying",
    } or existing_payload.get("pipeline_status") in {
        "queued",
        "running",
        "retrying",
    }
    if existing and (not queued_marker or getattr(existing, "revisado_por_docente", False)):
        expected_state = (
            EntregaEstado.REQUIERE_REINTENTO.value
            if getattr(existing, "nota_sugerida", 0) is None
            else EntregaEstado.CALIFICADA.value
        )
        if entrega.estado != expected_state:
            entrega.estado = expected_state
            await db.commit()
        return existing, False

    running_payload = {
        **queued_payload,
        "pipeline_status": "running",
    }
    entrega.estado = EntregaEstado.PROCESANDO.value
    entrega.visual_text_json = running_payload
    if existing:
        existing.resultado_json = running_payload
        existing.estado = CalificacionEstado.PROCESANDO.value
    await db.commit()

    submission = await _load_submission(entrega)
    blueprint = evaluation_to_grading_blueprint(evaluacion)
    checkpoint: dict | None = None
    fingerprint = _extraction_fingerprint(
        image_bytes=submission["image_bytes"],
        image_mime=submission["image_mime"],
        blueprint=blueprint,
        ai_config=ai_config,
    )
    if (
        settings.GRADING_RETRY_CHECKPOINTS_ENABLED
        and job_id
        and fingerprint
    ):
        job_result = await jobs_service.get_job_result(db, job_id)
        candidate = job_result.get("_checkpoint_v1")
        if (
            isinstance(candidate, dict)
            and candidate.get("fingerprint") == fingerprint
            and candidate.get("schema_version") == 1
        ):
            checkpoint = candidate

    async def persist_checkpoint(payload: dict) -> None:
        if not (
            settings.GRADING_RETRY_CHECKPOINTS_ENABLED
            and job_id
            and claim_token
            and fingerprint
        ):
            return
        saved = await jobs_service.save_grading_checkpoint(
            db,
            job_id,
            claim_token=claim_token,
            checkpoint={
                "schema_version": 1,
                "fingerprint": fingerprint,
                **payload,
            },
        )
        if not saved:
            raise jobs_service.JobOwnershipLost(
                "La ejecución perdió el trabajo al guardar la extracción"
            )
        await db.commit()

    grading = await grade_submission(
        db,
        evaluacion_id=evaluacion.id,
        materia_id=evaluacion.materia_id,
        blueprint=blueprint,
        student_response_text=submission["student_response_text"],
        image_bytes=submission["image_bytes"],
        image_mime=submission["image_mime"],
        user_id=profesor_id,
        ai_config=ai_config,
        vision_checkpoint=checkpoint,
        on_vision_checkpoint=persist_checkpoint,
    )
    if job_id and claim_token:
        await jobs_service.lock_owned_job(db, job_id, claim_token)
        # Recarga la decisión vigente: una nota docente guardada durante la
        # inferencia tiene prioridad sobre cualquier sugerencia tardía.
        existing = await db.scalar(
            select(Calificacion).where(Calificacion.entrega_id == entrega.id)
            .with_for_update().execution_options(populate_existing=True)
        )
        if existing and existing.revisado_por_docente:
            await db.commit()
            return existing, False
    evidence_metadata = queued_payload.get("evidencia_consolidada")
    if isinstance(evidence_metadata, dict):
        grading.raw_model_output = {
            **grading.raw_model_output,
            "evidencia_consolidada": evidence_metadata,
        }
    if grading.nota_sugerida is not None:
        calificaciones_service.validate_score_within_evaluation(
            grading.nota_sugerida,
            evaluacion,
            "nota_sugerida",
        )
        calificaciones_service.transition_to_grading_if_needed(evaluacion)
    persistence_started = time.monotonic()
    calificacion = photo_service.apply_grading_result(
        entrega=entrega,
        evaluacion=evaluacion,
        estudiante_id=entrega.estudiante_id,
        profesor_id=profesor_id,
        grading=grading,
        calificacion=existing,
    )
    if existing is None:
        db.add(calificacion)

    await create_automatic_breakdown(
        db,
        calificacion=calificacion,
        blueprint=blueprint,
        raw_output=grading.raw_model_output,
        pipeline_run_id=str(queued_payload.get("job_id") or "") or None,
    )

    salon_session_id = (
        evidence_metadata.get("salon_sesion_id")
        if isinstance(evidence_metadata, dict)
        else None
    )
    if salon_session_id:
        await update_estudiante_estado(
            db,
            salon_session_id,
            entrega.estudiante_id,
            SalonEstudianteEstado.CALIFICADO.value,
        )

    # Guarda resultado y telemetría juntos, mientras conservamos el bloqueo
    # de propiedad y de nota. No reescribimos el resultado tras soltarlo.
    persistence_ms = max(0, int((time.monotonic() - persistence_started) * 1000))
    persisted_payload = dict(calificacion.resultado_json) if isinstance(calificacion.resultado_json, dict) else {}
    persisted_timings = (
        dict(persisted_payload.get("timings_ms"))
        if isinstance(persisted_payload.get("timings_ms"), dict)
        else {}
    )
    persisted_timings["persistence"] = persistence_ms
    persisted_timings["total"] = max(
        int(persisted_timings.get("total") or 0) + persistence_ms,
        persistence_ms,
    )
    persisted_payload["timings_ms"] = persisted_timings
    calificacion.resultado_json = persisted_payload
    entrega.visual_text_json = persisted_payload
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        current = await _existing_grade(db, entrega.id)
        if not current:
            raise
        return current, False
    await db.refresh(calificacion)
    return calificacion, True


async def _mark_delivery_for_retry(
    db: AsyncSession, entrega_id: UUID, error: str,
    *, job_id: UUID | None = None, claim_token: str | None = None,
    reset_transaction: bool = True, commit: bool = True,
) -> None:
    if reset_transaction:
        await db.rollback()
    if job_id and claim_token:
        await jobs_service.lock_owned_job(db, job_id, claim_token)
    entrega = await db.scalar(select(Entrega).where(Entrega.id == entrega_id))
    if not entrega:
        return
    existing = await db.scalar(
        select(Calificacion).where(Calificacion.entrega_id == entrega_id)
        .with_for_update().execution_options(populate_existing=True)
    )
    if existing and existing.revisado_por_docente:
        return
    current = (
        entrega.visual_text_json if isinstance(entrega.visual_text_json, dict) else {}
    )
    if current.get("pipeline_status") not in {"queued", "running", "retrying"}:
        return
    entrega.estado = EntregaEstado.REQUIERE_REINTENTO.value
    failed_payload = {
        **current,
        "pipeline_status": "failed",
        "batch_error": error[:500],
        "requiere_revision_docente": True,
    }
    entrega.visual_text_json = failed_payload
    if existing and not existing.revisado_por_docente:
        existing.resultado_json = failed_payload
        existing.estado = CalificacionEstado.REQUIERE_REVISION.value
    evidence_metadata = current.get("evidencia_consolidada")
    salon_session_id = (
        evidence_metadata.get("salon_sesion_id")
        if isinstance(evidence_metadata, dict)
        else None
    )
    if salon_session_id:
        await update_estudiante_estado(
            db,
            salon_session_id,
            entrega.estudiante_id,
            SalonEstudianteEstado.ERROR.value,
            error[:500],
        )
    if commit:
        await db.commit()


def _build_result(
    *,
    evaluacion_id: UUID,
    status_value: str,
    processed: int,
    skipped: int,
    errors: list[dict],
    calificacion_ids: list[str],
) -> dict:
    reviewable_failures = sum(
        1 for item in errors if item.get("calificacion_id")
    )
    return {
        "status": status_value,
        "evaluacion_id": str(evaluacion_id),
        "processed": processed,
        "skipped": skipped,
        "failed": len(errors),
        "calificacion_ids": calificacion_ids,
        "errors": errors,
        "requires_teacher_review": processed + skipped + reviewable_failures,
    }


def _emit_progress(
    callback: ProgressCallback | None, progreso: int, result: dict
) -> None:
    if not callback:
        return
    try:
        callback(progreso, result)
    except Exception:  # noqa: BLE001
        logger.warning("Could not publish Celery batch progress", exc_info=True)


async def _cancelled_result(
    db: AsyncSession,
    *,
    job_id: UUID,
    evaluacion_id: UUID,
    progreso: int,
    processed: int,
    skipped: int,
    errors: list[dict],
    calificacion_ids: list[str],
) -> dict:
    result = _build_result(
        evaluacion_id=evaluacion_id,
        status_value=JobEstado.CANCELLED.value,
        processed=processed,
        skipped=skipped,
        errors=errors,
        calificacion_ids=calificacion_ids,
    )
    await jobs_service.finish_cancelled_job(
        db,
        job_id,
        progreso=progreso,
        resultado_json=result,
    )
    await db.commit()
    return result


async def _grade_batch_async(
    *,
    evaluacion_id: UUID,
    estudiante_ids: list[UUID],
    entrega_ids: list[UUID],
    job_id: UUID | None,
    profesor_id: UUID | None,
    claim_token: str | None = None,
    progress_callback: ProgressCallback | None = None,
) -> dict:
    async with AsyncSessionLocal() as db:
        pipeline_started = time.monotonic()
        job_timings = {
            "queue": 0, "prepare": 0, "extraction": 0, "parsing": 0, "primary": 0,
            "secondary": 0, "consolidation": 0, "persistence": 0, "total": 0,
        }
        job_fallbacks: list[dict[str, str]] = []
        job_ai_config: dict | None = None

        def build_result(**values) -> dict:
            job_timings["total"] = max(
                0, int((time.monotonic() - pipeline_started) * 1000)
            )
            status_value = str(values.get("status_value") or "")
            terminal_reason = (
                "success" if status_value == JobEstado.SUCCESS.value
                else "processing_failed" if status_value == JobEstado.FAILED.value
                else None
            )
            payload = _build_result(**values)
            payload.update({
                "pipeline_run_id": str(job_id) if job_id else None,
                "timings_ms": dict(job_timings),
                "fallbacks": list(job_fallbacks),
                "terminal_reason": terminal_reason,
                "deadline_ms": None,
                "slow_after_ms": int(settings.PHOTO_GRADING_SLOW_WARNING_SECONDS) * 1000,
            })
            if claim_token:
                payload["claim_token"] = claim_token
            return payload

        def record_grade_telemetry(calificacion: Calificacion) -> None:
            raw_value = getattr(calificacion, "resultado_json", None)
            raw = raw_value if isinstance(raw_value, dict) else {}
            timings = raw.get("timings_ms") if isinstance(raw.get("timings_ms"), dict) else {}
            for stage in ("prepare", "extraction", "parsing", "primary", "secondary", "consolidation", "persistence"):
                job_timings[stage] += max(0, int(timings.get(stage) or 0))
            for fallback in raw.get("fallbacks", []):
                if not isinstance(fallback, dict):
                    continue
                job_fallbacks.append({
                    "stage": str(fallback.get("stage") or "unknown")[:80],
                    "reason": str(fallback.get("reason") or "fallback")[:120],
                })

        processed = 0
        skipped = 0
        errors: list[dict] = []
        calificacion_ids: list[str] = []
        heartbeat_task: asyncio.Task | None = None
        try:
            if job_id:
                job_timings["queue"] = await jobs_service.get_job_queue_time_ms(
                    db, job_id
                )
                job_input = await jobs_service.get_job_input(db, job_id)
                snapshot = job_input.get("_ai_config")
                if isinstance(snapshot, dict):
                    job_ai_config = snapshot

                state = await jobs_service.get_job_state(db, job_id)
                if state == JobEstado.CANCELLED.value:
                    return await _cancelled_result(
                        db,
                        job_id=job_id,
                        evaluacion_id=evaluacion_id,
                        progreso=0,
                        processed=0,
                        skipped=0,
                        errors=[],
                        calificacion_ids=[],
                    )
                if state in {JobEstado.SUCCESS.value, JobEstado.FAILED.value, JobEstado.REQUIRES_REVIEW.value, JobEstado.FAILED_PERMANENT.value}:
                    return build_result(
                        evaluacion_id=evaluacion_id,
                        status_value=state,
                        processed=0,
                        skipped=0,
                        errors=[],
                        calificacion_ids=[],
                    )
                claimed = False
                if state in {JobEstado.QUEUED.value, JobEstado.RETRYING.value}:
                    claimed = (
                        await jobs_service.claim_job_running(
                            db, job_id, claim_token=claim_token
                        )
                        if claim_token
                        else await jobs_service.mark_job_running(db, job_id)
                    )
                    await db.commit()
                    if claim_token and not claimed:
                        state = await jobs_service.get_job_state(db, job_id)
                if claim_token and not claimed:
                    return build_result(
                        evaluacion_id=evaluacion_id,
                        status_value=state or JobEstado.RUNNING.value,
                        processed=0, skipped=0, errors=[], calificacion_ids=[],
                    )
                heartbeat_task = asyncio.create_task(_keep_job_alive(job_id, claim_token))

            evaluacion = await db.scalar(
                select(Evaluacion)
                .options(selectinload(Evaluacion.blueprint))
                .where(Evaluacion.id == evaluacion_id)
            )
            if not evaluacion:
                raise ValueError("Evaluacion no encontrada")
            calificaciones_service.ensure_evaluation_active(evaluacion)
            effective_profesor_id = profesor_id or evaluacion.profesor_id
            deliveries, missing = await _load_deliveries(
                db,
                evaluacion_id=evaluacion_id,
                estudiante_ids=estudiante_ids,
                entrega_ids=entrega_ids,
            )
            errors.extend(missing)
            total = len(deliveries) + len(missing)

            for index, entrega in enumerate(deliveries, start=1):
                if (
                    job_id
                    and await jobs_service.get_job_state(db, job_id)
                    == JobEstado.CANCELLED.value
                ):
                    progreso = (
                        round(((index - 1 + len(missing)) / total) * 100)
                        if total
                        else 0
                    )
                    result = await _cancelled_result(
                        db,
                        job_id=job_id,
                        evaluacion_id=evaluacion_id,
                        progreso=progreso,
                        processed=processed,
                        skipped=skipped,
                        errors=errors,
                        calificacion_ids=calificacion_ids,
                    )
                    _emit_progress(progress_callback, progreso, result)
                    return result
                try:
                    calificacion, created = await _grade_delivery(
                        db,
                        evaluacion=evaluacion,
                        entrega=entrega,
                        profesor_id=effective_profesor_id,
                        ai_config=job_ai_config,
                        job_id=job_id,
                        claim_token=claim_token,
                    )
                    calificacion_ids.append(str(calificacion.id))
                    record_grade_telemetry(calificacion)
                    has_score_field = hasattr(calificacion, "nota_sugerida")
                    if has_score_field and calificacion.nota_sugerida is None:
                        raw_value = getattr(calificacion, "resultado_json", None)
                        raw = raw_value if isinstance(raw_value, dict) else {}
                        errors.append(
                            {
                                "entrega_id": str(entrega.id),
                                "estudiante_id": str(entrega.estudiante_id),
                                "calificacion_id": str(calificacion.id),
                                "error": "La IA no produjo una nota valida",
                                "reason": str(
                                    raw.get("motivo_revision")
                                    or "grading_without_score"
                                )[:120],
                            }
                        )
                    elif created:
                        processed += 1
                    else:
                        skipped += 1
                except jobs_service.JobOwnershipLost:
                    raise
                except Exception as exc:  # noqa: BLE001
                    if job_id and claim_token:
                        await db.rollback()
                        await jobs_service.lock_owned_job(db, job_id, claim_token)
                    safe_error = str(exc)[:500] or exc.__class__.__name__
                    logger.exception(
                        "Batch grading failed for delivery",
                        extra={
                            "entrega_id": str(entrega.id),
                            "evaluacion_id": str(evaluacion_id),
                        },
                    )
                    await _mark_delivery_for_retry(
                        db, entrega.id, safe_error, job_id=job_id, claim_token=claim_token,
                    )
                    errors.append(
                        {
                            "entrega_id": str(entrega.id),
                            "estudiante_id": str(entrega.estudiante_id),
                            "error": safe_error,
                        }
                    )

                progreso = (
                    round(((index + len(missing)) / total) * 100) if total else 100
                )
                if (
                    job_id
                    and await jobs_service.get_job_state(db, job_id)
                    == JobEstado.CANCELLED.value
                ):
                    result = await _cancelled_result(
                        db,
                        job_id=job_id,
                        evaluacion_id=evaluacion_id,
                        progreso=progreso,
                        processed=processed,
                        skipped=skipped,
                        errors=errors,
                        calificacion_ids=calificacion_ids,
                    )
                    _emit_progress(progress_callback, progreso, result)
                    return result

                interim = build_result(
                    evaluacion_id=evaluacion_id,
                    status_value=JobEstado.RUNNING.value,
                    processed=processed,
                    skipped=skipped,
                    errors=errors,
                    calificacion_ids=calificacion_ids,
                )
                if job_id:
                    await jobs_service.update_job_progress(
                        db,
                        job_id,
                        progreso=progreso,
                        resultado_json=interim,
                    )
                    await db.commit()
                _emit_progress(progress_callback, progreso, interim)

            final_state = (
                JobEstado.FAILED.value
                if errors and processed == 0 and skipped == 0
                else JobEstado.SUCCESS.value
            )
            result = build_result(
                evaluacion_id=evaluacion_id,
                status_value=final_state,
                processed=processed,
                skipped=skipped,
                errors=errors,
                calificacion_ids=calificacion_ids,
            )
            if job_id:
                error_summary = (
                    f"{len(errors)} entrega(s) no pudieron calificarse"
                    if errors
                    else None
                )
                finished = await jobs_service.finish_job(
                    db,
                    job_id,
                    estado=final_state,
                    resultado_json=result,
                    error=error_summary,
                )
                if (
                    not finished
                    and await jobs_service.get_job_state(db, job_id)
                    == JobEstado.CANCELLED.value
                ):
                    result = await _cancelled_result(
                        db,
                        job_id=job_id,
                        evaluacion_id=evaluacion_id,
                        progreso=100,
                        processed=processed,
                        skipped=skipped,
                        errors=errors,
                        calificacion_ids=calificacion_ids,
                    )
                    _emit_progress(progress_callback, 100, result)
                    return result
                await db.commit()
            _emit_progress(progress_callback, 100, result)
            return result
        except jobs_service.JobOwnershipLost:
            await db.rollback()
            return {"status": "superseded", "processed": 0, "skipped": 0, "failed": 0}
        except Exception as exc:
            await db.rollback()
            if job_id:
                if claim_token:
                    try:
                        await jobs_service.lock_owned_job(db, job_id, claim_token)
                    except jobs_service.JobOwnershipLost:
                        await db.rollback()
                        return {"status": "superseded", "processed": 0, "skipped": 0, "failed": 0}
                for entrega_id in entrega_ids:
                    try:
                        await _mark_delivery_for_retry(
                            db, entrega_id, str(exc), job_id=job_id, claim_token=claim_token,
                        )
                    except Exception:  # noqa: BLE001
                        logger.warning(
                            "Could not mark delivery recoverable after batch failure",
                            extra={"entrega_id": str(entrega_id), "job_id": str(job_id)},
                            exc_info=True,
                        )
                result = build_result(
                    evaluacion_id=evaluacion_id,
                    status_value=JobEstado.FAILED.value,
                    processed=processed,
                    skipped=skipped,
                    errors=[
                        *errors,
                        {
                            "entrega_id": None,
                            "estudiante_id": None,
                            "error": str(exc)[:500],
                        },
                    ],
                    calificacion_ids=calificacion_ids,
                )
                await jobs_service.finish_job(
                    db,
                    job_id,
                    estado=JobEstado.FAILED.value,
                    resultado_json=result,
                    error=str(exc),
                )
                await db.commit()
            raise
        finally:
            if heartbeat_task:
                heartbeat_task.cancel()
                with suppress(asyncio.CancelledError):
                    await heartbeat_task


async def _run_and_dispose(**kwargs) -> dict:
    await engine.dispose(close=False)
    try:
        return await _grade_batch_async(**kwargs)
    finally:
        await engine.dispose()


@celery_app.task(bind=True, name="tasks.grade_batch")
def grade_batch(
    self,
    evaluacion_id: str,
    estudiante_ids: list[str] | None = None,
    *,
    entrega_ids: list[str] | None = None,
    job_id: str | None = None,
    profesor_id: str | None = None,
) -> dict:
    """Grade persisted submissions and leave every grade pending teacher review."""
    raw_students = estudiante_ids or []
    raw_deliveries = entrega_ids or []

    def publish(progreso: int, result: dict) -> None:
        self.update_state(
            state="PROGRESS",
            meta={
                "progreso": progreso,
                "processed": result["processed"],
                "skipped": result["skipped"],
                "failed": result["failed"],
            },
        )

    try:
        return asyncio.run(
            _run_and_dispose(
                evaluacion_id=UUID(evaluacion_id),
                estudiante_ids=[UUID(value) for value in raw_students],
                entrega_ids=[UUID(value) for value in raw_deliveries],
                job_id=UUID(job_id) if job_id else None,
                profesor_id=UUID(profesor_id) if profesor_id else None,
                claim_token=str(uuid4()) if job_id else None,
                progress_callback=publish,
            )
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "Batch grading task failed",
            extra={"evaluacion_id": evaluacion_id, "job_id": job_id},
        )
        return {
            "status": JobEstado.FAILED.value,
            "evaluacion_id": evaluacion_id,
            "processed": 0,
            "skipped": 0,
            "failed": max(1, len(raw_deliveries) or len(raw_students)),
            "calificacion_ids": [],
            "errors": [{"error": str(exc)[:500]}],
            "requires_teacher_review": 0,
        }


@celery_app.task(bind=True, name="tasks.grade_delivery")
def grade_delivery(
    self,
    evaluacion_id: str,
    entrega_id: str,
    job_id: str,
    profesor_id: str | None = None,
) -> dict:
    """Procesa una evidencia de forma independiente e idempotente."""
    def publish(progreso: int, result: dict) -> None:
        self.update_state(
            state="PROGRESS",
            meta={
                "progreso": progreso,
                "processed": result["processed"],
                "skipped": result["skipped"],
                "failed": result["failed"],
            },
        )

    try:
        return asyncio.run(
            _run_and_dispose(
                evaluacion_id=UUID(evaluacion_id),
                estudiante_ids=[],
                entrega_ids=[UUID(entrega_id)],
                job_id=UUID(job_id),
                profesor_id=UUID(profesor_id) if profesor_id else None,
                claim_token=str(uuid4()),
                progress_callback=publish,
            )
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "Delivery grading task failed",
            extra={"entrega_id": entrega_id, "job_id": job_id},
        )
        return {
            "status": JobEstado.FAILED.value,
            "evaluacion_id": evaluacion_id,
            "processed": 0,
            "skipped": 0,
            "failed": 1,
            "calificacion_ids": [],
            "errors": [{"entrega_id": entrega_id, "error": str(exc)[:500]}],
            "requires_teacher_review": 1,
        }


async def _claim_stale_grading_jobs() -> tuple[list[dict], int]:
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            exhausted = await jobs_service.fail_exhausted_jobs(
                db, tipo=JobTipo.CALIFICACION_ENTREGA.value,
                limit=settings.AI_JOB_RECOVERY_BATCH_SIZE,
            )
            for abandoned in exhausted:
                if abandoned.get("entrega_id"):
                    await _mark_delivery_for_retry(
                        db, abandoned["entrega_id"],
                        "No se pudo recuperar el procesamiento. El docente puede reintentarlo.",
                        reset_transaction=False, commit=False,
                    )
                if abandoned.get("parent_job_id"):
                    await jobs_service.aggregate_parent_job(db, abandoned["parent_job_id"])
            await db.commit()
            rows = await jobs_service.claim_recoverable_jobs(
                db,
                tipo=JobTipo.CALIFICACION_ENTREGA.value,
                queued_seconds=settings.AI_JOB_QUEUED_RECOVERY_SECONDS,
                limit=settings.AI_JOB_RECOVERY_BATCH_SIZE,
            )
            legacy_rows = await jobs_service.claim_stale_queued_jobs(
                db,
                tipo=JobTipo.CALIFICACION_LOTE.value,
                stale_seconds=settings.AI_JOB_QUEUED_RECOVERY_SECONDS,
                limit=settings.AI_JOB_RECOVERY_BATCH_SIZE,
            )
            rows.extend({**row, "tipo": JobTipo.CALIFICACION_LOTE.value} for row in legacy_rows)
            valid: list[dict] = []
            invalid = 0
            for row in rows:
                payload = row.get("input_json")
                payload = payload if isinstance(payload, dict) else {}
                if payload.get("evaluacion_id") and (
                    payload.get("entrega_ids") or payload.get("estudiante_ids")
                ):
                    valid.append(row)
                    continue
                invalid += 1
                await jobs_service.finish_job(
                    db,
                    row["id"],
                    estado=JobEstado.FAILED.value,
                    resultado_json={
                        "status": JobEstado.FAILED.value,
                        "terminal_reason": "invalid_persisted_input",
                    },
                    error="El trabajo no contiene identificadores suficientes para recuperarse",
                )
            await db.commit()
            return valid, invalid
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.recover_stale_grading_jobs")
def recover_stale_grading_jobs() -> dict:
    """Republish grading jobs that persisted but never started."""
    rows, invalid = asyncio.run(_claim_stale_grading_jobs())
    recovered = 0
    for row in rows:
        payload = row.get("input_json")
        payload = payload if isinstance(payload, dict) else {}
        evaluacion_id = payload.get("evaluacion_id")
        entrega_ids = payload.get("entrega_ids") or []
        estudiante_ids = payload.get("estudiante_ids") or []
        try:
            if row.get("tipo") == JobTipo.CALIFICACION_ENTREGA.value and len(entrega_ids) == 1:
                grade_delivery.apply_async(
                    kwargs={
                        "evaluacion_id": str(evaluacion_id),
                        "entrega_id": str(entrega_ids[0]),
                        "job_id": str(row["id"]),
                        "profesor_id": str(row["user_id"]) if row.get("user_id") else None,
                    },
                    queue="grading",
                )
            else:
                grade_batch.apply_async(
                    kwargs={
                        "evaluacion_id": str(evaluacion_id),
                        "estudiante_ids": [str(value) for value in estudiante_ids],
                        "entrega_ids": [str(value) for value in entrega_ids],
                        "job_id": str(row["id"]),
                        "profesor_id": str(row["user_id"]) if row.get("user_id") else None,
                    },
                    queue="grading",
                )
            recovered += 1
        except Exception:  # noqa: BLE001
            logger.exception(
                "Could not republish stale grading job",
                extra={"job_id": str(row.get("id"))},
            )
    return {"selected": len(rows), "recovered": recovered, "invalid": invalid}
