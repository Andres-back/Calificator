from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, is_student_enrolled, require_role
from app.db.session import get_db
from app.modules.calificaciones import service
from app.modules.calificaciones.grading_service import grade_submission
from app.modules.calificaciones.models import Calificacion, Entrega, SalonSesion
from app.modules.calificaciones.salon_mode_service import (
    create_sesion_id,
    get_pending_students,
    grade_student_photo,
)
from app.modules.calificaciones.schemas import (
    AjustarNota,
    CalificacionRead,
    ConfirmarNota,
    EntregaOnlineCreate,
    EntregaRead,
    SalonSesionRead,
    ResumenAcademico,
)
from app.modules.evaluaciones import service as evaluaciones_service
from app.modules.evaluaciones.blueprint_service import evaluation_to_grading_blueprint
from app.modules.materias import service as materias_service
from app.modules.users.models import User
from app.services.storage_service import save_upload, validate_mime
from app.shared.enums import CalificacionEstado, EntregaEstado, EntregaTipo, UserRole

router = APIRouter(tags=["calificaciones"])


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
    # A cross-subject summary would expose other teachers' records, so it is
    # intentionally limited to the student themself or an administrator.
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


@router.post("/calificaciones/modo-salon/iniciar", response_model=SalonSesionRead)
async def iniciar_salon(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    evaluacion = await evaluaciones_service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    service.ensure_evaluation_accepts_grading(evaluacion)

    # Starting twice from the same account/evaluation must resume the active
    # persisted session instead of creating parallel salon sessions.
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
        await db.commit()

    pendientes = await get_pending_students(db, evaluacion_id)
    return {
        "sesion_id": sesion.id,
        "evaluacion_id": evaluacion_id,
        "estudiantes_pendientes": len(pendientes),
        "estado": sesion.estado,
    }


@router.get("/calificaciones/modo-salon/{sesion_id}", response_model=SalonSesionRead)
async def obtener_salon(
    sesion_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Validate a locally remembered session against the server source of truth."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    sesion = await db.scalar(select(SalonSesion).where(SalonSesion.id == sesion_id))
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    evaluacion = await evaluaciones_service.ensure_can_manage_evaluation(
        db,
        sesion.evaluacion_id,
        current_user,
    )
    pendientes = await get_pending_students(db, evaluacion.id)
    return {
        "sesion_id": sesion.id,
        "evaluacion_id": sesion.evaluacion_id,
        "estudiantes_pendientes": len(pendientes),
        "estado": sesion.estado,
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
        db,
        sesion.evaluacion_id,
        current_user,
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
        db,
        sesion.evaluacion_id,
        current_user,
    )
    sesion.estado = "cerrada"
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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
