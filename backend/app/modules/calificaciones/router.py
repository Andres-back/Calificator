from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, is_student_enrolled, require_role
from app.db.session import get_db
from app.modules.calificaciones import service
from app.modules.calificaciones.grading_service import grade_submission
from app.modules.calificaciones.models import Calificacion, Entrega, SalonSesion, SalonSesionEstudiante
from app.modules.calificaciones.salon_mode_service import (
    create_sesion_id,
    get_pending_students,
    get_sesion_summary,
    grade_student_photo,
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
    LoteAsincronoRead,
    SalonEstudianteRead,
    SalonEstudianteUpdate,
    SalonResumen,
    SalonSesionRead,
    ResumenAcademico,
)
from app.modules.evaluaciones import service as evaluaciones_service
from app.modules.evaluaciones.blueprint_service import evaluation_to_grading_blueprint
from app.modules.jobs import service as jobs_service
from app.modules.materias import service as materias_service
from app.modules.users.models import User
from app.services.storage_service import save_upload, validate_mime
from app.shared.enums import (
    CalificacionEstado, EntregaEstado, EntregaTipo, JobEstado, JobTipo,
    PoliticaIntento, UserRole,
)
from app.workers.tasks_grading import grade_batch

router = APIRouter(tags=["calificaciones"])
MAX_ASYNC_BATCH_FILES = 50
MAX_ASYNC_BATCH_BYTES = 100 * 1024 * 1024


