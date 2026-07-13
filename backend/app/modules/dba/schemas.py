from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DBACreate(BaseModel):
    area: str = Field(min_length=2, max_length=100)
    grado: str = Field(min_length=1, max_length=30)
    codigo: str | None = Field(default=None, max_length=80)
    descripcion: str = Field(min_length=5)
    fuente: str | None = None
    activo: bool = True


class DBARead(BaseModel):
    id: UUID
    area: str
    grado: str
    codigo: str | None
    descripcion: str
    fuente: str | None
    activo: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DBAImportRequest(BaseModel):
    items: list[DBACreate] = Field(min_length=1)


# ── DBA personalizados por materia (Fase B) ─────────────────────────────────


class DBAPersonalizadoCreate(BaseModel):
    enunciado: str = Field(min_length=10)
    evidencias_aprendizaje: str | None = None
    ejemplo: str | None = None
    # Si no se envían, se toman de la materia.
    area: str | None = Field(default=None, max_length=100)
    grado: str | None = Field(default=None, max_length=30)


class DBAPersonalizadoUpdate(BaseModel):
    enunciado: str | None = Field(default=None, min_length=10)
    evidencias_aprendizaje: str | None = None
    ejemplo: str | None = None
    area: str | None = Field(default=None, max_length=100)
    grado: str | None = Field(default=None, max_length=30)
    activo: bool | None = None


class DBAPersonalizadoRead(BaseModel):
    id: UUID
    profesor_id: UUID
    materia_id: UUID
    area: str
    grado: str
    enunciado: str
    evidencias_aprendizaje: str | None
    ejemplo: str | None
    fuente: str
    activo: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DBAUnifiedItem(BaseModel):
    """Item combinado oficial + personalizado para una materia."""

    id: UUID
    fuente: Literal["oficial", "personalizado"]
    area: str
    grado: str
    codigo: str | None = None
    descripcion: str
    evidencias_aprendizaje: str | None = None
    ejemplo: str | None = None
