from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_roles
from app.db.session import get_db
from app.modules.materias import service
from app.modules.materias.schemas import MateriaCreate, MateriaRead, MateriaStudentsRead, MateriaUpdate
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/materias", tags=["materias"])


@router.post("", response_model=MateriaRead, status_code=status.HTTP_201_CREATED)
async def create_materia(
    payload: MateriaCreate,
    profesor: User = Depends(require_roles(UserRole.PROFESOR)),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await service.create_materia(db, payload, profesor)


@router.get("", response_model=list[MateriaRead])
async def list_materias(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[object]:
    return await service.list_materias(db, current_user)


@router.get("/{materia_id}", response_model=MateriaRead)
async def get_materia(
    materia_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await service.ensure_can_read_materia(db, materia_id, current_user)


@router.patch("/{materia_id}", response_model=MateriaRead)
async def update_materia(
    materia_id: UUID,
    payload: MateriaUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    materia = await service.ensure_can_manage_materia(db, materia_id, current_user)
    return await service.update_materia(db, materia, payload)


@router.post("/{materia_id}/regenerar-codigo", response_model=MateriaRead)
async def regenerate_code(
    materia_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    materia = await service.ensure_can_manage_materia(db, materia_id, current_user)
    return await service.regenerate_code(db, materia)


@router.get("/{materia_id}/estudiantes", response_model=MateriaStudentsRead)
async def list_students(
    materia_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MateriaStudentsRead:
    materia = await service.ensure_can_manage_materia(db, materia_id, current_user)
    estudiantes = await service.list_students(db, materia)
    return MateriaStudentsRead.model_validate(materia, from_attributes=True).model_copy(
        update={"estudiantes": estudiantes}
    )
