from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api import api_router
from app.core.config import settings
from app.core.csrf import CSRFMiddleware
from app.core.logging import configure_logging
from app.services.storage_service import UploadTooLargeError


def create_app() -> FastAPI:
    configure_logging()
    docs_enabled = settings.ENABLE_API_DOCS
    app = FastAPI(
        title=settings.APP_NAME,
        docs_url=f"{settings.API_PREFIX}/docs" if docs_enabled else None,
        redoc_url=f"{settings.API_PREFIX}/redoc" if docs_enabled else None,
        openapi_url=f"{settings.API_PREFIX}/openapi.json" if docs_enabled else None,
    )
    @app.exception_handler(UploadTooLargeError)
    async def upload_too_large_handler(
        _request: Request,
        exc: UploadTooLargeError,
    ) -> JSONResponse:
        return JSONResponse(status_code=413, content={"detail": str(exc)})

    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)
    app.add_middleware(CSRFMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "app": settings.APP_NAME}

    @app.get("/docs", include_in_schema=False)
    async def legacy_docs_redirect() -> RedirectResponse:
        if not docs_enabled:
            return RedirectResponse(url="/")
        return RedirectResponse(url=f"{settings.API_PREFIX}/docs")

    @app.get("/redoc", include_in_schema=False)
    async def legacy_redoc_redirect() -> RedirectResponse:
        if not docs_enabled:
            return RedirectResponse(url="/")
        return RedirectResponse(url=f"{settings.API_PREFIX}/redoc")

    @app.get("/openapi.json", include_in_schema=False)
    async def legacy_openapi_redirect() -> RedirectResponse:
        if not docs_enabled:
            return RedirectResponse(url="/")
        return RedirectResponse(url=f"{settings.API_PREFIX}/openapi.json")

    app.include_router(api_router, prefix=settings.API_PREFIX)


    return app


app = create_app()
