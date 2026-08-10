from __future__ import annotations

import secrets

from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.shared.constants import COOKIE_ACCESS_NAME, COOKIE_CSRF_NAME, COOKIE_REFRESH_NAME

SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
EXEMPT_PATHS = {
    f"{settings.API_PREFIX}/auth/login",
    f"{settings.API_PREFIX}/auth/register",
}


class CSRFMiddleware(BaseHTTPMiddleware):
    """Valida double-submit token en mutaciones autenticadas mediante cookies."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        has_session_cookie = bool(
            request.cookies.get(COOKIE_ACCESS_NAME)
            or request.cookies.get(COOKIE_REFRESH_NAME)
        )
        if (
            request.method.upper() not in SAFE_METHODS
            and request.url.path not in EXEMPT_PATHS
            and has_session_cookie
        ):
            expected = request.cookies.get(COOKIE_CSRF_NAME, "")
            provided = request.headers.get("X-CSRF-Token", "")
            if (
                not expected
                or not provided
                or not secrets.compare_digest(expected, provided)
            ):
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "detail": (
                            "Solicitud de seguridad inválida. "
                            "Recarga la página e intenta nuevamente."
                        ),
                    },
                )
        return await call_next(request)