"""Schemas para refuerzos pedagógicos."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class RefuerzoGenerarRequest(BaseModel):
    materia_id: UUID
    criterio_nombre: str = Field(..., min_length=1, max_length=220)
    porcentaje_logro: float = Field(ge=0, le=100)
    estudiantes_con_dificultad: int = Field(ge=0)
    total_estudiantes: int = Field(ge=1)
    tipo: str = Field(..., pattern=r"^(actividad|explicacion|ejercicio|plan_clase)$")


class RefuerzoRead(BaseModel):
    id: UUID
    tipo: str
    estado: str
    criterio_nombre: str | None
    contexto_json: dict
    contenido_json: dict
    modelo: str | None
    material_id: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RefuerzoUpdate(BaseModel):
    contenido_json: dict | None = None
    estado: str | None = Field(None, pattern=r"^(borrador|aprobado|descartado)$")
