from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_roles
from app.db.session import get_db
from app.modules.users import service
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate, UserRead, UserSelfUpdate, UserUpdate
from app.shared.enums import UserRole

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/users/me", response_model=UserRead)
async def patch_me(
    payload: UserSelfUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await service.update_user(db, current_user, payload)


@router.get("/admin/users", response_model=list[UserRead])
async def admin_list_users(
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    return await service.list_users(db)


@router.post("/admin/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def admin_create_user(
    payload: UserCreate,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await service.create_user(db, payload)


@router.patch("/admin/users/{user_id}", response_model=UserRead)
async def admin_update_user(
    user_id: UUID,
    payload: UserUpdate,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await service.get_user_or_404(db, user_id)
    return await service.update_user(db, user, payload)


@router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_user(
    user_id: UUID,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Response:
    user = await service.get_user_or_404(db, user_id)
    await service.delete_user(db, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
