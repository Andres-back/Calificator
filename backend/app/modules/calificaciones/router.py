from __future__ import annotations

import json
from copy import copy
import mimetypes
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, is_student_enrolled, require_role
from app.db.session import get_db
from app.modules.calificaciones import photo_service, service
from app.modules.calificaciones.models import Calificacion, Entrega, SalonSesion
from app.modules.calificaciones.salon_mode_service import (
    create_sesion_id,
    get_sesion_summary,
    init_sesion_estudiantes,
    update_estudiante_estado,
)
from app.modules.calificaciones.schemas import (
    AjustarNota,
    BatchAjustarRequest,
    BatchConfirmRequest,
    BatchResult,
    CalificacionDetalleRead,
    CalificacionRead,
    ConfirmarNota,
    EntregaOnlineCreate,
    EntregaRead,
    IncidenciaCreate,
    IncidenciaRead,
    LoteAsincronoRead,
    ResolverIncidencia,
    ReemplazoEvidenciaCreate,
    SalonEstudianteRead,
    SalonEstudianteUpdate,
    SalonResumen,
    SalonSesionRead,
    ResumenAcademico,
    SolicitudRevisionCreate,
)
from app.modules.evaluaciones import service as evaluaciones_service
from app.modules.evaluaciones.modality_service import (
    normalize_question_modalities,
    question_numbers_by_section,
)
from app.modules.jobs import service as jobs_service
from app.modules.materias import service as materias_service
from app.modules.users.models import User
from app.services.evidence_bundle_service import (
    EvidenceBundle,
    EvidenceBundleError,
    build_evidence_bundle,
)
from app.services.storage_service import (
    read_upload_limited,
    resolve_upload_path,
    save_upload,
    validate_mime,
)
from app.shared.enums import (
    CalificacionEstado, EntregaEstado, EntregaTipo, EvaluacionModalidad,
    JobEstado, JobTipo, UserRole,
)
from app.workers.tasks_grading import grade_batch

router = APIRouter(tags=["calificaciones"])
MAX_ASYNC_BATCH_FILES = 50
MAX_ASYNC_BATCH_BYTES = 100 * 1024 * 1024
MAX_EVIDENCE_BYTES = 15 * 1024 * 1024
MAX_EVIDENCE_TOTAL_BYTES = 40 * 1024 * 1024


def _parse_evidence_rotations(raw: object) -> list[int] | None:
    if not isinstance(raw, str) or not raw.strip():
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La información de rotación no es válida",
        ) from exc
    if not isinstance(parsed, list) or any(
        not isinstance(value, int) for value in parsed
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La información de rotación no es válida",
        )
    return parsed


def _evidence_bundle_metadata(
    evaluacion: object,
    entrega: Entrega,
    bundle: EvidenceBundle,
) -> dict:
    document = dict(bundle.metadata)
    if getattr(evaluacion, "modalidad", None) == EvaluacionModalidad.MIXTA.value:
        metadata = _mixed_evidence_metadata(evaluacion, entrega)
        metadata["documento"] = document
        return metadata
    return {
        "modalidad": getattr(evaluacion, "modalidad", EvaluacionModalidad.FISICA.value),
        **document,
    }


def _delete_replaced_evidence(public_url: str | None) -> None:
    if not public_url:
        return
    try:
        resolve_upload_path(public_url).unlink(missing_ok=True)
    except (OSError, ValueError):
        pass

def _evidence_url(entrega: Entrega | None) -> str | None:
    if not entrega or not entrega.archivo_url:
        return None
    return f"/api/calificaciones/entregas/{entrega.id}/evidencia"


def _entrega_read(entrega: Entrega) -> Entrega:
    """Devuelve una copia serializable sin exponer la ruta persistida interna."""
    safe_entrega = copy(entrega)
    safe_entrega.archivo_url = _evidence_url(entrega)
    return safe_entrega


def _mixed_evidence_metadata(evaluacion: object, entrega: Entrega) -> dict:
    questions = normalize_question_modalities(
        getattr(evaluacion, "preguntas", []),
        getattr(evaluacion, "modalidad", None),
    )
    sections = question_numbers_by_section(questions)
    return {
        "modalidad": EvaluacionModalidad.MIXTA.value,
        "entrega_id": str(entrega.id),
        "secciones": {
            "online": {
                "preguntas": sections["online"],
                "respuesta_guardada": bool(entrega.respuesta_texto),
            },
            "fisica": {
                "preguntas": sections["fisica"],
                "archivo_url": entrega.archivo_url,
            },
        },
    }


