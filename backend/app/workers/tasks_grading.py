"""Celery task for persistent, idempotent batch grading."""
from __future__ import annotations

import asyncio
from collections.abc import Callable
from pathlib import Path
from urllib.parse import unquote, urlparse
from uuid import UUID

import aiofiles
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal, engine
from app.modules.calificaciones import photo_service, service as calificaciones_service
from app.modules.calificaciones.grading_service import grade_submission
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.evaluaciones.blueprint_service import evaluation_to_grading_blueprint
from app.modules.evaluaciones.models import Evaluacion
from app.modules.jobs import service as jobs_service
from app.services.storage_service import validate_mime
from app.shared.enums import EntregaEstado, JobEstado
from app.workers.worker import celery_app

logger = get_logger(__name__)
ProgressCallback = Callable[[int, dict], None]


def resolve_upload_path(public_url: str) -> Path:
    """Resolve an internal upload URL without allowing traversal outside UPLOADS_DIR."""
    uploads_root = Path(settings.UPLOADS_DIR).resolve()
    public_prefix = urlparse(settings.PUBLIC_UPLOADS_BASE_URL).path.rstrip("/")
    parsed_path = unquote(urlparse(public_url).path)
    expected_prefix = f"{public_prefix}/" if public_prefix else "/"
    if not parsed_path.startswith(expected_prefix):
        raise ValueError("La entrega no apunta al almacenamiento interno permitido")
    candidate = (uploads_root / parsed_path[len(expected_prefix):]).resolve()
    if candidate == uploads_root or uploads_root not in candidate.parents:
        raise ValueError("Ruta de entrega fuera del almacenamiento permitido")
    return candidate


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
        rows = list(await db.scalars(select(Entrega).where(
            Entrega.evaluacion_id == evaluacion_id,
            Entrega.id.in_(entrega_ids),
        )))
        by_id = {row.id: row for row in rows}
        missing = [{
            "entrega_id": str(item_id),
            "estudiante_id": None,
            "error": "Entrega no encontrada para la evaluacion",
        } for item_id in entrega_ids if item_id not in by_id]
        return [by_id[item_id] for item_id in entrega_ids if item_id in by_id], missing

    if not estudiante_ids:
        return [], []
    rows = list(await db.scalars(
        select(Entrega)
        .where(
            Entrega.evaluacion_id == evaluacion_id,
            Entrega.estudiante_id.in_(estudiante_ids),
        )
        .order_by(Entrega.created_at.desc())
    ))
    latest_by_student: dict[UUID, Entrega] = {}
    for row in rows:
        latest_by_student.setdefault(row.estudiante_id, row)
    missing = [{
        "entrega_id": None,
        "estudiante_id": str(student_id),
        "error": "El estudiante no tiene una entrega para esta evaluacion",
    } for student_id in estudiante_ids if student_id not in latest_by_student]
    deliveries = [latest_by_student[item] for item in estudiante_ids if item in latest_by_student]
    return deliveries, missing


async def _existing_grade(db: AsyncSession, entrega_id: UUID) -> Calificacion | None:
    return await db.scalar(select(Calificacion).where(Calificacion.entrega_id == entrega_id))


