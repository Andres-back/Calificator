"""Digitalización persistente de evaluaciones en segundo plano."""
from __future__ import annotations

import asyncio
from decimal import Decimal
from uuid import UUID

import aiofiles

from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal, engine
from app.modules.evaluaciones import service as evaluaciones_service
from app.modules.evaluaciones.digitalize_service import (
    detectar_estructura_evaluacion,
    detect_digitalization_mime,
    extract_evaluation_text,
)
from app.modules.evaluaciones.schemas import DigitalizarEvaluacionExternaRequest
from app.modules.jobs import service as jobs_service
from app.modules.users.models import User
from app.services.storage_service import resolve_private_upload_path
from app.shared.enums import EvaluacionModalidad, JobEstado
from app.workers.worker import celery_app

logger = get_logger(__name__)


async def _cancel_if_requested(db, job_id: UUID, result: dict) -> bool:
    if await jobs_service.get_job_state(db, job_id) != JobEstado.CANCELLED.value:
        return False
    await jobs_service.finish_cancelled_job(
        db,
        job_id,
        progreso=int(result.get("progreso", 0)),
        resultado_json={**result, "status": JobEstado.CANCELLED.value},
    )
    await db.commit()
    return True


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
) -> dict:
    private_path = resolve_private_upload_path(file_key)
    async with AsyncSessionLocal() as db:
        result: dict = {
            "status": JobEstado.RUNNING.value,
            "materia_id": str(materia_id),
            "nombre": nombre,
            "progreso": 5,
        }
        try:
            state = await jobs_service.get_job_state(db, job_id)
            if state == JobEstado.CANCELLED.value:
                await jobs_service.finish_cancelled_job(
                    db, job_id, progreso=0, resultado_json={
                        **result, "status": JobEstado.CANCELLED.value,
                    },
                )
                await db.commit()
                return {**result, "status": JobEstado.CANCELLED.value}
            if state in {JobEstado.SUCCESS.value, JobEstado.FAILED.value}:
                return {**result, "status": state}

            await jobs_service.mark_job_running(db, job_id)
            await db.commit()
            user = await db.get(User, user_id)
            if not user:
                raise ValueError("El profesor que inició la digitalización ya no existe")

            async with aiofiles.open(private_path, "rb") as source:
                content = await source.read()
            mime = detect_digitalization_mime(content, filename)
            result["progreso"] = 15
            await jobs_service.update_job_progress(
                db, job_id, progreso=15, resultado_json=result,
            )
            await db.commit()
            if await _cancel_if_requested(db, job_id, result):
                return {**result, "status": JobEstado.CANCELLED.value}

            extracted_text, warnings = await extract_evaluation_text(
                content, mime, filename or nombre,
            )
            result["progreso"] = 50
            await jobs_service.update_job_progress(
                db, job_id, progreso=50, resultado_json=result,
            )
            await db.commit()
            if await _cancel_if_requested(db, job_id, result):
                return {**result, "status": JobEstado.CANCELLED.value}

            score = Decimal(nota_maxima)
            structure = await detectar_estructura_evaluacion(
                user_id=user_id,
                contenido_texto=extracted_text,
                nota_maxima=score,
                initial_warnings=warnings,
            )
            result["progreso"] = 80
            await jobs_service.update_job_progress(
                db, job_id, progreso=80, resultado_json=result,
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
            evaluation = await evaluaciones_service.digitalize_external_evaluation(
                db, payload, user,
            )
            result = {
                "status": JobEstado.SUCCESS.value,
                "evaluacion_id": str(evaluation.id),
                "materia_id": str(evaluation.materia_id),
                "nombre": evaluation.nombre,
                "preguntas_count": len(structure.get("preguntas", [])),
                "respuestas_count": len(structure.get("respuestas_esperadas", [])),
                "advertencias": structure.get("advertencias", []),
                "progreso": 100,
            }
            await jobs_service.finish_job(
                db,
                job_id,
                estado=JobEstado.SUCCESS.value,
                resultado_json=result,
            )
            await db.commit()
            return result
        except Exception as exc:
            await db.rollback()
            failure = {
                **result,
                "status": JobEstado.FAILED.value,
                "progreso": 100,
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
            try:
                private_path.unlink(missing_ok=True)
            except OSError:
                logger.warning(
                    "No se pudo eliminar el archivo temporal de digitalización",
                    extra={"file_key": file_key},
                    exc_info=True,
                )


async def _run_and_dispose(**kwargs) -> dict:
    try:
        return await _digitalize_async(**kwargs)
    finally:
        await engine.dispose()


@celery_app.task(bind=True, name="tasks.digitalize_evaluation")
def digitalize_evaluation(self, **kwargs) -> dict:
    try:
        self.update_state(state="PROGRESS", meta={"progreso": 5})
        result = asyncio.run(_run_and_dispose(
            job_id=UUID(kwargs["job_id"]),
            user_id=UUID(kwargs["user_id"]),
            materia_id=UUID(kwargs["materia_id"]),
            file_key=kwargs["file_key"],
            filename=kwargs["filename"],
            nombre=kwargs["nombre"],
            descripcion=kwargs.get("descripcion"),
            nota_maxima=kwargs["nota_maxima"],
            modalidad=kwargs["modalidad"],
        ))
        self.update_state(
            state="PROGRESS",
            meta={"progreso": int(result.get("progreso", 100))},
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