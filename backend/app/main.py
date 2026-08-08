from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api import api_router
from app.core.config import settings
from app.core.logging import configure_logging


def create_app() -> FastAPI:
    configure_logging()
    docs_enabled = settings.ENABLE_API_DOCS
    app = FastAPI(
        title=settings.APP_NAME,
        docs_url=f"{settings.API_PREFIX}/docs" if docs_enabled else None,
        redoc_url=f"{settings.API_PREFIX}/redoc" if docs_enabled else None,
        openapi_url=f"{settings.API_PREFIX}/openapi.json" if docs_enabled else None,
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)
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

    uploads_path = "/" + settings.PUBLIC_UPLOADS_BASE_URL.strip("/")
    app.mount(
        uploads_path,
        StaticFiles(directory=settings.UPLOADS_DIR, check_dir=False),
        name="uploads",
    )
    return app


app = create_app()
