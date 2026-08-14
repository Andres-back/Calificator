from __future__ import annotations

import re
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.core.permissions import get_current_user, require_role
from app.db.session import get_db
from app.modules.presentaciones import service
from app.modules.presentaciones.schemas import (
    PresentacionCreate,
    PresentacionEstadoRead,
    PresentacionExportRequest,
    PresentacionPreviewRead,
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
    logger.info(
        "Presentation generation enqueued", extra={"presentation_id": str(pres.id)}
    )
    return pres


@router.get("", response_model=list[PresentacionRead])
async def list_presentaciones(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    return await service.list_presentaciones(db, current_user)


@router.get("/assets/{asset_id}", include_in_schema=False)
async def get_generated_asset(
    asset_id: str,
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    """Serve only generated presentation PNGs to authenticated users."""
    if not re.fullmatch(r"[0-9a-f]{18}", asset_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado"
        )
    path = Path(settings.UPLOADS_DIR) / "presentaciones" / f"slide-{asset_id}.png"
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado"
        )
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


@router.get("/{presentacion_id}/preview", response_model=PresentacionPreviewRead)
async def preview_metadata(
    presentacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    pres = await service.ensure_can_read_presentacion(db, presentacion_id, current_user)
    return service.build_preview_metadata(pres)


@router.get("/{presentacion_id}/preview/{slide_number}.png")
async def preview_slide(
    presentacion_id: UUID,
    slide_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    pres = await service.ensure_can_read_presentacion(db, presentacion_id, current_user)
    content = service.render_preview_slide(pres, slide_number)
    return Response(
        content=content,
        media_type="image/png",
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/{presentacion_id}/exportar", response_model=PresentacionRead)
async def exportar(
    presentacion_id: UUID,
    payload: PresentacionExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    pres = await service.ensure_can_manage_presentacion(
        db, presentacion_id, current_user
    )
    return await service.export_presentacion(db, pres, payload.format)


@router.get("/{presentacion_id}/archivo/{fmt}")
async def descargar_archivo(
    presentacion_id: UUID,
    fmt: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    if fmt not in {"pptx", "pdf"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Formato invalido"
        )
    pres = await service.ensure_can_read_presentacion(db, presentacion_id, current_user)
    path = (
        await service.ensure_current_pptx_download(db, pres)
        if fmt == "pptx"
        else service.get_download_path(pres, "pdf")
    )
    media_type = (
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        if fmt == "pptx"
        else "application/pdf"
    )
    return FileResponse(
        path,
        media_type=media_type,
        filename=f"{pres.titulo}.{fmt}",
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/{presentacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    presentacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    pres = await service.ensure_can_manage_presentacion(
        db, presentacion_id, current_user
    )
    await service.delete_presentacion(db, pres)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
