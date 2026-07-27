"""Router de analítica — dashboard operativo del docente."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_role
from app.db.session import get_db
from app.modules.analytics import service
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(tags=["analytics"])


class EventoCreate(BaseModel):
    tipo: str = Field(..., min_length=1, max_length=60)
    evaluacion_id: UUID | None = None
    calificacion_id: UUID | None = None
    metadata_json: dict = {}


@router.post("/analytics/evento", status_code=201)
async def registrar_evento(
    payload: EventoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Registra un evento fire-and-forget desde el frontend."""
    max_tipo_len = 60
    if len(payload.tipo) > max_tipo_len:
        raise HTTPException(status_code=422, detail=f"tipo no puede exceder {max_tipo_len} caracteres")
    await service.registrar_evento(
        db, tipo=payload.tipo, actor_id=current_user.id,
        evaluacion_id=payload.evaluacion_id,
        calificacion_id=payload.calificacion_id,
        metadata_json=payload.metadata_json,
    )
    return {"status": "ok"}


@router.get("/analytics/overview")
async def analytics_overview(
    materia_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Resumen operativo del dashboard de analítica."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_overview(
        db, profesor_id=current_user.id, materia_id=materia_id,
        fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )


@router.get("/analytics/evaluaciones")
async def analytics_evaluaciones(
    materia_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Lista de evaluaciones con métricas agregadas."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_evaluaciones_list(
        db, profesor_id=current_user.id, materia_id=materia_id,
        fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )


@router.get("/analytics/evaluaciones/{evaluacion_id}")
async def analytics_evaluacion_detalle(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Detalle de una evaluación con distribución de notas."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    result = await service.get_evaluacion_detail(db, evaluacion_id, profesor_id=current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return result
