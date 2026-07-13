from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class JobRead(BaseModel):
    id: UUID
    tipo: str
    estado: str
    progreso: int
    resultado_json: dict
    error: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None

    model_config = {"from_attributes": True}


class JobEstadoRead(BaseModel):
    id: UUID
    estado: str
    progreso: int
    error: str | None

    model_config = {"from_attributes": True}
