from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_permission_now, require_role
from app.db.session import get_db
from app.modules.xali import service
from app.modules.xali.schemas import (
    XaliEvaluacionEntregadaRead,
    XaliEvaluationChatRequest,
    XaliEvaluationChatResponse,
    XaliMessage,
    XaliResponse,
    XaliStudentResourceRequest,
    XaliStudentResourceResponse,
)
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/xali", tags=["xali"])


@router.post("/chat", response_model=XaliResponse)
async def chat(
    payload: XaliMessage,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_permission_now(current_user, "xali.use")
    is_teacher = current_user.rol in (UserRole.PROFESOR, UserRole.ADMIN)
    respuesta = await service.chat(
        db,
        estudiante_id=current_user.id,
        materia_id=payload.materia_id,
        mensaje=payload.mensaje,
        is_teacher=is_teacher,
    )
    return {"respuesta": respuesta, "materia_id": payload.materia_id}


@router.get("/evaluaciones-entregadas", response_model=list[XaliEvaluacionEntregadaRead])
async def list_evaluaciones_entregadas(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    require_permission_now(current_user, "xali.use")
    require_role(current_user, [UserRole.ESTUDIANTE])
    return await service.list_delivered_evaluations_for_student(db, current_user.id)


@router.post("/evaluaciones/{evaluacion_id}/chat", response_model=XaliEvaluationChatResponse)
async def chat_evaluacion_entregada(
    evaluacion_id: UUID,
    payload: XaliEvaluationChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_permission_now(current_user, "xali.use")
    require_role(current_user, [UserRole.ESTUDIANTE])
    return await service.chat_about_delivered_evaluation(
        db,
        estudiante_id=current_user.id,
        evaluacion_id=evaluacion_id,
        mensaje=payload.mensaje,
    )


@router.post(
    "/evaluaciones/{evaluacion_id}/recursos",
    response_model=XaliStudentResourceResponse,
)
async def generar_recurso_evaluacion_entregada(
    evaluacion_id: UUID,
    payload: XaliStudentResourceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_permission_now(current_user, "xali.use")
    require_role(current_user, [UserRole.ESTUDIANTE])
    return await service.generate_student_resource(
        db,
        estudiante_id=current_user.id,
        evaluacion_id=evaluacion_id,
        resource_type=payload.tipo,
    )


@router.get(
    "/evaluaciones/{evaluacion_id}/recursos",
    response_model=list[XaliStudentResourceResponse],
)
async def listar_recursos_evaluacion_entregada(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    require_permission_now(current_user, "xali.use")
    require_role(current_user, [UserRole.ESTUDIANTE])
    return await service.list_student_resources(
        db,
        estudiante_id=current_user.id,
        evaluacion_id=evaluacion_id,
    )


@router.get("/history")
async def get_history(
    materia_id: UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    require_permission_now(current_user, "xali.use")
    return await service.get_history(db, current_user.id, materia_id)


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def clear_history(
    materia_id: UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    require_permission_now(current_user, "xali.use")
    await service.clear_history(db, current_user.id, materia_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