async def _enqueue_persisted_grading(
    db: AsyncSession,
    *,
    evaluacion: object,
    entrega: Entrega,
    estudiante_id: UUID,
    profesor_id: UUID,
    evidence_metadata: dict | None = None,
    calificacion: Calificacion | None = None,
) -> Calificacion:
    """Crea un trabajo persistente y devuelve sin esperar a los modelos."""
    job_id = await jobs_service.create_job(
        db,
        user_id=profesor_id,
        tipo=JobTipo.CALIFICACION_LOTE.value,
        input_json={
            "evaluacion_id": str(evaluacion.id),
            "entrega_ids": [str(entrega.id)],
            "estudiante_ids": [str(estudiante_id)],
            "modalidad": "vision",
        },
    )
    queued_grade = photo_service.prepare_queued_grading(
        entrega=entrega,
        evaluacion=evaluacion,
        estudiante_id=estudiante_id,
        profesor_id=profesor_id,
        job_id=job_id,
        evidence_metadata=evidence_metadata,
        calificacion=calificacion,
    )
    if calificacion is None:
        db.add(queued_grade)
    await db.commit()
    await db.refresh(queued_grade)

    try:
        grade_batch.apply_async(kwargs={
            "evaluacion_id": str(evaluacion.id),
            "estudiante_ids": [],
            "entrega_ids": [str(entrega.id)],
            "job_id": str(job_id),
            "profesor_id": str(profesor_id),
        })
    except Exception as exc:  # noqa: BLE001
        entrega.estado = EntregaEstado.REQUIERE_REINTENTO.value
        failed_payload = {
            **(queued_grade.resultado_json or {}),
            "pipeline_status": "failed",
            "error_type": "queue_unavailable",
        }
        entrega.visual_text_json = failed_payload
        queued_grade.resultado_json = failed_payload
        await jobs_service.finish_job(
            db,
            job_id,
            estado=JobEstado.FAILED.value,
            resultado_json={"entrega_ids": [str(entrega.id)]},
            error=str(exc),
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "La evidencia quedó guardada, pero la cola no está disponible. "
                "Puedes reintentar sin subir el archivo nuevamente."
            ),
        ) from exc
    return queued_grade

@router.post("/calificaciones/foto", response_model=CalificacionRead, status_code=status.HTTP_202_ACCEPTED)
async def calificar_foto(
    evaluacion_id: UUID = Form(...),
    estudiante_id: UUID = Form(...),
    foto: list[UploadFile] = File(...),
    rotaciones: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    evaluacion = await evaluaciones_service.ensure_can_manage_evaluation(
        db, evaluacion_id, current_user
    )
    service.ensure_evaluation_accepts_grading(evaluacion)
    if getattr(evaluacion, "modalidad", None) == EvaluacionModalidad.ONLINE.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta evaluacion es online y debe calificarse desde la entrega digital.",
        )
    if not await is_student_enrolled(db, evaluacion.materia_id, estudiante_id):
        raise HTTPException(
            status_code=403,
            detail="El estudiante no esta matriculado en esta materia",
        )

    try:
        bundle = await build_evidence_bundle(
            foto,
            rotations=_parse_evidence_rotations(rotaciones),
        )
    except EvidenceBundleError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    existing_calificacion: Calificacion | None = None
    if getattr(evaluacion, "modalidad", None) == EvaluacionModalidad.MIXTA.value:
        entrega = await db.scalar(
            select(Entrega)
            .where(
                Entrega.evaluacion_id == evaluacion.id,
                Entrega.estudiante_id == estudiante_id,
                Entrega.tipo.in_([EntregaTipo.ONLINE.value, EntregaTipo.MIXTA.value]),
                Entrega.respuesta_texto.is_not(None),
            )
            .order_by(Entrega.created_at.desc())
            .limit(1)
        )
        if not entrega:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Primero debe guardarse la parte online de esta evaluacion mixta. "
                    "Despues carga la evidencia fisica."
                ),
            )
        existing_calificacion = await db.scalar(
            select(Calificacion).where(Calificacion.entrega_id == entrega.id)
        )
    else:
        # El docente reemplaza el paquete completo sin consumir otro intento.
        entrega = await db.scalar(
            select(Entrega)
            .where(
                Entrega.evaluacion_id == evaluacion.id,
                Entrega.estudiante_id == estudiante_id,
            )
            .order_by(Entrega.created_at.desc())
            .limit(1)
        )
        if entrega:
            existing_calificacion = await db.scalar(
                select(Calificacion).where(Calificacion.entrega_id == entrega.id)
            )
            entrega.respuesta_texto = None
        else:
            entrega = Entrega(
                evaluacion_id=evaluacion.id,
                estudiante_id=estudiante_id,
                materia_id=evaluacion.materia_id,
                visual_text_json={},
            )
            db.add(entrega)

    previous_url = entrega.archivo_url
    new_url = await save_upload(
        bundle.content,
        bundle.filename,
        subfolder="entregas",
        max_size_bytes=MAX_EVIDENCE_TOTAL_BYTES,
    )
    entrega.archivo_url = new_url
    entrega.tipo = (
        EntregaTipo.MIXTA.value
        if getattr(evaluacion, "modalidad", None) == EvaluacionModalidad.MIXTA.value
        else EntregaTipo.PDF.value
        if bundle.mime == "application/pdf"
        else EntregaTipo.FOTO.value
    )
    entrega.estado = EntregaEstado.RECIBIDA.value
    entrega.visual_text_json = {}
    try:
        await db.flush()
        evidence_metadata = _evidence_bundle_metadata(evaluacion, entrega, bundle)
    except Exception:
        await db.rollback()
        _delete_replaced_evidence(new_url)
        raise

    try:
        result = await _enqueue_persisted_grading(
            db,
            evaluacion=evaluacion,
            entrega=entrega,
            estudiante_id=estudiante_id,
            profesor_id=current_user.id,
            evidence_metadata=evidence_metadata,
            calificacion=existing_calificacion,
        )
    except HTTPException as exc:
        if exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
            _delete_replaced_evidence(previous_url)
        else:
            await db.rollback()
            _delete_replaced_evidence(new_url)
        raise
    except Exception:
        await db.rollback()
        _delete_replaced_evidence(new_url)
        raise

    _delete_replaced_evidence(previous_url)
    return result