@router.post("/calificaciones/foto", response_model=CalificacionRead, status_code=status.HTTP_201_CREATED)
async def calificar_foto(
    evaluacion_id: UUID = Form(...),
    estudiante_id: UUID = Form(...),
    foto: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    evaluacion = await evaluaciones_service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    service.ensure_evaluation_accepts_grading(evaluacion)
    if not await is_student_enrolled(db, evaluacion.materia_id, estudiante_id):
        raise HTTPException(status_code=403, detail="El estudiante no esta matriculado en esta materia")

    content = await foto.read()
    mime = validate_mime(content, foto.filename or "image.jpg")
    grading = await grade_submission(
        db,
        evaluacion_id=evaluacion.id,
        materia_id=evaluacion.materia_id,
        blueprint=evaluation_to_grading_blueprint(evaluacion),
        image_bytes=content,
        image_mime=mime,
        user_id=current_user.id,
    )
    service.validate_score_within_evaluation(grading.nota_sugerida, evaluacion, "nota_sugerida")
    service.transition_to_grading_if_needed(evaluacion)

    archivo_url = await save_upload(content, foto.filename or "foto.jpg", subfolder="entregas")
    entrega = Entrega(
        evaluacion_id=evaluacion.id,
        estudiante_id=estudiante_id,
        materia_id=evaluacion.materia_id,
        tipo=EntregaTipo.FOTO.value,
        archivo_url=archivo_url,
        estado=EntregaEstado.CALIFICADA.value,
        visual_text_json=grading.raw_model_output,
    )
    db.add(entrega)
    await db.flush()

    cal = Calificacion(
        evaluacion_id=evaluacion.id,
        entrega_id=entrega.id,
        estudiante_id=estudiante_id,
        materia_id=evaluacion.materia_id,
        profesor_id=current_user.id,
        nota_sugerida=grading.nota_sugerida,
        confianza=Decimal(str(grading.confianza)),
        feedback=grading.feedback_estudiante,
        resultado_json=grading.raw_model_output,
        estado=CalificacionEstado.SUGERIDA.value,
    )
    db.add(cal)
    await db.commit()
    await db.refresh(cal)
    return cal


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
    import json

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

    calificaciones_list: list[CalificacionRead] = []
    errores: list[dict] = []

    for i, foto in enumerate(files):
        sid = estudiante_ids[i]
        sid_uuid = UUID(sid) if isinstance(sid, str) else sid
        try:
            content = await foto.read()
            mime = validate_mime(content, foto.filename or "image.jpg")
            grading = await grade_submission(
                db,
                evaluacion_id=evaluacion.id,
                materia_id=evaluacion.materia_id,
                blueprint=evaluation_to_grading_blueprint(evaluacion),
                image_bytes=content,
                image_mime=mime,
                user_id=current_user.id,
            )
            service.validate_score_within_evaluation(grading.nota_sugerida, evaluacion, "nota_sugerida")

            archivo_url = await save_upload(content, foto.filename or f"lote_{i}.jpg", subfolder="entregas")
            entrega = Entrega(
                evaluacion_id=evaluacion.id,
                estudiante_id=sid_uuid,
                materia_id=evaluacion.materia_id,
                tipo=EntregaTipo.FOTO.value,
                archivo_url=archivo_url,
                estado=EntregaEstado.CALIFICADA.value,
                visual_text_json=grading.raw_model_output,
            )
            db.add(entrega)
            await db.flush()

            cal = Calificacion(
                evaluacion_id=evaluacion.id,
                entrega_id=entrega.id,
                estudiante_id=sid_uuid,
                materia_id=evaluacion.materia_id,
                profesor_id=current_user.id,
                nota_sugerida=grading.nota_sugerida,
                confianza=Decimal(str(grading.confianza)),
                feedback=grading.feedback_estudiante,
                resultado_json=grading.raw_model_output,
                estado=CalificacionEstado.SUGERIDA.value,
            )
            db.add(cal)
            calificaciones_list.append(CalificacionRead.model_validate(cal))
        except Exception as e:
            errores.append({"estudiante_id": str(sid), "filename": foto.filename or f"lote_{i}", "error": str(e)})

    service.transition_to_grading_if_needed(evaluacion)
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

    prepared_files: list[tuple[bytes, str]] = []
    total_bytes = 0
    for index, foto in enumerate(files):
        content = await foto.read()
        try:
            validate_mime(content, foto.filename or "image.jpg")
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
        prepared_files.append((content, foto.filename or f"lote_{index}.jpg"))

    entregas: list[Entrega] = []
    try:
        for estudiante_id, (content, filename) in zip(
            estudiante_ids, prepared_files, strict=True,
        ):
            archivo_url = await save_upload(content, filename, subfolder="entregas")
            entrega = Entrega(
                evaluacion_id=evaluacion.id,
                estudiante_id=estudiante_id,
                materia_id=evaluacion.materia_id,
                tipo=EntregaTipo.FOTO.value,
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

    return await service.get_resumen_academico(db, estudiante_id)


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
    return await service.get_boletin(db, estudiante_id, materia_id)


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


@router.post("/calificaciones/modo-salon/{sesion_id}/foto", response_model=CalificacionRead)
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

    content = await foto.read()
    mime = validate_mime(content, foto.filename or "foto.jpg")
    return await grade_student_photo(
        db,
        evaluacion=evaluacion,
        estudiante_id=estudiante_id,
        image_bytes=content,
        image_mime=mime,
        profesor_id=current_user.id,
        sesion_id=sesion_id,
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

    politica = evaluacion.politica_intento
    if politica is None or politica == PoliticaIntento.UN_INTENTO.value:
        existing_entrega = await db.scalar(
            select(Entrega.id).where(
                Entrega.evaluacion_id == evaluacion.id,
                Entrega.estudiante_id == current_user.id,
                Entrega.estado != EntregaEstado.REQUIERE_REINTENTO.value,
            )
        )
        if existing_entrega:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya entregaste esta evaluacion. No puedes reenviarla.",
            )
    elif politica == PoliticaIntento.PRACTICA_LIBRE.value:
        pass
    elif politica in (
        PoliticaIntento.MULTIPLES_INTENTOS.value,
        PoliticaIntento.MEJOR_PUNTAJE.value,
        PoliticaIntento.ULTIMO_INTENTO.value,
    ):
        if evaluacion.intentos_permitidos is not None:
            count = await db.scalar(
                select(func.count(Entrega.id)).where(
                    Entrega.evaluacion_id == evaluacion.id,
                    Entrega.estudiante_id == current_user.id,
                )
            )
            if count is not None and count >= evaluacion.intentos_permitidos:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Has alcanzado el límite de {evaluacion.intentos_permitidos} intento(s) para esta evaluación.",
                )

    respuesta_texto = payload.respuesta_texto

    grading = await grade_submission(
        db,
        evaluacion_id=evaluacion.id,
        materia_id=evaluacion.materia_id,
        blueprint=evaluation_to_grading_blueprint(evaluacion),
        student_response_text=respuesta_texto,
        user_id=current_user.id,
    )
    service.validate_score_within_evaluation(grading.nota_sugerida, evaluacion, "nota_sugerida")
    service.transition_to_grading_if_needed(evaluacion)

    entrega = Entrega(
        evaluacion_id=evaluacion.id,
        estudiante_id=current_user.id,
        materia_id=evaluacion.materia_id,
        tipo=EntregaTipo.ONLINE.value,
        respuesta_texto=respuesta_texto,
        estado=EntregaEstado.CALIFICADA.value,
        visual_text_json=grading.raw_model_output,
    )
    db.add(entrega)
    await db.flush()

    cal = Calificacion(
        evaluacion_id=evaluacion.id,
        entrega_id=entrega.id,
        estudiante_id=current_user.id,
        materia_id=evaluacion.materia_id,
        profesor_id=evaluacion.profesor_id,
        nota_sugerida=grading.nota_sugerida,
        confianza=Decimal(str(grading.confianza)),
        feedback=grading.feedback_estudiante,
        resultado_json=grading.raw_model_output,
        estado=CalificacionEstado.SUGERIDA.value,
    )
    db.add(cal)
    await db.commit()
    await db.refresh(entrega)
    return entrega


# ── Detalle ──────────────────────────────────────────────────────────────────────


@router.get("/calificaciones/{calificacion_id}/detalle", response_model=CalificacionDetalleRead)
async def get_calificacion_detalle(
    calificacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_calificacion_detalle(db, calificacion_id)


# ── Batch operations ─────────────────────────────────────────────────────────────


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