async def _grade_delivery(
    db: AsyncSession,
    *,
    evaluacion: Evaluacion,
    entrega: Entrega,
    profesor_id: UUID,
) -> tuple[Calificacion, bool]:
    existing = await _existing_grade(db, entrega.id)
    if existing:
        expected_state = (
            EntregaEstado.REQUIERE_REINTENTO.value
            if getattr(existing, "nota_sugerida", 0) is None
            else EntregaEstado.CALIFICADA.value
        )
        if entrega.estado != expected_state:
            entrega.estado = expected_state
            await db.commit()
        return existing, False

    entrega.estado = EntregaEstado.PROCESANDO.value
    await db.commit()
    submission = await _load_submission(entrega)
    grading = await grade_submission(
        db,
        evaluacion_id=evaluacion.id,
        materia_id=evaluacion.materia_id,
        blueprint=evaluation_to_grading_blueprint(evaluacion),
        student_response_text=submission["student_response_text"],
        image_bytes=submission["image_bytes"],
        image_mime=submission["image_mime"],
        user_id=profesor_id,
    )
    if grading.nota_sugerida is not None:
        calificaciones_service.validate_score_within_evaluation(
            grading.nota_sugerida, evaluacion, "nota_sugerida",
        )
        calificaciones_service.transition_to_grading_if_needed(evaluacion)
    calificacion = photo_service.apply_grading_result(
        entrega=entrega,
        evaluacion=evaluacion,
        estudiante_id=entrega.estudiante_id,
        profesor_id=profesor_id,
        grading=grading,
    )
    db.add(calificacion)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await _existing_grade(db, entrega.id)
        if not existing:
            raise
        return existing, False
    await db.refresh(calificacion)
    return calificacion, True


async def _mark_delivery_for_retry(db: AsyncSession, entrega_id: UUID, error: str) -> None:
    await db.rollback()
    entrega = await db.scalar(select(Entrega).where(Entrega.id == entrega_id))
    if not entrega:
        return
    entrega.estado = EntregaEstado.REQUIERE_REINTENTO.value
    current = entrega.visual_text_json if isinstance(entrega.visual_text_json, dict) else {}
    entrega.visual_text_json = {
        **current,
        "batch_error": error[:500],
        "requiere_revision_docente": True,
    }
    await db.commit()


def _build_result(
    *, evaluacion_id: UUID, status_value: str, processed: int, skipped: int,
    errors: list[dict], calificacion_ids: list[str],
) -> dict:
    return {
        "status": status_value,
        "evaluacion_id": str(evaluacion_id),
        "processed": processed,
        "skipped": skipped,
        "failed": len(errors),
        "calificacion_ids": calificacion_ids,
        "errors": errors,
        "requires_teacher_review": processed + skipped,
    }