@router.post(
    "/calificaciones/{calificacion_id}/reintentar-foto",
    response_model=CalificacionRead,
)
async def reintentar_calificacion_foto(
    calificacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    calificacion = await service.get_calificacion_or_404(
        db,
        calificacion_id,
    )
    evaluacion = await evaluaciones_service.ensure_can_manage_evaluation(
        db,
        calificacion.evaluacion_id,
        current_user,
    )
    service.ensure_evaluation_active(evaluacion)

    entrega = calificacion.entrega
    if not entrega or not entrega.archivo_url:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La calificacion no tiene una fotografia guardada para reintentar.",
        )
    if calificacion.revisado_por_docente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La calificacion ya tiene una decision docente y no puede reprocesarse.",
        )
    if entrega.estado != EntregaEstado.REQUIERE_REINTENTO.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La entrega no requiere un reintento tecnico.",
        )

    try:
        upload_path = resolve_upload_path(entrega.archivo_url)
        if not upload_path.is_file():
            raise OSError("Archivo no encontrado")
    except (OSError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La fotografia guardada no esta disponible para reprocesar.",
        ) from exc

    return await _enqueue_persisted_grading(
        db,
        evaluacion=evaluacion,
        entrega=entrega,
        estudiante_id=calificacion.estudiante_id,
        profesor_id=current_user.id,
        evidence_metadata=(
            _mixed_evidence_metadata(evaluacion, entrega)
            if entrega.tipo == EntregaTipo.MIXTA.value
            else None
        ),
        calificacion=calificacion,
    )


