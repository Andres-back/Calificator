from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.auth import service
from app.modules.auth.schemas import AuthResponse, LoginRequest, RegisterRequest
from app.modules.users.models import User
from app.shared.constants import COOKIE_REFRESH_NAME

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    user = await service.authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    service.set_auth_cookies(response, user)
    return AuthResponse.from_user(user)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    user = await service.register_public_user(db, payload)
    service.set_auth_cookies(response, user)
    return AuthResponse.from_user(user)


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=COOKIE_REFRESH_NAME),
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")
    user = await service.refresh_session(db, refresh_token)
    service.set_auth_cookies(response, user)
    return AuthResponse.from_user(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> Response:
    service.clear_auth_cookies(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=AuthResponse)
async def me(current_user: User = Depends(get_current_user)) -> AuthResponse:
    return AuthResponse.from_user(current_user)
