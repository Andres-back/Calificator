"""Router para refuerzos pedagógicos generados por Xali."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_role
from app.db.session import get_db
from app.modules.xali.refuerzo_schemas import RefuerzoGenerarRequest, RefuerzoRead, RefuerzoUpdate
from app.modules.xali import refuerzo_service
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/xali/refuerzos", tags=["xali"])


@router.post("/generar", response_model=RefuerzoRead, status_code=status.HTTP_201_CREATED)
async def generar_refuerzo(
    payload: RefuerzoGenerarRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    """Genera un refuerzo pedagógico con Xali a partir de un criterio con dificultad."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await refuerzo_service.generar_refuerzo(
        db,
        profesor_id=current_user.id,
        materia_id=payload.materia_id,
        criterio_nombre=payload.criterio_nombre,
        porcentaje_logro=payload.porcentaje_logro,
        estudiantes_con_dificultad=payload.estudiantes_con_dificultad,
        total_estudiantes=payload.total_estudiantes,
        tipo=payload.tipo,
    )


@router.get("/{refuerzo_id}", response_model=RefuerzoRead)
async def obtener_refuerzo(
    refuerzo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    """Obtiene un refuerzo generado."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    result = await refuerzo_service.obtener_refuerzo(db, refuerzo_id)
    if not result:
        raise HTTPException(status_code=404, detail="Refuerzo no encontrado")
    return result


@router.patch("/{refuerzo_id}", response_model=RefuerzoRead)
async def actualizar_refuerzo(
    refuerzo_id: UUID,
    payload: RefuerzoUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    """Actualiza contenido o estado de un refuerzo."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    result = await refuerzo_service.actualizar_refuerzo(db, refuerzo_id, payload.contenido_json, payload.estado)
    if not result:
        raise HTTPException(status_code=404, detail="Refuerzo no encontrado")
    return result
