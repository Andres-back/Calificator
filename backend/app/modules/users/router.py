from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_roles
from app.db.session import get_db
from app.modules.users import service
from app.modules.users.models import User
from app.modules.users.schemas import (
    AdminUserRead,
    SolicitudDocenteDecisionRequest,
    UserCreate,
    UserSelfRead,
    UserSelfUpdate,
    UserUpdate,
)
from app.shared.enums import SolicitudDocenteEstado, UserEstado, UserRole

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=UserSelfRead)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/users/me", response_model=UserSelfRead)
async def patch_me(
    payload: UserSelfUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await service.update_user(db, current_user, payload)


@router.get("/admin/users", response_model=list[AdminUserRead])
async def admin_list_users(
    q: str | None = Query(default=None, max_length=160),
    rol: UserRole | None = None,
    estado: UserEstado | None = None,
    solicitud_docente_estado: SolicitudDocenteEstado | None = None,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    return await service.list_users(
        db,
        q=q,
        rol=rol,
        estado=estado,
        solicitud_docente_estado=solicitud_docente_estado,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/admin/users", response_model=AdminUserRead, status_code=status.HTTP_201_CREATED
)
async def admin_create_user(
    payload: UserCreate,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await service.create_user(db, payload)


@router.patch("/admin/users/{user_id}", response_model=AdminUserRead)
async def admin_update_user(
    user_id: UUID,
    payload: UserUpdate,
    admin: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await service.get_user_or_404(db, user_id)
    return await service.update_user(db, user, payload, actor=admin)


@router.patch("/admin/users/{user_id}/solicitud-docente", response_model=AdminUserRead)
async def admin_resolve_teacher_request(
    user_id: UUID,
    payload: SolicitudDocenteDecisionRequest,
    admin: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await service.resolve_teacher_request(db, user_id, payload, admin)


@router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_user(
    user_id: UUID,
    admin: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Response:
    user = await service.get_user_or_404(db, user_id)
    await service.delete_user(db, user, actor=admin)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
