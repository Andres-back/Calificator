import secrets

from fastapi import HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_token, verify_password
from app.modules.auth.schemas import RegisterRequest
from app.modules.users import service as user_service
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate
from app.shared.constants import COOKIE_ACCESS_NAME, COOKIE_CSRF_NAME, COOKIE_REFRESH_NAME
from app.shared.enums import UserRole


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    user = await user_service.get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


async def register_public_user(db: AsyncSession, payload: RegisterRequest) -> User:
    # SEC-001: privilege is assigned server-side; public input cannot choose a role.
    student = UserCreate(
        nombre=payload.nombre,
        email=payload.email,
        password=payload.password,
        rol=UserRole.ESTUDIANTE,
    )
    return await user_service.create_user(db, student)


def set_auth_cookies(response: Response, user: User) -> None:
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    cookie_kwargs = {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": "lax",
    }
    response.set_cookie(
        COOKIE_ACCESS_NAME,
        access_token,
        max_age=settings.JWT_ACCESS_EXPIRE_MINUTES * 60,
        **cookie_kwargs,
    )
    response.set_cookie(
        COOKIE_REFRESH_NAME,
        refresh_token,
        max_age=settings.JWT_REFRESH_EXPIRE_DAYS * 24 * 60 * 60,
        **cookie_kwargs,
    )
    response.set_cookie(
        COOKIE_CSRF_NAME,
        secrets.token_urlsafe(32),
        max_age=settings.JWT_REFRESH_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
    )


async def refresh_session(db: AsyncSession, refresh_token: str) -> User:
    try:
        user_id = decode_token(refresh_token, expected_type="refresh")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from exc

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def clear_auth_cookies(response: Response) -> None:
    cookie_kwargs = {
        "path": "/",
        "secure": settings.cookie_secure,
        "httponly": True,
        "samesite": "lax",
    }
    response.delete_cookie(COOKIE_ACCESS_NAME, **cookie_kwargs)
    response.delete_cookie(COOKIE_REFRESH_NAME, **cookie_kwargs)
    response.delete_cookie(
        COOKIE_CSRF_NAME,
        path="/",
        secure=settings.cookie_secure,
        httponly=False,
        samesite="lax",
    )
