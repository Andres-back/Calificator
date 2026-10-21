"""Digitalización persistente de evaluaciones en segundo plano."""

from __future__ import annotations

import asyncio
import hashlib
import json
import time
from contextlib import suppress
from decimal import Decimal
from uuid import UUID

import aiofiles
import httpx
from sqlalchemy import text

from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal, engine
from app.modules.evaluaciones import service as evaluaciones_service
from app.modules.evaluaciones.digitalize_service import (
    detectar_estructura_evaluacion,
    detect_digitalization_mime,
    extract_evaluation_text,
)
from app.modules.evaluaciones.schemas import DigitalizarEvaluacionExternaRequest
from app.modules.evaluaciones.document_visual_extractor import DocumentRendererUnavailable, EXTRACTOR_VERSION
from app.modules.evaluaciones.visual_import_service import prepare_visual_import, read_visual_import
from app.modules.materias.service import ensure_can_manage_materia
from app.modules.jobs import service as jobs_service
from app.modules.users.models import User
from app.services.storage_service import resolve_private_upload_path
from app.shared.enums import EvaluacionModalidad, JobEstado, JobTipo
from app.workers.worker import celery_app

logger = get_logger(__name__)


def _is_transient_error(exc: Exception) -> bool:
    if isinstance(exc, (TimeoutError, httpx.TimeoutException, httpx.TransportError, DocumentRendererUnavailable)):
        return True
    value = str(exc).lower()
    return any(marker in value for marker in (
        "timeout", "tempor", "provider", "429", "500", "502", "503", "504",
        "connection", "unavailable",
    ))


async def _extract_once(
    *,
    result: dict,
    content: bytes,
    mime: str,
    filename: str,
    user_id: UUID,
    ai_config: dict | None,
) -> tuple[str, list[str], bool]:
    cached = result.get("normalized_extraction")
    if isinstance(cached, dict) and isinstance(cached.get("text"), str):
        warnings = cached.get("warnings")
        return (
            cached["text"],
            [str(item) for item in warnings] if isinstance(warnings, list) else [],
            True,
        )
    extracted_text, warnings = await extract_evaluation_text(
        content,
        mime,
        filename,
        user_id,
        ai_config=ai_config,
    )
    result["normalized_extraction"] = {
        "text": extracted_text,
        "warnings": list(warnings),
    }
    return extracted_text, list(warnings), False


async def _cancel_if_requested(db, job_id: UUID, result: dict) -> bool:
    if await jobs_service.get_job_state(db, job_id) != JobEstado.CANCELLED.value:
        return False
    result["status"] = JobEstado.CANCELLED.value
    await jobs_service.finish_cancelled_job(
        db,
        job_id,
        progreso=int(result.get("progreso", 0)),
        resultado_json={**result, "status": JobEstado.CANCELLED.value},
    )
    await db.commit()
    return True