@router.post(
    "/calificaciones/{calificacion_id}/solicitar-reemplazo",
    response_model=EntregaRead,
)
async def solicitar_reemplazo_evidencia(
    calificacion_id: UUID,
    payload: ReemplazoEvidenciaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    """Permite al docente reabrir una entrega para reenviar el paquete completo."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    calificacion = await service.get_calificacion_or_404(db, calificacion_id)
    await evaluaciones_service.ensure_can_manage_evaluation(
        db,
        calificacion.evaluacion_id,
        current_user,
    )
    entrega = calificacion.entrega
    if not entrega or not entrega.archivo_url:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La calificacion no tiene evidencia para reemplazar.",
        )

    current_payload = (
        dict(entrega.visual_text_json)
        if isinstance(entrega.visual_text_json, dict)
        else {}
    )
    entrega.visual_text_json = {
        **current_payload,
        "pipeline_status": "replacement_requested",
        "reemplazo_solicitado": True,
        "motivo_reemplazo": payload.motivo.strip(),
    }
    entrega.estado = EntregaEstado.REQUIERE_REINTENTO.value
    calificacion.estado = CalificacionEstado.REQUIERE_REVISION.value
    calificacion.revisado_por_docente = False
    calificacion.nota_confirmada = None
    await db.commit()
    await db.refresh(entrega)
    return _entrega_read(entrega)


@router.post("/calificaciones/lote", status_code=status.HTTP_201_CREATED)
async def calificar_lote(
    evaluacion_id: UUID = Form(...),
    files: list[UploadFile] = File(...),
    estudiantes: str = Form(...),  # JSON array de UUIDs en orden
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    """Sube varias fotos de una evaluación física y las asocia a estudiantes.
    - evaluacion_id: UUID de la evaluación.
    - files: lista de archivos de imagen (mismo orden que estudiantes).
    - estudiantes: JSON array de UUIDs de estudiantes ["id1", "id2", ...].
    """
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    evaluacion = await evaluaciones_service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    service.ensure_evaluation_accepts_grading(evaluacion)

    try:
        estudiante_ids = json.loads(estudiantes)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=400, detail="'estudiantes' debe ser un JSON array de UUIDs")

    if len(files) != len(estudiante_ids):
        raise HTTPException(
            status_code=400,
            detail=f"Cantidad de archivos ({len(files)}) no coincide con estudiantes ({len(estudiante_ids)})",
        )

    # Validar que todos los estudiantes estén matriculados
    for sid in estudiante_ids:
        sid_uuid = UUID(sid) if isinstance(sid, str) else sid
        if not await is_student_enrolled(db, evaluacion.materia_id, sid_uuid):
            raise HTTPException(status_code=403, detail=f"Estudiante {sid} no está matriculado en esta materia")

        await service.ensure_student_can_submit_new_evidence(
            db, evaluacion, sid_uuid,
        )

    calificaciones_list: list[CalificacionRead] = []
    errores: list[dict] = []

    for i, foto in enumerate(files):
        sid = estudiante_ids[i]
        sid_uuid = UUID(sid) if isinstance(sid, str) else sid
        try:
            content = await read_upload_limited(foto, MAX_EVIDENCE_BYTES)
            mime = validate_mime(content, foto.filename or "image.jpg")
            archivo_url = await save_upload(
                content,
                foto.filename or f"lote_{i}.jpg",
                subfolder="entregas",
                max_size_bytes=MAX_EVIDENCE_BYTES,
            )
            entrega = Entrega(
                evaluacion_id=evaluacion.id,
                estudiante_id=sid_uuid,
                materia_id=evaluacion.materia_id,
                tipo=(
                    EntregaTipo.PDF.value
                    if mime == "application/pdf"
                    else EntregaTipo.FOTO.value
                ),
                archivo_url=archivo_url,
                estado=EntregaEstado.PROCESANDO.value,
                visual_text_json={},
            )
            db.add(entrega)
            await db.commit()
            await db.refresh(entrega)

            cal = await photo_service.grade_persisted_photo(
                db,
                evaluacion=evaluacion,
                entrega=entrega,
                estudiante_id=sid_uuid,
                profesor_id=current_user.id,
                image_bytes=content,
                image_mime=mime,
            )
            calificaciones_list.append(CalificacionRead.model_validate(cal))
        except Exception as e:
            errores.append({"estudiante_id": str(sid), "filename": foto.filename or f"lote_{i}", "error": str(e)})

    await db.commit()

    return {"calificaciones": [c.model_dump() for c in calificaciones_list], "errores": errores}


@router.post(
    "/calificaciones/lote/asincrono",
    response_model=LoteAsincronoRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def calificar_lote_asincrono(
    evaluacion_id: UUID = Form(...),
    files: list[UploadFile] = File(...),
    estudiantes: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Persist photos first, then grade them in a cancellable background job."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    evaluacion = await evaluaciones_service.ensure_can_manage_evaluation(
        db, evaluacion_id, current_user,
    )
    service.ensure_evaluation_accepts_grading(evaluacion)

    try:
        raw_student_ids = json.loads(estudiantes)
        if not isinstance(raw_student_ids, list):
            raise TypeError
        estudiante_ids = [UUID(str(value)) for value in raw_student_ids]
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'estudiantes' debe ser un JSON array de UUIDs validos",
        ) from exc

    if not files:
        raise HTTPException(status_code=400, detail="El lote debe contener al menos una foto")
    if len(files) > MAX_ASYNC_BATCH_FILES:
        raise HTTPException(
            status_code=413,
            detail=f"El lote supera el maximo de {MAX_ASYNC_BATCH_FILES} archivos",
        )
    if len(files) != len(estudiante_ids):
        raise HTTPException(
            status_code=400,
            detail=f"Cantidad de archivos ({len(files)}) no coincide con estudiantes ({len(estudiante_ids)})",
        )
    if len(set(estudiante_ids)) != len(estudiante_ids):
        raise HTTPException(
            status_code=400,
            detail="Cada estudiante puede aparecer una sola vez por lote",
        )

    for estudiante_id in estudiante_ids:
        if not await is_student_enrolled(db, evaluacion.materia_id, estudiante_id):
            raise HTTPException(
                status_code=403,
                detail=f"Estudiante {estudiante_id} no esta matriculado en esta materia",
            )

        await service.ensure_student_can_submit_new_evidence(
            db, evaluacion, estudiante_id,
        )

    prepared_files: list[tuple[bytes, str, str]] = []
    total_bytes = 0
    for index, foto in enumerate(files):
        content = await read_upload_limited(foto, MAX_EVIDENCE_BYTES)
        try:
            mime = validate_mime(content, foto.filename or "image.jpg")
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Archivo {index + 1} no es una imagen o PDF permitido",
            ) from exc
        total_bytes += len(content)
        if total_bytes > MAX_ASYNC_BATCH_BYTES:
            raise HTTPException(
                status_code=413,
                detail="El tamano total del lote supera 100 MB",
            )
        prepared_files.append((content, foto.filename or f"lote_{index}.jpg", mime))

    entregas: list[Entrega] = []
    try:
        for estudiante_id, (content, filename, mime) in zip(
            estudiante_ids, prepared_files, strict=True,
        ):
            archivo_url = await save_upload(content, filename, subfolder="entregas", max_size_bytes=MAX_EVIDENCE_BYTES)
            entrega = Entrega(
                evaluacion_id=evaluacion.id,
                estudiante_id=estudiante_id,
                materia_id=evaluacion.materia_id,
                tipo=(
                    EntregaTipo.PDF.value
                    if mime == "application/pdf"
                    else EntregaTipo.FOTO.value
                ),
                archivo_url=archivo_url,
                estado=EntregaEstado.RECIBIDA.value,
            )
            db.add(entrega)
            entregas.append(entrega)
        await db.flush()
        entrega_ids = [entrega.id for entrega in entregas]
        job_id = await jobs_service.create_job(
            db,
            user_id=current_user.id,
            tipo=JobTipo.CALIFICACION_LOTE.value,
            input_json={
                "evaluacion_id": str(evaluacion.id),
                "entrega_ids": [str(value) for value in entrega_ids],
                "estudiante_ids": [str(value) for value in estudiante_ids],
                "modalidad": "foto",
            },
        )
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    try:
        grade_batch.apply_async(kwargs={
            "evaluacion_id": str(evaluacion.id),
            "estudiante_ids": [],
            "entrega_ids": [str(value) for value in entrega_ids],
            "job_id": str(job_id),
            "profesor_id": str(current_user.id),
        })
    except Exception as exc:  # noqa: BLE001
        for entrega in entregas:
            entrega.estado = EntregaEstado.REQUIERE_REINTENTO.value
        await jobs_service.finish_job(
            db,
            job_id,
            estado=JobEstado.FAILED.value,
            resultado_json={"entrega_ids": [str(value) for value in entrega_ids]},
            error=str(exc),
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No fue posible encolar la calificacion; las entregas quedaron disponibles para reintento",
        ) from exc

    return {
        "job_id": job_id,
        "estado": JobEstado.QUEUED.value,
        "entrega_ids": entrega_ids,
    }


@router.patch("/calificaciones/{calificacion_id}/confirmar", response_model=CalificacionRead)
async def confirmar(
    calificacion_id: UUID,
    payload: ConfirmarNota,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    cal = await service.get_calificacion_or_404(db, calificacion_id)
    await evaluaciones_service.ensure_can_manage_evaluation(db, cal.evaluacion_id, current_user)
    return await service.confirmar_nota(db, cal, payload)


@router.patch("/calificaciones/{calificacion_id}/ajustar", response_model=CalificacionRead)
async def ajustar(
    calificacion_id: UUID,
    payload: AjustarNota,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    cal = await service.get_calificacion_or_404(db, calificacion_id)
    await evaluaciones_service.ensure_can_manage_evaluation(db, cal.evaluacion_id, current_user)
    return await service.ajustar_nota(db, cal, payload)


@router.get("/evaluaciones/{evaluacion_id}/calificaciones", response_model=list[CalificacionRead])
async def list_calificaciones(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    await evaluaciones_service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    return await service.list_calificaciones_for_evaluacion(db, evaluacion_id)


@router.get("/estudiantes/{estudiante_id}/resumen-academico", response_model=ResumenAcademico)
async def get_resumen_academico(
    estudiante_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if current_user.rol == UserRole.ESTUDIANTE.value:
        if current_user.id != estudiante_id:
            raise HTTPException(status_code=403, detail="No autorizado")
    elif current_user.rol != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="No autorizado")

    publicada_only = current_user.rol == UserRole.ESTUDIANTE.value
    return await service.get_resumen_academico(db, estudiante_id, publicada_only=publicada_only)


@router.get("/estudiantes/{estudiante_id}/boletin")
async def get_boletin(
    estudiante_id: UUID,
    materia_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    materia = await materias_service.get_materia_or_404(db, materia_id)
    if current_user.rol == UserRole.ADMIN.value:
        pass
    elif current_user.rol == UserRole.ESTUDIANTE.value:
        if current_user.id != estudiante_id:
            raise HTTPException(status_code=403, detail="No autorizado")
    elif current_user.rol == UserRole.PROFESOR.value:
        if materia.profesor_id != current_user.id:
            raise HTTPException(status_code=403, detail="No autorizado")
    else:
        raise HTTPException(status_code=403, detail="No autorizado")

    if not await is_student_enrolled(db, materia_id, estudiante_id):
        raise HTTPException(status_code=403, detail="El estudiante no esta matriculado en esta materia")
    publicada_only = current_user.rol == UserRole.ESTUDIANTE.value
    return await service.get_boletin(db, estudiante_id, materia_id, publicada_only=publicada_only)


# ── Modo Salón ─────────────────────────────────────────────────────────────────

@router.post("/calificaciones/modo-salon/iniciar", response_model=SalonSesionRead)
async def iniciar_salon(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    evaluacion = await evaluaciones_service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    service.ensure_evaluation_accepts_grading(evaluacion)

    sesion = await db.scalar(
        select(SalonSesion)
        .where(
            SalonSesion.evaluacion_id == evaluacion_id,
            SalonSesion.profesor_id == current_user.id,
            SalonSesion.estado == "activa",
        )
        .order_by(SalonSesion.created_at.desc())
    )
    if not sesion:
        sesion = SalonSesion(
            id=create_sesion_id(),
            evaluacion_id=evaluacion_id,
            profesor_id=current_user.id,
        )
        db.add(sesion)
        await db.flush()
        await init_sesion_estudiantes(db, sesion, evaluacion)
        await db.commit()

    _, _total, pendientes, _c, _cf, _o = await get_sesion_summary(db, sesion.id)
    return {
        "sesion_id": sesion.id,
        "evaluacion_id": evaluacion_id,
        "estudiantes_pendientes": pendientes,
        "estado": sesion.estado,
    }


@router.get("/calificaciones/modo-salon/{sesion_id}", response_model=SalonSesionRead)
async def obtener_salon(
    sesion_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    sesion = await db.scalar(select(SalonSesion).where(SalonSesion.id == sesion_id))
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    await evaluaciones_service.ensure_can_manage_evaluation(
        db, sesion.evaluacion_id, current_user,
    )
    _, _total, pendientes, _c, _cf, _o = await get_sesion_summary(db, sesion_id)
    return {
        "sesion_id": sesion.id,
        "evaluacion_id": sesion.evaluacion_id,
        "estudiantes_pendientes": pendientes,
        "estado": sesion.estado,
    }


@router.get(
    "/calificaciones/modo-salon/{sesion_id}/estudiantes",
    response_model=SalonResumen,
)
async def salon_estudiantes(
    sesion_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    sesion = await db.scalar(select(SalonSesion).where(SalonSesion.id == sesion_id))
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    await evaluaciones_service.ensure_can_manage_evaluation(
        db, sesion.evaluacion_id, current_user,
    )

    estudiantes, total, pendientes, calificados, confirmados, omitidos = await get_sesion_summary(db, sesion_id)
    return {
        "sesion_id": sesion_id,
        "evaluacion_id": sesion.evaluacion_id,
        "estudiantes": [
            SalonEstudianteRead(
                estudiante_id=e.estudiante_id,
                estado=e.estado,
                error_msg=e.error_msg,
            )
            for e in estudiantes
        ],
        "total": total,
        "pendientes": pendientes,
        "calificados": calificados,
        "confirmados": confirmados,
        "omitidos": omitidos,
    }


@router.patch(
    "/calificaciones/modo-salon/{sesion_id}/estudiantes/{estudiante_id}",
    response_model=SalonEstudianteRead,
)
async def salon_actualizar_estudiante(
    sesion_id: str,
    estudiante_id: UUID,
    payload: SalonEstudianteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    sesion = await db.scalar(select(SalonSesion).where(SalonSesion.id == sesion_id))
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if sesion.estado != "activa":
        raise HTTPException(status_code=409, detail="La sesión está cerrada")
    await evaluaciones_service.ensure_can_manage_evaluation(
        db, sesion.evaluacion_id, current_user,
    )

    sse = await update_estudiante_estado(
        db, sesion_id, estudiante_id, payload.estado, payload.error_msg,
    )
    if not sse:
        raise HTTPException(
            status_code=404,
            detail="El estudiante no está registrado en esta sesión",
        )
    await db.commit()
    return {
        "estudiante_id": sse.estudiante_id,
        "estado": sse.estado,
        "error_msg": sse.error_msg,
    }


@router.post(
    "/calificaciones/modo-salon/{sesion_id}/foto",
    response_model=CalificacionRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def salon_foto(
    sesion_id: str,
    estudiante_id: UUID = Form(...),
    foto: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    sesion = await db.scalar(select(SalonSesion).where(SalonSesion.id == sesion_id))
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")
    if sesion.estado != "activa":
        raise HTTPException(status_code=409, detail="La sesión de Modo Salón está cerrada")
    evaluacion = await evaluaciones_service.ensure_can_manage_evaluation(
        db, sesion.evaluacion_id, current_user,
    )
    service.ensure_evaluation_accepts_grading(evaluacion)
    if not await is_student_enrolled(db, evaluacion.materia_id, estudiante_id):
        raise HTTPException(status_code=403, detail="El estudiante no esta matriculado en esta materia")

    await service.ensure_student_can_submit_new_evidence(
        db,
        evaluacion,
        estudiante_id,
    )
    content = await read_upload_limited(foto, MAX_EVIDENCE_BYTES)
    mime = validate_mime(content, foto.filename or "foto.jpg")
    archivo_url = await save_upload(
        content,
        foto.filename or "foto.jpg",
        subfolder="entregas",
        max_size_bytes=MAX_EVIDENCE_BYTES,
    )
    entrega = Entrega(
        evaluacion_id=evaluacion.id,
        estudiante_id=estudiante_id,
        materia_id=evaluacion.materia_id,
        tipo=(
            EntregaTipo.PDF.value
            if mime == "application/pdf"
            else EntregaTipo.FOTO.value
        ),
        archivo_url=archivo_url,
        estado=EntregaEstado.RECIBIDA.value,
        visual_text_json={},
    )
    db.add(entrega)
    await db.flush()
    await update_estudiante_estado(
        db,
        sesion_id,
        estudiante_id,
        "fotografiado",
    )
    return await _enqueue_persisted_grading(
        db,
        evaluacion=evaluacion,
        entrega=entrega,
        estudiante_id=estudiante_id,
        profesor_id=current_user.id,
        evidence_metadata={"salon_sesion_id": sesion_id},
    )


@router.delete(
    "/calificaciones/modo-salon/{sesion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def cerrar_salon(
    sesion_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    sesion = await db.scalar(select(SalonSesion).where(SalonSesion.id == sesion_id))
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")
    await evaluaciones_service.ensure_can_manage_evaluation(
        db, sesion.evaluacion_id, current_user,
    )
    sesion.estado = "cerrada"
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Entregas ────────────────────────────────────────────────────────────────────

@router.get("/evaluaciones/{evaluacion_id}/mi-entrega", response_model=EntregaRead | None)
async def get_my_delivery(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Entrega | None:
    require_role(current_user, [UserRole.ESTUDIANTE])
    evaluacion = await evaluaciones_service.get_evaluation_or_404(db, evaluacion_id)
    if not await is_student_enrolled(db, evaluacion.materia_id, current_user.id):
        raise HTTPException(status_code=403, detail="No estas matriculado en esta materia")
    if evaluacion.estado not in evaluaciones_service.STUDENT_VISIBLE_EVALUATION_STATES:
        raise HTTPException(status_code=404, detail="Evaluacion no encontrada")
    entrega = await db.scalar(
        select(Entrega)
        .where(
            Entrega.evaluacion_id == evaluacion.id,
            Entrega.estudiante_id == current_user.id,
        )
        .order_by(Entrega.created_at.desc())
        .limit(1)
    )
    return _entrega_read(entrega) if entrega else None


@router.post("/evaluaciones/{evaluacion_id}/entregas", response_model=EntregaRead, status_code=status.HTTP_201_CREATED)
async def crear_entrega_online(
    evaluacion_id: UUID,
    payload: EntregaOnlineCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.ESTUDIANTE])
    evaluacion = await evaluaciones_service.get_evaluation_or_404(db, evaluacion_id)
    service.ensure_evaluation_accepts_grading(evaluacion)
    if evaluacion.modalidad not in {
        EvaluacionModalidad.ONLINE.value,
        EvaluacionModalidad.MIXTA.value,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Esta evaluacion es fisica y no acepta respuestas online. "
                "Entrega la evidencia al docente para calificarla por foto."
            ),
        )
    if not await is_student_enrolled(db, evaluacion.materia_id, current_user.id):
        raise HTTPException(status_code=403, detail="No estas matriculado en esta materia")

    if evaluacion.tiempo_limite_minutos and evaluacion.fecha_publicacion:
        deadline = evaluacion.fecha_publicacion.replace(tzinfo=timezone.utc) if evaluacion.fecha_publicacion.tzinfo is None else evaluacion.fecha_publicacion
        elapsed = (datetime.now(timezone.utc) - deadline).total_seconds() / 60
        if elapsed > evaluacion.tiempo_limite_minutos:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail=f"El tiempo límite de {evaluacion.tiempo_limite_minutos} minuto(s) para esta evaluación ha expirado.",
            )

    await service.ensure_student_can_submit_new_evidence(
        db, evaluacion, current_user.id,
    )

    respuesta_texto = payload.respuesta_texto

    # Persist the student's evidence before invoking any external AI provider.
    # A mixed submission waits for its physical section and is graded only once.
    mixed_submission = getattr(evaluacion, "modalidad", None) == EvaluacionModalidad.MIXTA.value
    entrega = Entrega(
        evaluacion_id=evaluacion.id,
        estudiante_id=current_user.id,
        materia_id=evaluacion.materia_id,
        tipo=EntregaTipo.MIXTA.value if mixed_submission else EntregaTipo.ONLINE.value,
        respuesta_texto=respuesta_texto,
        estado=EntregaEstado.RECIBIDA.value,
        visual_text_json={},
    )
    db.add(entrega)
    await db.commit()
    await db.refresh(entrega)

    if mixed_submission:
        entrega.visual_text_json = {
            "pipeline_status": "pending_physical_evidence",
            **_mixed_evidence_metadata(evaluacion, entrega),
        }
        await db.commit()
        await db.refresh(entrega)
        return _entrega_read(entrega)

    try:
        await _enqueue_persisted_grading(
            db,
            evaluacion=evaluacion,
            entrega=entrega,
            estudiante_id=current_user.id,
            profesor_id=evaluacion.profesor_id,
        )
    except HTTPException as exc:
        if exc.status_code != status.HTTP_503_SERVICE_UNAVAILABLE:
            raise
        # La evidencia ya fue persistida. El estudiante no debe repetir la entrega
        # por una indisponibilidad interna; el docente podrá reprocesarla.
        await db.refresh(entrega)
    return _entrega_read(entrega)

@router.post(
    "/evaluaciones/{evaluacion_id}/entregas/archivo",
    response_model=EntregaRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def crear_entrega_archivo_estudiante(
    evaluacion_id: UUID,
    archivo: list[UploadFile] = File(...),
    rotaciones: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    """Entrega atómica de una o varias hojas para evaluaciones físicas/mixtas."""
    require_role(current_user, [UserRole.ESTUDIANTE])
    evaluacion = await evaluaciones_service.get_evaluation_or_404(db, evaluacion_id)
    service.ensure_evaluation_accepts_grading(evaluacion)
    if evaluacion.modalidad not in {
        EvaluacionModalidad.FISICA.value,
        EvaluacionModalidad.MIXTA.value,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta evaluacion es online y solo acepta respuestas en pantalla.",
        )
    if not await is_student_enrolled(db, evaluacion.materia_id, current_user.id):
        raise HTTPException(status_code=403, detail="No estas matriculado en esta materia")

    try:
        bundle = await build_evidence_bundle(
            archivo,
            rotations=_parse_evidence_rotations(rotaciones),
        )
    except EvidenceBundleError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    latest = await db.scalar(
        select(Entrega)
        .where(
            Entrega.evaluacion_id == evaluacion.id,
            Entrega.estudiante_id == current_user.id,
        )
        .order_by(Entrega.created_at.desc())
        .limit(1)
    )
    mixed_submission = evaluacion.modalidad == EvaluacionModalidad.MIXTA.value
    if mixed_submission:
        if not latest or not latest.respuesta_texto:
            raise HTTPException(
                status_code=409,
                detail="Primero completa y envia la parte online; despues adjunta las hojas.",
            )
        if latest.archivo_url and latest.estado != EntregaEstado.REQUIERE_REINTENTO.value:
            raise HTTPException(
                status_code=409,
                detail="Ya entregaste la evidencia fisica de esta evaluacion.",
            )
        entrega = latest
    else:
        if latest and latest.estado == EntregaEstado.REQUIERE_REINTENTO.value:
            entrega = latest
        else:
            await service.ensure_student_can_submit_new_evidence(
                db, evaluacion, current_user.id
            )
            entrega = Entrega(
                evaluacion_id=evaluacion.id,
                estudiante_id=current_user.id,
                materia_id=evaluacion.materia_id,
                visual_text_json={},
            )
            db.add(entrega)

    previous_url = entrega.archivo_url
    new_url = await save_upload(
        bundle.content,
        bundle.filename,
        subfolder="entregas",
        max_size_bytes=MAX_EVIDENCE_TOTAL_BYTES,
    )
    entrega.archivo_url = new_url
    entrega.tipo = (
        EntregaTipo.MIXTA.value
        if mixed_submission
        else EntregaTipo.PDF.value
        if bundle.mime == "application/pdf"
        else EntregaTipo.FOTO.value
    )
    entrega.estado = EntregaEstado.RECIBIDA.value
    try:
        evidence_metadata = _evidence_bundle_metadata(evaluacion, entrega, bundle)
        entrega.visual_text_json = {
            "pipeline_status": "received",
            "evidencia_consolidada": evidence_metadata,
        }
        await db.commit()
    except Exception:
        await db.rollback()
        _delete_replaced_evidence(new_url)
        raise
    await db.refresh(entrega)
    _delete_replaced_evidence(previous_url)

    existing_calificacion = await db.scalar(
        select(Calificacion).where(Calificacion.entrega_id == entrega.id)
    )
    try:
        await _enqueue_persisted_grading(
            db,
            evaluacion=evaluacion,
            entrega=entrega,
            estudiante_id=current_user.id,
            profesor_id=evaluacion.profesor_id,
            evidence_metadata=evidence_metadata,
            calificacion=existing_calificacion,
        )
    except HTTPException as exc:
        if exc.status_code != status.HTTP_503_SERVICE_UNAVAILABLE:
            raise
        # El paquete completo ya quedó guardado; el docente puede reprocesarlo.
        await db.refresh(entrega)
    return _entrega_read(entrega)

# ── Detalle ──────────────────────────────────────────────────────────────────────


@router.get("/calificaciones/entregas/{entrega_id}/evidencia")
async def get_entrega_evidencia(
    entrega_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    entrega = await db.scalar(select(Entrega).where(Entrega.id == entrega_id))
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")

    if current_user.rol == UserRole.ESTUDIANTE.value:
        if entrega.estudiante_id != current_user.id:
            raise HTTPException(status_code=403, detail="No autorizado")
    else:
        require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
        await evaluaciones_service.ensure_can_manage_evaluation(
            db, entrega.evaluacion_id, current_user,
        )

    if not entrega.archivo_url:
        raise HTTPException(status_code=404, detail="La entrega no tiene evidencia adjunta")
    try:
        evidence_path = resolve_upload_path(entrega.archivo_url)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Evidencia no encontrada") from exc
    if not evidence_path.is_file():
        raise HTTPException(status_code=404, detail="Evidencia no encontrada")

    media_type = mimetypes.guess_type(evidence_path.name)[0] or "application/octet-stream"
    return FileResponse(
        evidence_path,
        media_type=media_type,
        headers={
            "Cache-Control": "private, no-store",
            "Content-Disposition": f'inline; filename="evidencia{evidence_path.suffix}"',
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/calificaciones/{calificacion_id}/detalle", response_model=CalificacionDetalleRead)
async def get_calificacion_detalle(
    calificacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    cal = await service.get_calificacion_or_404(db, calificacion_id)
    await evaluaciones_service.ensure_can_manage_evaluation(
        db, cal.evaluacion_id, current_user,
    )
    return await service.get_calificacion_detalle(db, calificacion_id)


# ── Publicar ─────────────────────────────────────────────────────────────────────


@router.patch("/calificaciones/{calificacion_id}/publicar", response_model=CalificacionRead)
async def publicar(
    calificacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    cal = await service.get_calificacion_or_404(db, calificacion_id)
    await evaluaciones_service.ensure_can_manage_evaluation(db, cal.evaluacion_id, current_user)
    return await service.publicar_nota(db, cal)


# ── Batch operations ─────────────────────────────────────────────────────────────


@router.post("/calificaciones/lote/publicar", response_model=BatchResult)
async def publicar_lote(
    payload: list[UUID],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.publicar_nota_batch(db, payload, current_user)


@router.post("/calificaciones/lote/confirmar", response_model=BatchResult)
async def confirmar_lote(
    payload: BatchConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.confirmar_nota_batch(db, payload.items, current_user)


@router.post("/calificaciones/lote/ajustar", response_model=BatchResult)
async def ajustar_lote(
    payload: BatchAjustarRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.ajustar_nota_batch(db, payload.items, current_user)


# ── Incidencias ───────────────────────────────────────────────────────────────────


@router.get(
    "/evaluaciones/{evaluacion_id}/mi-solicitud-revision",
    response_model=IncidenciaRead | None,
)
async def obtener_mi_solicitud_revision(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.ESTUDIANTE])
    return await service.obtener_solicitud_revision_estudiante(
        db,
        evaluacion_id=evaluacion_id,
        estudiante_id=current_user.id,
    )


@router.post(
    "/evaluaciones/{evaluacion_id}/solicitud-revision",
    response_model=IncidenciaRead,
    status_code=status.HTTP_201_CREATED,
)
async def solicitar_revision_calificacion(
    evaluacion_id: UUID,
    payload: SolicitudRevisionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.ESTUDIANTE])
    return await service.crear_solicitud_revision_estudiante(
        db,
        evaluacion_id=evaluacion_id,
        estudiante_id=current_user.id,
        motivo=payload.motivo,
        descripcion=payload.descripcion,
    )


@router.post("/calificaciones/{calificacion_id}/incidencias", response_model=IncidenciaRead, status_code=status.HTTP_201_CREATED)
async def crear_incidencia(
    calificacion_id: UUID,
    payload: IncidenciaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    cal = await service.get_calificacion_or_404(db, calificacion_id)
    await evaluaciones_service.ensure_can_manage_evaluation(db, cal.evaluacion_id, current_user)
    return await service.crear_incidencia(db, calificacion_id, payload.tipo, payload.descripcion, payload.metadata_json)


@router.get("/calificaciones/{calificacion_id}/incidencias", response_model=list[IncidenciaRead])
async def listar_incidencias(
    calificacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    cal = await service.get_calificacion_or_404(db, calificacion_id)
    await evaluaciones_service.ensure_can_manage_evaluation(db, cal.evaluacion_id, current_user)
    return await service.listar_incidencias(db, calificacion_id)


@router.patch("/incidencias/{incidencia_id}/resolver", response_model=IncidenciaRead)
async def resolver_incidencia(
    incidencia_id: UUID,
    payload: ResolverIncidencia,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    result = await service.resolver_incidencia(db, incidencia_id, payload.resolucion, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    return result
