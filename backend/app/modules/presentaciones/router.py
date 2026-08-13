from __future__ import annotations

import re
from pathlib import Path
from uuid import UUID
from urllib.parse import parse_qs, urlparse

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.core.permissions import get_current_user, require_role
from app.db.session import get_db
from app.modules.presentaciones import service
from app.modules.presentaciones.schemas import (
    PresentacionCreate,
    PresentacionEditorUrlRead,
    PresentacionEstadoRead,
    PresentacionExportRequest,
    PresentacionRead,
)
from app.modules.users.models import User
from app.shared.enums import UserRole
from app.workers.tasks_presentations import generate_presentation

router = APIRouter(prefix="/presentaciones", tags=["presentaciones"])
logger = get_logger(__name__)


@router.post("", response_model=PresentacionRead, status_code=status.HTTP_201_CREATED)
async def create(
    payload: PresentacionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    pres = await service.create_presentacion(db, payload, current_user)
    generate_presentation.delay(str(pres.id))
    logger.info("Presentation generation enqueued", extra={"presentation_id": str(pres.id)})
    return pres


@router.get("", response_model=list[PresentacionRead])
async def list_presentaciones(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    return await service.list_presentaciones(db, current_user)


@router.get("/editor-auth", status_code=status.HTTP_204_NO_CONTENT, include_in_schema=False)
async def editor_auth(
    request: Request,
    x_original_uri: str | None = Header(default=None, alias="X-Original-URI"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    presenton_id = _extract_presenton_id(x_original_uri or str(request.url))
    if presenton_id:
        await service.ensure_can_manage_presenton_id(db, presenton_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/assets/{filename}", include_in_schema=False)
async def get_generated_asset(
    filename: str,
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    """Serve only generated presentation PNGs to authenticated users."""
    if not re.fullmatch(r"[0-9a-f]{18}\.png", filename):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")
    path = Path(settings.UPLOADS_DIR) / "presentations" / "images" / "xcal" / filename
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")
    return FileResponse(path, media_type="image/png")


@router.get("/{presentacion_id}", response_model=PresentacionRead)
async def get(
    presentacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await service.ensure_can_read_presentacion(db, presentacion_id, current_user)


@router.get("/{presentacion_id}/estado", response_model=PresentacionEstadoRead)
async def get_estado(
    presentacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    pres = await service.ensure_can_read_presentacion(db, presentacion_id, current_user)
    return service.build_estado(pres)


@router.post("/{presentacion_id}/exportar", response_model=PresentacionRead)
async def exportar(
    presentacion_id: UUID,
    payload: PresentacionExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    pres = await service.ensure_can_manage_presentacion(db, presentacion_id, current_user)
    return await service.export_presentacion(db, pres, payload.format)


@router.get("/{presentacion_id}/archivo/{fmt}")
async def descargar_archivo(
    presentacion_id: UUID,
    fmt: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    if fmt not in {"pptx", "pdf"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato invalido")
    pres = await service.ensure_can_read_presentacion(db, presentacion_id, current_user)
    path = service.get_download_path(pres, fmt)  # type: ignore[arg-type]
    media_type = (
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        if fmt == "pptx"
        else "application/pdf"
    )
    return FileResponse(
        path,
        media_type=media_type,
        filename=f"{pres.titulo}.{fmt}",
    )


@router.post("/{presentacion_id}/editor-url", response_model=PresentacionEditorUrlRead)
async def editor_url(
    presentacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    pres = await service.ensure_can_manage_presentacion(db, presentacion_id, current_user)
    return await service.build_editor_launch(db, pres, current_user)


@router.get("/{presentacion_id}/editor", include_in_schema=False)
async def open_editor(
    presentacion_id: UUID,
    token: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    pres = await service.ensure_can_manage_presentacion(db, presentacion_id, current_user)
    redirect_url = service.verify_editor_launch_token(pres, current_user, token)
    response = RedirectResponse(redirect_url)
    presenton_cookie = await service.build_presenton_session_cookie()
    response.set_cookie(
        "presenton_session",
        presenton_cookie,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24 * 30,
    )
    return response


@router.delete("/{presentacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    presentacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    pres = await service.ensure_can_manage_presentacion(db, presentacion_id, current_user)
    await service.delete_presentacion(db, pres)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _extract_presenton_id(uri: str) -> str | None:
    parsed = urlparse(uri)
    query_id = parse_qs(parsed.query).get("id")
    if query_id and query_id[0]:
        return query_id[0]

    parts = [part for part in parsed.path.split("/") if part]
    if "presentation" in parts:
        idx = parts.index("presentation")
        if idx + 1 < len(parts):
            return parts[idx + 1]
    return None