async def _digitalize_visual_owned(*, db, user, job_id, materia_id, private_path, nombre,
                                  descripcion, score, modalidad, ai_config, result, timings_ms, refresh_total):
    """Called after claiming the job. Every durable checkpoint checks the lease."""
    subject = await ensure_can_manage_materia(db, materia_id, user)
    claim_token = result["claim_token"]

    async def persist_result(extra):
        candidate = {**result, **extra}
        await jobs_service.lock_owned_job(db, job_id, claim_token)
        updated = await jobs_service.update_job_progress(db, job_id,
            progreso=int(candidate.get("progreso", 15)), resultado_json=candidate)
        if not updated:
            raise jobs_service.JobOwnershipLost("El trabajo cambió mientras guardábamos el avance")
        await db.commit()
        # Do not retain references to rolled-back resources after a failed commit.
        result.update(extra)

    async def checkpoint(value):
        await persist_result({"_visual_checkpoint": value})

    await persist_result({"progreso": 15, "stage": "reading"})
    content = None
    saved = result.get("_visual_checkpoint")
    if saved is None:
        try:
            async with aiofiles.open(private_path, "rb") as source:
                content = await source.read(20 * 1024 * 1024 + 1)
        except OSError:
            # Never expose a private storage path in the teacher's job error.
            raise ValueError("No encontramos el archivo temporal y todavía no hay un original guardado. Vuelve a subir el documento.") from None
    started = time.monotonic()
    saved = await prepare_visual_import(db, job_id=job_id, owner_id=subject.profesor_id, materia_id=materia_id,
        content=content, checkpoint=saved, persist=checkpoint)
    extracted_text, manifest = await read_visual_import(db, saved, user_id=user.id, ai_config=ai_config, persist=checkpoint)
    timings_ms["extraction"] = int((time.monotonic() - started) * 1000)
    refresh_total()
    await persist_result({"progreso": 50, "stage": "structuring"})
    # Separate from legacy normalized_extraction: cache is bound to full visual
    # context, extractor version and captured configuration, never text alone.
    structure_key = hashlib.sha256(json.dumps({"extractor": EXTRACTOR_VERSION, "text": extracted_text,
        "visual": manifest.model_dump(mode="json"), "ai_config": ai_config}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    cached = result.get("_visual_structure")
    if isinstance(cached, dict) and result.get("_visual_structure_key") == structure_key:
        structure = cached
    else:
        started = time.monotonic()
        structure = await detectar_estructura_evaluacion(user_id=user.id, contenido_texto=extracted_text,
            nota_maxima=score, ai_config=ai_config, contenido_visual=manifest, visual_scope_id=job_id)
        timings_ms["structure"] = int((time.monotonic() - started) * 1000)
        refresh_total()
        await persist_result({"_visual_structure": structure, "_visual_structure_key": structure_key})
    await persist_result({"progreso": 80, "stage": "saving"})
    payload = DigitalizarEvaluacionExternaRequest(materia_id=materia_id, nombre=nombre, descripcion=descripcion,
        nota_maxima=score, modalidad=EvaluacionModalidad(modalidad), criterios=structure.get("criterios", []), estructura_detectada=structure)
    # The row lock serializes finalization with recovery/cancel/another delivery
    # of this same job. Evaluation, resources, revision and terminal job share
    # one transaction: there is no committed evaluation without its result ID.
    await jobs_service.lock_owned_job(db, job_id, claim_token)
    started = time.monotonic()
    evaluation = await evaluaciones_service.digitalize_external_evaluation(db, payload, user, commit=False)
    timings_ms["persistence"] = int((time.monotonic() - started) * 1000)
    refresh_total()
    needs_review = manifest.cobertura.estado != "completa" or not structure.get("clave_completa")
    state = JobEstado.REQUIRES_REVIEW.value if needs_review else JobEstado.SUCCESS.value
    output = {**result, "status": state, "evaluacion_id": str(evaluation.id), "materia_id": str(evaluation.materia_id),
        "contenido_version_id": str(evaluation.contenido_version_id), "nombre": evaluation.nombre,
        "preguntas_count": len(structure.get("preguntas", [])), "respuestas_count": len(structure.get("respuestas_esperadas", [])),
        "clave_completa": bool(structure.get("clave_completa")), "claves_pendientes": structure.get("claves_pendientes", []),
        "advertencias": structure.get("advertencias", []), "cobertura_visual": manifest.cobertura.estado,
        "progreso": 100, "stage": "review_required" if needs_review else "completed",
        "terminal_reason": "visual_review_required" if needs_review else "success", "timings_ms": timings_ms}
    finished = await jobs_service.finish_job(db, job_id, estado=state, resultado_json=output)
    if not finished:
        raise jobs_service.JobOwnershipLost("El trabajo cambió antes de confirmar el borrador")
    await db.commit()
    result.update(output)
    result["_visual_saved"] = True
    return result


async def _digitalize_async(
    *,
    job_id: UUID,
    user_id: UUID,
    materia_id: UUID,
    file_key: str,
    filename: str,
    nombre: str,
    descripcion: str | None,
    nota_maxima: str,
    modalidad: str,
    claim_token: str,
) -> dict:
    private_path = resolve_private_upload_path(file_key)
    pipeline_started = time.monotonic()
    timings_ms = {
        "queue": 0, "prepare": 0, "extraction": 0, "structure": 0,
        "primary": 0, "secondary": 0, "consolidation": 0,
        "persistence": 0, "total": 0,
    }

    def refresh_total() -> None:
        timings_ms["total"] = max(0, int((time.monotonic() - pipeline_started) * 1000))

    heartbeat_task: asyncio.Task | None = None
    async with AsyncSessionLocal() as db:
        result: dict = {
            "status": JobEstado.RUNNING.value,
            "materia_id": str(materia_id),
            "nombre": nombre,
            "progreso": 5,
            "stage": "queued",
            "pipeline_run_id": str(job_id),
            "timings_ms": timings_ms,
            "strategy": {"vision_reads": 1, "text_structuring": True},
            "fallbacks": [],
            "terminal_reason": None,
            "deadline_ms": None,
            "slow_after_ms": int(settings.DIGITALIZATION_SLOW_WARNING_SECONDS) * 1000,
            "claim_token": claim_token,
        }
        timings_ms["queue"] = await jobs_service.get_job_queue_time_ms(db, job_id)
        job_input = await jobs_service.get_job_input(db, job_id)
        persisted_result = await jobs_service.get_job_result(db, job_id)
        visual_mode = job_input.get("_visual_import_schema") == 1
        if visual_mode:
            for key in ("_visual_checkpoint", "_visual_structure", "_visual_structure_key"):
                if key in persisted_result:
                    result[key] = persisted_result[key]
        elif isinstance(persisted_result.get("normalized_extraction"), dict):
            result["normalized_extraction"] = persisted_result["normalized_extraction"]
        stored_snapshot = job_input.get("_ai_config")
        job_ai_config = stored_snapshot if isinstance(stored_snapshot, dict) else None
        try:
            state = await jobs_service.get_job_state(db, job_id)
            if state == JobEstado.CANCELLED.value:
                await jobs_service.finish_cancelled_job(
                    db,
                    job_id,
                    progreso=0,
                    resultado_json={
                        **result,
                        "status": JobEstado.CANCELLED.value,
                    },
                )
                await db.commit()
                return {**result, "status": JobEstado.CANCELLED.value}
            if state in {
                JobEstado.SUCCESS.value,
                JobEstado.FAILED.value,
                JobEstado.REQUIRES_REVIEW.value,
                JobEstado.FAILED_PERMANENT.value,
            }:
                if visual_mode and persisted_result.get("evaluacion_id"):
                    result.update(persisted_result)
                    result["_visual_saved"] = True
                    return {key: value for key, value in result.items() if not key.startswith("_") and key != "claim_token"}
                return {**result, "status": state}

            claimed = await jobs_service.claim_job_running(
                db,
                job_id,
                claim_token=claim_token,
            )
            await db.commit()
            if not claimed:
                current_state = await jobs_service.get_job_state(db, job_id)
                return {**result, "status": current_state or "duplicate"}
            heartbeat_task = asyncio.create_task(
                _keep_job_alive(job_id, claim_token)
            )
            user = await db.get(User, user_id)
            if not user:
                raise ValueError(
                    "El profesor que inició la digitalización ya no existe"
                )
            if visual_mode:
                result["strategy"] = {"visual_import_schema": 1, "text_structuring": True}
                await _digitalize_visual_owned(db=db, user=user, job_id=job_id, materia_id=materia_id,
                    private_path=private_path, nombre=nombre, descripcion=descripcion, score=Decimal(nota_maxima),
                    modalidad=modalidad, ai_config=job_ai_config, result=result, timings_ms=timings_ms, refresh_total=refresh_total)
                return {key: value for key, value in result.items() if not key.startswith("_") and key != "claim_token"}

            cached_extraction = result.get("normalized_extraction")
            content = b""
            mime = ""
            if not isinstance(cached_extraction, dict):
                prepare_started = time.monotonic()
                async with aiofiles.open(private_path, "rb") as source:
                    content = await source.read()
                mime = detect_digitalization_mime(content, filename)
                timings_ms["prepare"] = int((time.monotonic() - prepare_started) * 1000)
            refresh_total()
            result["progreso"] = 15
            result["stage"] = "reading"
            await jobs_service.update_job_progress(
                db,
                job_id,
                progreso=15,
                resultado_json=result,
            )
            await db.commit()
            if await _cancel_if_requested(db, job_id, result):
                return {**result, "status": JobEstado.CANCELLED.value}

            extraction_started = time.monotonic()
            extracted_text, warnings, reused_extraction = await _extract_once(
                result=result,
                content=content,
                mime=mime,
                filename=filename or nombre,
                user_id=user_id,
                ai_config=job_ai_config,
            )
            timings_ms["extraction"] = int((time.monotonic() - extraction_started) * 1000)
            result["strategy"]["extraction_reused"] = reused_extraction
            refresh_total()
            result["progreso"] = 50
            result["stage"] = "structuring"
            await jobs_service.update_job_progress(
                db,
                job_id,
                progreso=50,
                resultado_json=result,
            )
            await db.commit()
            if await _cancel_if_requested(db, job_id, result):
                return {**result, "status": JobEstado.CANCELLED.value}

            score = Decimal(nota_maxima)
            structure_started = time.monotonic()
            structure = await detectar_estructura_evaluacion(
                user_id=user_id,
                contenido_texto=extracted_text,
                nota_maxima=score,
                initial_warnings=warnings,
                ai_config=job_ai_config,
            )
            timings_ms["structure"] = int((time.monotonic() - structure_started) * 1000)
            refresh_total()
            result["progreso"] = 80
            result["stage"] = "saving"
            await jobs_service.update_job_progress(
                db,
                job_id,
                progreso=80,
                resultado_json=result,
            )
            await db.commit()
            if await _cancel_if_requested(db, job_id, result):
                return {**result, "status": JobEstado.CANCELLED.value}

            payload = DigitalizarEvaluacionExternaRequest(
                materia_id=materia_id,
                nombre=nombre,
                descripcion=descripcion,
                nota_maxima=score,
                modalidad=EvaluacionModalidad(modalidad),
                criterios=structure.get("criterios", []),
                estructura_detectada=structure,
            )
            persistence_started = time.monotonic()
            evaluation = await evaluaciones_service.digitalize_external_evaluation(
                db,
                payload,
                user,
            )
            timings_ms["persistence"] = int((time.monotonic() - persistence_started) * 1000)
            refresh_total()
            result = {
                "status": JobEstado.SUCCESS.value,
                "evaluacion_id": str(evaluation.id),
                "materia_id": str(evaluation.materia_id),
                "nombre": evaluation.nombre,
                "preguntas_count": len(structure.get("preguntas", [])),
                "respuestas_count": len(structure.get("respuestas_esperadas", [])),
                "clave_completa": bool(structure.get("clave_completa")),
                "claves_pendientes": list(structure.get("claves_pendientes", [])),
                "advertencias": structure.get("advertencias", []),
                "progreso": 100,
                "stage": "completed",
                "pipeline_run_id": str(job_id),
                "timings_ms": timings_ms,
                "strategy": {"vision_reads": 1, "text_structuring": True},
                "fallbacks": [],
                "terminal_reason": "success",
                "deadline_ms": None,
                "slow_after_ms": int(settings.DIGITALIZATION_SLOW_WARNING_SECONDS) * 1000,
                "claim_token": claim_token,
            }
            await jobs_service.finish_job(
                db,
                job_id,
                estado=JobEstado.SUCCESS.value,
                resultado_json=result,
            )
            await db.commit()
            return result
        except jobs_service.JobOwnershipLost:
            await db.rollback()
            result["status"] = "superseded"
            return {"status": "superseded", "pipeline_run_id": str(job_id)}
        except Exception as exc:
            await db.rollback()
            refresh_total()
            attempt_count = int(await db.scalar(
                text(
                    "SELECT attempt_count FROM ai_jobs WHERE id=CAST(:id AS uuid)"
                ),
                {"id": str(job_id)},
            ) or 0)
            retry_delay = min(30, max(2, 2 ** max(attempt_count, 1)))
            if _is_transient_error(exc) and attempt_count < settings.AI_JOB_MAX_ATTEMPTS:
                retrying = {
                    **result,
                    "status": JobEstado.RETRYING.value,
                    "progreso": max(5, int(result.get("progreso", 5))),
                    "timings_ms": timings_ms,
                    "terminal_reason": "transient_provider_failure",
                    "attempt_count": attempt_count,
                }
                released = await jobs_service.release_job_for_retry(
                    db,
                    job_id,
                    claim_token=claim_token,
                    resultado_json=retrying,
                    error=str(exc),
                    delay_seconds=retry_delay,
                )
                await db.commit()
                if released:
                    return retrying
            failure = {
                **result,
                "status": JobEstado.FAILED.value,
                "progreso": 100,
                "timings_ms": timings_ms,
                "terminal_reason": "provider_timeout" if isinstance(exc, TimeoutError) else "processing_failed",
            }
            await jobs_service.finish_job(
                db,
                job_id,
                estado=JobEstado.FAILED.value,
                resultado_json=failure,
                error=str(exc),
            )
            await db.commit()
            raise
        finally:
            if heartbeat_task:
                heartbeat_task.cancel()
                with suppress(asyncio.CancelledError):
                    await heartbeat_task
            try:
                # New non-visual imports retain their normalized source privately
                # in the durable job, linked to the resulting evaluation. Visual
                # imports already archive it as a resource before deleting temp.
                preserve_source = job_input.get('_document_source_schema') == 113 and not visual_mode
                if (result.get('status') == JobEstado.SUCCESS.value and not preserve_source
                    or result.get('status') == JobEstado.CANCELLED.value
                    or result.get('status') == JobEstado.REQUIRES_REVIEW.value and result.get('_visual_saved')):
                    private_path.unlink(missing_ok=True)
            except OSError:
                logger.warning(
                    "No se pudo eliminar el archivo temporal de digitalización",
                    extra={"file_key": file_key},
                    exc_info=True,
                )


async def _run_and_dispose(**kwargs) -> dict:
    await engine.dispose(close=False)
    try:
        return await _digitalize_async(**kwargs)
    finally:
        await engine.dispose()


async def _keep_job_alive(job_id: UUID, claim_token: str) -> None:
    while True:
        await asyncio.sleep(max(5, settings.AI_JOB_HEARTBEAT_SECONDS))
        try:
            async with AsyncSessionLocal() as heartbeat_db:
                renewed = await jobs_service.heartbeat_job(
                    heartbeat_db,
                    job_id,
                    claim_token=claim_token,
                    stage="vision_extraction",
                )
                await heartbeat_db.commit()
            if not renewed:
                return
        except Exception:  # noqa: BLE001
            logger.warning(
                "Could not renew digitalization lease",
                extra={"job_id": str(job_id)},
                exc_info=True,
            )


async def _run_until_complete(**kwargs) -> dict:
    """Conserva una inferencia aceptada hasta respuesta o fallo real de transporte."""
    return await _run_and_dispose(**kwargs)


@celery_app.task(bind=True, name="tasks.digitalize_evaluation")
def digitalize_evaluation(self, **kwargs) -> dict:
    try:
        self.update_state(state="PROGRESS", meta={"progreso": 5})
        result = asyncio.run(
            _run_until_complete(
                job_id=UUID(kwargs["job_id"]),
                user_id=UUID(kwargs["user_id"]),
                materia_id=UUID(kwargs["materia_id"]),
                file_key=kwargs["file_key"],
                filename=kwargs["filename"],
                nombre=kwargs["nombre"],
                descripcion=kwargs.get("descripcion"),
                nota_maxima=kwargs["nota_maxima"],
                modalidad=kwargs["modalidad"],
                claim_token=str(self.request.id),
            )
        )
        self.update_state(
            state="PROGRESS",
            meta={"progreso": int(result.get("progreso", 100))},
        )
        if result.get("status") == JobEstado.RETRYING.value:
            attempt_count = int(result.get("attempt_count") or 1)
            digitalize_evaluation.apply_async(
                kwargs=kwargs,
                queue="digitalization",
                countdown=min(30, max(2, 2 ** max(attempt_count, 1))),
            )
        return result
    except Exception as exc:
        logger.exception(
            "Falló la digitalización de evaluación",
            extra={"job_id": kwargs.get("job_id")},
        )
        return {
            "status": JobEstado.FAILED.value,
            "job_id": kwargs.get("job_id"),
            "error": str(exc)[:500],
        }


async def _claim_stale_digitalizations() -> tuple[list[dict], int]:
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            exhausted = await jobs_service.fail_exhausted_jobs(
                db,
                tipo=JobTipo.EVALUACION_DIGITALIZACION.value,
                limit=settings.AI_JOB_RECOVERY_BATCH_SIZE,
            )
            rows = await jobs_service.claim_recoverable_jobs(
                db,
                tipo=JobTipo.EVALUACION_DIGITALIZACION.value,
                queued_seconds=settings.AI_JOB_QUEUED_RECOVERY_SECONDS,
                limit=settings.AI_JOB_RECOVERY_BATCH_SIZE,
            )
            await db.commit()
            return rows, len(exhausted)
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.recover_stale_digitalization_jobs")
def recover_stale_digitalization_jobs() -> dict:
    rows, exhausted = asyncio.run(_claim_stale_digitalizations())
    recovered = 0
    for row in rows:
        try:
            if jobs_service.dispatch_persisted_job(row):
                recovered += 1
        except Exception:  # noqa: BLE001
            logger.exception(
                "Could not republish stale digitalization job",
                extra={"job_id": str(row.get("id"))},
            )
    return {
        "selected": len(rows),
        "recovered": recovered,
        "exhausted": exhausted,
    }
