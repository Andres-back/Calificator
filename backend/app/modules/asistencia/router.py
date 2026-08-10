from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.asistencia import service
from app.modules.asistencia.schemas import AsistenciaDiaRead, AsistenciaDiaUpsert, AsistenciaReporteRead
from app.modules.materias import service as materias_service
from app.modules.users.models import User

router = APIRouter(prefix="/materias/{materia_id}/asistencia", tags=["asistencia"])


@router.get("", response_model=AsistenciaDiaRead)
async def get_attendance_day(
    materia_id: UUID,
    fecha: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AsistenciaDiaRead:
    materia = await materias_service.ensure_can_manage_materia(db, materia_id, current_user)
    return await service.get_attendance_day(db, materia, fecha)


@router.get('/reporte', response_model=AsistenciaReporteRead)
async def get_attendance_report(
    materia_id: UUID,
    fecha_desde: date = Query(...),
    fecha_hasta: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AsistenciaReporteRead:
    materia = await materias_service.ensure_can_manage_materia(db, materia_id, current_user)
    return await service.get_attendance_report(db, materia, fecha_desde, fecha_hasta)


@router.put("", response_model=AsistenciaDiaRead)
async def save_attendance_day(
    materia_id: UUID,
    payload: AsistenciaDiaUpsert,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AsistenciaDiaRead:
    materia = await materias_service.ensure_can_manage_materia(db, materia_id, current_user)
    return await service.save_attendance_day(db, materia, payload, current_user)
