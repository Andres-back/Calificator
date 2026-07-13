from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_role
from app.db.session import get_db
from app.modules.imagenes import service
from app.modules.imagenes.schemas import (
    ImageGenerationRequest,
    ImageGenerationResponse,
    ImagenGeneradaRead,
    ImagenGeneradaUpdate,
)
from app.modules.users.models import User
from app.services.image_router import generate_image
from app.shared.enums import UserRole

router = APIRouter(prefix="/imagenes", tags=["imagenes"])

# Biblioteca de imágenes generadas (recurso reutilizable/auditable)
biblioteca_router = APIRouter(prefix="/imagenes-generadas", tags=["imagenes-generadas"])


@router.post("/generar", response_model=ImageGenerationResponse, status_code=status.HTTP_201_CREATED)
async def generar_imagen(
    req: ImageGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    error: str | None = None
    try:
        result = await generate_image(prompt=req.prompt, image_type=req.image_type, size=req.size)
    except Exception as exc:  # noqa: BLE001
        error = str(exc)[:500]
        result = None
    # Registro automático en la biblioteca (también los fallos).
    await service.register_imagen_generada(
        db,
        prompt_original=req.prompt,
        prompt_usado=(result.prompt_used if result else req.prompt),
        proveedor=(result.provider if result else "openai"),
        tipo_uso="apoyo_visual",
        modulo_origen="otro",
        size=req.size,
        public_url=(result.url if result else None),
        estado="failed" if (error or result is None or result.is_placeholder) else "success",
        reusable=not (error or result is None or result.is_placeholder),
        user_id=current_user.id,
        error=error,
        descripcion=service.build_default_description(tipo_uso="apoyo_visual", titulo=None, tema=req.prompt[:80]),
        tags=service.build_default_tags(tema=None, area=None, grado=None, tipo_uso=req.image_type),
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=error or "No se pudo generar la imagen")
    return {
        "url": result.url,
        "b64_data": result.b64_data,
        "provider": result.provider,
        "is_placeholder": result.is_placeholder,
    }


@biblioteca_router.get("", response_model=list[ImagenGeneradaRead])
async def list_imagenes(
    q: str | None = None,
    tema: str | None = None,
    area: str | None = None,
    grado: str | None = None,
    materia_id: UUID | None = None,
    tags: str | None = None,
    tipo_uso: str | None = None,
    modulo_origen: str | None = None,
    proveedor: str | None = None,
    calidad: str | None = None,
    reusable: bool | None = None,
    estado: str | None = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.list_imagenes_generadas(
        db,
        user_id=current_user.id,
        is_admin=current_user.rol == UserRole.ADMIN.value,
        q=q,
        tema=tema,
        area=area,
        grado=grado,
        materia_id=materia_id,
        tags=tags,
        tipo_uso=tipo_uso,
        modulo_origen=modulo_origen,
        proveedor=proveedor,
        calidad=calidad,
        reusable=reusable,
        estado=estado,
        limit=limit,
        offset=offset,
    )


@biblioteca_router.patch("/{imagen_id}", response_model=ImagenGeneradaRead)
async def update_imagen(
    imagen_id: UUID,
    payload: ImagenGeneradaUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    row = await service.get_imagen_or_404(db, imagen_id)
    if current_user.rol != UserRole.ADMIN.value and row.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return await service.update_imagen_generada(db, row, payload.model_dump(exclude_unset=True))