def _emit_progress(callback: ProgressCallback | None, progreso: int, result: dict) -> None:
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
        db, job_id, progreso=progreso, resultado_json=result,
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
    progress_callback: ProgressCallback | None = None,
) -> dict:
    async with AsyncSessionLocal() as db:
        processed = 0
        skipped = 0
        errors: list[dict] = []
        calificacion_ids: list[str] = []
        try:
            if job_id:
                state = await jobs_service.get_job_state(db, job_id)
                if state == JobEstado.CANCELLED.value:
                    return await _cancelled_result(
                        db, job_id=job_id, evaluacion_id=evaluacion_id, progreso=0,
                        processed=0, skipped=0, errors=[], calificacion_ids=[],
                    )
                if state in {JobEstado.SUCCESS.value, JobEstado.FAILED.value}:
                    return _build_result(
                        evaluacion_id=evaluacion_id, status_value=state,
                        processed=0, skipped=0, errors=[], calificacion_ids=[],
                    )
                if state == JobEstado.QUEUED.value:
                    await jobs_service.mark_job_running(db, job_id)
                    await db.commit()

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
                if job_id and await jobs_service.get_job_state(db, job_id) == JobEstado.CANCELLED.value:
                    progreso = round(((index - 1 + len(missing)) / total) * 100) if total else 0
                    result = await _cancelled_result(
                        db, job_id=job_id, evaluacion_id=evaluacion_id, progreso=progreso,
                        processed=processed, skipped=skipped, errors=errors,
                        calificacion_ids=calificacion_ids,
                    )
                    _emit_progress(progress_callback, progreso, result)
                    return result
                try:
                    calificacion, created = await _grade_delivery(
                        db, evaluacion=evaluacion, entrega=entrega,
                        profesor_id=effective_profesor_id,
                    )
                    calificacion_ids.append(str(calificacion.id))
                    if created:
                        processed += 1
                    else:
                        skipped += 1
                except Exception as exc:  # noqa: BLE001
                    safe_error = str(exc)[:500] or exc.__class__.__name__
                    logger.exception(
                        "Batch grading failed for delivery",
                        extra={"entrega_id": str(entrega.id), "evaluacion_id": str(evaluacion_id)},
                    )
                    await _mark_delivery_for_retry(db, entrega.id, safe_error)
                    errors.append({
                        "entrega_id": str(entrega.id),
                        "estudiante_id": str(entrega.estudiante_id),
                        "error": safe_error,
                    })

                progreso = round(((index + len(missing)) / total) * 100) if total else 100
                if job_id and await jobs_service.get_job_state(db, job_id) == JobEstado.CANCELLED.value:
                    result = await _cancelled_result(
                        db, job_id=job_id, evaluacion_id=evaluacion_id,
                        progreso=progreso, processed=processed, skipped=skipped,
                        errors=errors, calificacion_ids=calificacion_ids,
                    )
                    _emit_progress(progress_callback, progreso, result)
                    return result

                interim = _build_result(
                    evaluacion_id=evaluacion_id, status_value=JobEstado.RUNNING.value,
                    processed=processed, skipped=skipped, errors=errors,
                    calificacion_ids=calificacion_ids,
                )
                if job_id:
                    await jobs_service.update_job_progress(
                        db, job_id, progreso=progreso, resultado_json=interim,
                    )
                    await db.commit()
                _emit_progress(progress_callback, progreso, interim)

            final_state = (
                JobEstado.FAILED.value
                if errors and processed == 0 and skipped == 0
                else JobEstado.SUCCESS.value
            )
            result = _build_result(
                evaluacion_id=evaluacion_id, status_value=final_state,
                processed=processed, skipped=skipped, errors=errors,
                calificacion_ids=calificacion_ids,
            )
            if job_id:
                error_summary = f"{len(errors)} entrega(s) no pudieron calificarse" if errors else None
                finished = await jobs_service.finish_job(
                    db, job_id, estado=final_state,
                    resultado_json=result, error=error_summary,
                )
                if (
                    not finished
                    and await jobs_service.get_job_state(db, job_id) == JobEstado.CANCELLED.value
                ):
                    result = await _cancelled_result(
                        db, job_id=job_id, evaluacion_id=evaluacion_id,
                        progreso=100, processed=processed, skipped=skipped,
                        errors=errors, calificacion_ids=calificacion_ids,
                    )
                    _emit_progress(progress_callback, 100, result)
                    return result
                await db.commit()
            _emit_progress(progress_callback, 100, result)
            return result
        except Exception as exc:
            await db.rollback()
            if job_id:
                result = _build_result(
                    evaluacion_id=evaluacion_id, status_value=JobEstado.FAILED.value,
                    processed=processed, skipped=skipped,
                    errors=[*errors, {"entrega_id": None, "estudiante_id": None, "error": str(exc)[:500]}],
                    calificacion_ids=calificacion_ids,
                )
                await jobs_service.finish_job(
                    db, job_id, estado=JobEstado.FAILED.value,
                    resultado_json=result, error=str(exc),
                )
                await db.commit()
            raise


async def _run_and_dispose(**kwargs) -> dict:
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
        self.update_state(state="PROGRESS", meta={
            "progreso": progreso,
            "processed": result["processed"],
            "skipped": result["skipped"],
            "failed": result["failed"],
        })

    try:
        return asyncio.run(_run_and_dispose(
            evaluacion_id=UUID(evaluacion_id),
            estudiante_ids=[UUID(value) for value in raw_students],
            entrega_ids=[UUID(value) for value in raw_deliveries],
            job_id=UUID(job_id) if job_id else None,
            profesor_id=UUID(profesor_id) if profesor_id else None,
            progress_callback=publish,
        ))
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