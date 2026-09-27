from __future__ import annotations

import asyncio
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import aiofiles
from sqlalchemy import delete

from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal, engine
from app.modules.importacion_estudiantes.models import ImportacionEstudiantesFila, ImportacionEstudiantesLote
from app.modules.importacion_estudiantes.service import delete_private_photo_key, expire_abandoned_lotes, normalize_name
from app.modules.importacion_estudiantes.vision_service import extract_student_names
from app.modules.jobs import service as jobs_service
from app.modules.materias.service import list_students
from app.modules.materias.models import Materia
from app.services.storage_service import resolve_private_upload_path, validate_mime
from app.shared.enums import JobEstado, JobTipo
from app.workers.worker import celery_app

logger = get_logger(__name__)


async def _heartbeat(job_id: UUID, claim_token: str) -> None:
    while True:
        await asyncio.sleep(max(5, settings.AI_JOB_HEARTBEAT_SECONDS))
        async with AsyncSessionLocal() as db:
            alive = await jobs_service.heartbeat_job(db, job_id, claim_token=claim_token, stage="roster_extraction")
            await db.commit()
        if not alive:
            return


async def _run(job_id: UUID, lote_id: UUID) -> dict:
    claim_token = uuid4().hex
    heartbeat_task: asyncio.Task | None = None
    async with AsyncSessionLocal() as db:
        claimed = await jobs_service.claim_job_running(db, job_id, claim_token=claim_token)
        await db.commit()
        if not claimed:
            return {"status": "duplicate"}
        heartbeat_task = asyncio.create_task(_heartbeat(job_id, claim_token))
        lote = await db.get(ImportacionEstudiantesLote, lote_id)
        if lote and lote.estado == "cancelado":
            await jobs_service.finish_cancelled_job(db, job_id, progreso=0, resultado_json={"status": "cancelled"})
            await db.commit()
            return {"status": "cancelled"}
        if not lote or not lote.archivo_key:
            await jobs_service.finish_job(db, job_id, estado=JobEstado.FAILED.value, resultado_json={"claim_token": claim_token}, error="La fotografía temporal no está disponible")
            await db.commit()
            return {"status": "failed"}
        try:
            await jobs_service.update_job_progress(db, job_id, progreso=15, resultado_json={"claim_token": claim_token, "stage": "reading"})
            await db.commit()
            path = resolve_private_upload_path(lote.archivo_key)
            async with aiofiles.open(path, "rb") as source:
                content = await source.read()
            mime = validate_mime(content, lote.archivo_nombre)
            job_input = await jobs_service.get_job_input(db, job_id)
            candidates = await extract_student_names(image_bytes=content, mime=mime, teacher_id=lote.creado_por, ai_config=dict(job_input.get("_ai_config") or {}), db=db)
            await db.refresh(lote)
            if await jobs_service.get_job_state(db, job_id) == JobEstado.CANCELLED.value or lote.estado == "cancelado":
                await jobs_service.finish_cancelled_job(db, job_id, progreso=50, resultado_json={"status": "cancelled"})
                await db.commit()
                return {"status": "cancelled"}
            await jobs_service.update_job_progress(db, job_id, progreso=75, resultado_json={"claim_token": claim_token, "stage": "review_draft"})
            materia = await db.get(Materia, lote.materia_id)
            if not materia:
                raise ValueError("La materia ya no existe")
            current_names = {normalize_name(user.nombre) for user in await list_students(db, materia)}
            counts: dict[str, int] = {}
            for candidate in candidates:
                key = normalize_name(candidate["nombre"])
                counts[key] = counts.get(key, 0) + 1
            await db.execute(delete(ImportacionEstudiantesFila).where(ImportacionEstudiantesFila.lote_id == lote.id))
            for index, candidate in enumerate(candidates, start=1):
                key = normalize_name(candidate["nombre"])
                warnings = list(candidate["advertencias"])
                review = bool(candidate["requiere_revision"])
                if counts[key] > 1:
                    warnings.append("Nombre repetido dentro de la fotografía.")
                    review = True
                if key in current_names:
                    warnings.append("Ya existe un estudiante con este nombre en la materia; selecciona su cuenta o excluye la fila.")
                    review = True
                db.add(ImportacionEstudiantesFila(lote_id=lote.id, orden=index, nombre_detectado=candidate["nombre"], nombre_revisado=candidate["nombre"], confianza=candidate["confianza"], requiere_revision=review, decision="crear", advertencias=warnings))
            lote.estado = "revision"
            lote.resultado_json = {"detectados": len(candidates), "requieren_revision": sum(1 for value in candidates if value["requiere_revision"])}
            await jobs_service.finish_job(db, job_id, estado=JobEstado.SUCCESS.value, resultado_json={"claim_token": claim_token, "lote_id": str(lote.id), "detectados": len(candidates)})
            await db.commit()
            return {"status": "success", "detectados": len(candidates)}
        except Exception as exc:  # noqa: BLE001
            await db.rollback()
            lote = await db.get(ImportacionEstudiantesLote, lote_id)
            if lote and lote.estado == "cancelado":
                await jobs_service.finish_cancelled_job(db, job_id, progreso=0, resultado_json={"status": "cancelled"})
                await db.commit()
                return {"status": "cancelled"}
            key = lote.archivo_key if lote else None
            if lote:
                lote.estado = "error"
                lote.archivo_key = None
                lote.resultado_json = {"mensaje": "No fue posible leer la lista. Toma otra foto para intentarlo de nuevo."}
            logger.warning("Roster extraction failed: %s", type(exc).__name__, extra={"job_id": str(job_id)})
            await jobs_service.finish_job(db, job_id, estado=JobEstado.REQUIRES_REVIEW.value, resultado_json={"claim_token": claim_token, "terminal_reason": "roster_extraction_failed"}, error="No fue posible leer la fotografía")
            await db.commit()
            if key:
                delete_private_photo_key(key)
            return {"status": "failed"}
        finally:
            if heartbeat_task:
                heartbeat_task.cancel()
                with suppress(asyncio.CancelledError):
                    await heartbeat_task


