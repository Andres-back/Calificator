from collections.abc import Callable
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token_claims
from app.db.session import get_db
from app.modules.users.models import User
from app.shared.constants import COOKIE_ACCESS_NAME
from app.shared.enums import UserEstado, UserRole


async def get_current_user(
    request: Request,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = request.cookies.get(COOKIE_ACCESS_NAME)
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    try:
        user_id, token_version = decode_token_claims(token, expected_type="access")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        ) from exc

    user = await db.get(User, user_id)
    if (
        not user
        or user.estado != UserEstado.ACTIVO.value
        or int(user.auth_version or 1) != token_version
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive or missing user",
        )
    from app.modules.authorization.service import effective_permissions

    user._effective_permissions = await effective_permissions(db, user)  # type: ignore[attr-defined]
    return user


def require_role(current_user: User, roles: list[UserRole]) -> None:
    """Lanza 403 si el usuario no tiene alguno de los roles indicados."""
    allowed = {role.value for role in roles}
    if current_user.rol not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )


def require_roles(*roles: UserRole) -> Callable:
    allowed = {role.value for role in roles}

    async def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.rol not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return current_user

    return dependency


def require_permission(permission_key: str) -> Callable:
    async def dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        from app.modules.authorization.service import ensure_permission

        await ensure_permission(db, current_user, permission_key)
        return current_user

    return dependency


def require_permission_now(current_user: User, permission_key: str) -> None:
    effective = getattr(current_user, "_effective_permissions", None)
    if effective is None or permission_key not in effective:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para realizar esta acción",
        )


def require_any_permission_now(current_user: User, *permission_keys: str) -> None:
    effective = getattr(current_user, "_effective_permissions", None)
    if effective is None or not set(permission_keys).intersection(effective):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para realizar esta acción",
        )


def require_any_permission(*permission_keys: str) -> Callable:
    async def dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        from app.modules.authorization.service import effective_permissions

        effective = await effective_permissions(db, current_user)
        if not effective.intersection(permission_keys):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para realizar esta acción",
            )
        return current_user

    return dependency


def can_manage_profesor_resource(current_user: User, profesor_id: UUID) -> bool:
    return current_user.rol == UserRole.ADMIN.value or current_user.id == profesor_id


async def is_student_enrolled(
    db: AsyncSession,
    materia_id: UUID,
    estudiante_id: UUID,
) -> bool:
    from app.modules.matriculas.models import Matricula
    from app.shared.enums import MatriculaEstado

    result = await db.scalar(
        select(Matricula.id).where(
            Matricula.materia_id == materia_id,
            Matricula.estudiante_id == estudiante_id,
            Matricula.estado == MatriculaEstado.ACTIVO.value,
        )
    )
    return result is not None
