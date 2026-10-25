from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_permission_now
from app.db.session import get_db
from app.modules.evaluaciones import copy_service
from app.modules.evaluaciones.copy_schemas import CopyRead, CopyRequest
from app.modules.users.models import User

router = APIRouter(tags=['evaluaciones'])


@router.get('/evaluaciones/{evaluacion_id}/ultima-copia', response_model=CopyRead | None)
async def latest_copy(evaluacion_id: UUID, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_permission_now(actor, 'evaluations.read')
    require_permission_now(actor, 'evaluations.create')
    return await copy_service.latest_copy(db, evaluacion_id, actor)


@router.post('/evaluaciones/{evaluacion_id}/copiar', response_model=CopyRead, status_code=202)
async def copy_evaluation(evaluacion_id: UUID, payload: CopyRequest, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_permission_now(actor, 'evaluations.read')
    require_permission_now(actor, 'evaluations.create')
    return await copy_service.request_copy(db, evaluacion_id, payload, actor)


@router.get('/evaluaciones/copias/{job_id}', response_model=CopyRead)
async def get_copy(job_id: UUID, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_permission_now(actor, 'evaluations.read')
    require_permission_now(actor, 'evaluations.create')
    return await copy_service.read_copy(db, job_id, actor)