@celery_app.task(name="tasks.extract_roster_import", bind=True, acks_late=True)
def extract_roster_import(self, *, job_id: str, lote_id: str) -> dict:
    async def run_and_dispose():
        await engine.dispose(close=False)
        try:
            return await _run(UUID(job_id), UUID(lote_id))
        finally:
            await engine.dispose()
    return asyncio.run(run_and_dispose())


async def _claim_stale() -> tuple[list[dict], int]:
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            exhausted = await jobs_service.fail_exhausted_jobs(db, tipo=JobTipo.IMPORTACION_ESTUDIANTES.value, limit=settings.AI_JOB_RECOVERY_BATCH_SIZE)
            rows = await jobs_service.claim_recoverable_jobs(db, tipo=JobTipo.IMPORTACION_ESTUDIANTES.value, queued_seconds=settings.AI_JOB_QUEUED_RECOVERY_SECONDS, limit=settings.AI_JOB_RECOVERY_BATCH_SIZE)
            await db.commit()
            return rows, len(exhausted)
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.recover_stale_roster_import_jobs")
def recover_stale_roster_import_jobs() -> dict:
    rows, exhausted = asyncio.run(_claim_stale())
    recovered = sum(1 for row in rows if jobs_service.dispatch_persisted_job(row))
    return {"selected": len(rows), "recovered": recovered, "exhausted": exhausted}


@celery_app.task(name="tasks.cleanup_expired_roster_imports")
def cleanup_expired_roster_imports() -> dict:
    async def cleanup() -> list[str]:
        await engine.dispose(close=False)
        try:
            async with AsyncSessionLocal() as db:
                cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=7)
                keys = await expire_abandoned_lotes(db, cutoff)
                await db.commit()
                return keys
        finally:
            await engine.dispose()

    keys = asyncio.run(cleanup())
    for key in keys:
        delete_private_photo_key(key)
    return {"expired": len(keys)}
