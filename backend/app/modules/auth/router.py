from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.permissions import get_current_user
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.modules.auth import password_recovery_service, service
from app.modules.auth.schemas import (
    AuthResponse,
    LoginRequest,
    PasswordResetConsumeRequest,
    PasswordResetRequestCreate,
    PasswordResetValidateRequest,
    PasswordResetValidation,
    PublicMessage,
    RegisterRequest,
)
from app.modules.users.models import User
from app.shared.constants import COOKIE_REFRESH_NAME

router = APIRouter(prefix="/auth", tags=["auth"])
logger = get_logger(__name__)
_RECOVERY_MESSAGE = (
    "Si existe una cuenta activa con ese correo, recibirás instrucciones para "
    "restablecer tu contraseña."
)
_INVALID_RESET_MESSAGE = "El enlace no es válido o ya venció. Solicita uno nuevo."


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit(limit=10, window_seconds=60, scope="auth-login")),
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
    _: None = Depends(rate_limit(limit=5, window_seconds=3600, scope="auth-register")),
) -> AuthResponse:
    user = await service.register_public_user(db, payload)
    service.set_auth_cookies(response, user)
    return AuthResponse.from_user(user)


@router.post(
    "/password-recovery/request",
    response_model=PublicMessage,
    status_code=status.HTTP_202_ACCEPTED,
)
async def request_password_recovery(
    payload: PasswordResetRequestCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(
        rate_limit(limit=5, window_seconds=3600, scope="auth-password-recovery")
    ),
) -> PublicMessage:
    reset_request = await password_recovery_service.create_password_reset_request(
        db,
        email=str(payload.email),
        client_fingerprint=request.client.host if request.client else None,
    )
    if reset_request is not None:
        try:
            from app.workers.tasks_password_recovery import send_password_reset_email

            send_password_reset_email.delay(str(reset_request.id))
        except Exception as exc:
            # Keep the public response neutral. The stored request remains
            # visible to administrators and can be retried after the queue recovers.
            logger.warning(
                "Could not enqueue password reset request %s: %s",
                reset_request.id,
                type(exc).__name__,
            )
    return PublicMessage(detail=_RECOVERY_MESSAGE)


@router.post(
    "/password-recovery/validate",
    response_model=PasswordResetValidation,
)
async def validate_password_recovery(
    payload: PasswordResetValidateRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(
        rate_limit(limit=20, window_seconds=60, scope="auth-password-reset-validate")
    ),
) -> PasswordResetValidation:
    try:
        await password_recovery_service.validate_password_reset_token(db, payload.token)
    except ValueError:
        return PasswordResetValidation(valid=False, detail=_INVALID_RESET_MESSAGE)
    return PasswordResetValidation(
        valid=True,
        detail="El enlace es válido. Ya puedes crear una nueva contraseña.",
    )


@router.post(
    "/password-recovery/reset",
    response_model=PublicMessage,
)
async def reset_password(
    payload: PasswordResetConsumeRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(
        rate_limit(limit=10, window_seconds=60, scope="auth-password-reset")
    ),
) -> PublicMessage:
    try:
        await password_recovery_service.consume_password_reset_token(
            db,
            token=payload.token,
            password=payload.password,
        )
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_INVALID_RESET_MESSAGE,
        ) from exc
    service.clear_auth_cookies(response)
    return PublicMessage(
        detail="Contraseña actualizada. Inicia sesión con tu nueva contraseña."
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=COOKIE_REFRESH_NAME),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit(limit=30, window_seconds=60, scope="auth-refresh")),
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