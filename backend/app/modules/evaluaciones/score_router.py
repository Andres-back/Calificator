from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_roles
from app.db.session import get_db
from app.modules.evaluaciones.score_schemas import ScorePlanUpdate, ScoreApplyRequest
from app.modules.evaluaciones import score_service
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(tags=['evaluaciones'])


@router.get('/evaluaciones/{evaluacion_id}/reparto')
async def read_score_definition(evaluacion_id: UUID, current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.PROFESOR)), db: AsyncSession = Depends(get_db)):
    return await score_service.read_score_plan(db, evaluacion_id, current_user)


@router.put('/evaluaciones/{evaluacion_id}/reparto')
async def save_score_definition(evaluacion_id: UUID, payload: ScorePlanUpdate, current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.PROFESOR)), db: AsyncSession = Depends(get_db)):
    await score_service.save_score_plan(db, evaluacion_id, payload, current_user)
    return await score_service.read_score_plan(db, evaluacion_id, current_user)


@router.post('/evaluaciones/{evaluacion_id}/reparto/notas/previsualizar')
async def preview_previous_scores(evaluacion_id: UUID, limit: int = Query(default=100, ge=1, le=100), cursor: UUID | None = None,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.PROFESOR)), db: AsyncSession = Depends(get_db)):
    return await score_service.preview_score_changes(db, evaluacion_id, current_user, limit=limit, cursor=cursor)


@router.post('/evaluaciones/{evaluacion_id}/reparto/notas/aplicar')
async def apply_previous_scores(evaluacion_id: UUID, payload: ScoreApplyRequest, current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.PROFESOR)), db: AsyncSession = Depends(get_db)):
    return await score_service.apply_score_changes(db, evaluacion_id, payload, current_user)


@router.get('/evaluaciones/{evaluacion_id}/reparto/notas/operaciones/{request_id}')
async def read_score_receipt(evaluacion_id: UUID, request_id: UUID, current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.PROFESOR)), db: AsyncSession = Depends(get_db)):
    return await score_service.read_score_operation(db, evaluacion_id, request_id, current_user)
