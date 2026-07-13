from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.matriculas import service
from app.modules.matriculas.schemas import MatriculaEstadoUpdate, MatriculaJoinRequest, MatriculaRead, MisMateriasRead
from app.modules.users.models import User

router = APIRouter(prefix="/matriculas", tags=["matriculas"])


@router.post("/unirse", response_model=MatriculaRead)
async def join_materia(
    payload: MatriculaJoinRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await service.join_by_code(db, payload.codigo_matricula, current_user)


@router.get("/mis-materias", response_model=MisMateriasRead)
async def mis_materias(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MisMateriasRead:
    materias = await service.list_mis_materias(db, current_user)
    return MisMateriasRead(materias=materias)


@router.patch("/{matricula_id}/estado", response_model=MatriculaRead)
async def update_estado(
    matricula_id: UUID,
    payload: MatriculaEstadoUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await service.update_estado(db, matricula_id, payload.estado, current_user)
