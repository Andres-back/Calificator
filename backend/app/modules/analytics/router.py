"""Router de analítica — eventos del workspace."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.analytics import service
from app.modules.users.models import User

router = APIRouter(tags=["analytics"])


class EventoCreate(BaseModel):
    tipo: str = Field(..., min_length=1, max_length=60)
    evaluacion_id: UUID | None = None
    calificacion_id: UUID | None = None
    metadata_json: dict = {}


@router.post("/analytics/evento", status_code=201)
async def registrar_evento(
    payload: EventoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Registra un evento de analítica desde el frontend (fire-and-forget)."""
    max_tipo_len = 60
    if len(payload.tipo) > max_tipo_len:
        raise HTTPException(status_code=422, detail=f"tipo no puede exceder {max_tipo_len} caracteres")
    await service.registrar_evento(
        db,
        tipo=payload.tipo,
        actor_id=current_user.id,
        evaluacion_id=payload.evaluacion_id,
        calificacion_id=payload.calificacion_id,
        metadata_json=payload.metadata_json,
    )
    return {"status": "ok"}
