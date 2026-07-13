from __future__ import annotations

from datetime import datetime
from uuid import UUID

from typing import Literal

from pydantic import BaseModel, Field


class PresentacionCreate(BaseModel):
    titulo: str
    materia_id: UUID | None = None
    tema: str
    grado: str | None = None
    area: str | None = None
    cantidad_slides: int = Field(default=8, ge=3, le=20)
    instrucciones: str | None = None
    incluir_imagenes: bool = True
    # Estilo educativo
    nivel: Literal["preescolar", "primaria", "secundaria", "media"] = "primaria"
    tono: Literal["divulgativo", "academico", "ludico"] = "divulgativo"
    # Imágenes
    densidad_imagenes: Literal["baja", "media", "alta"] = "alta"
    proveedor_imagenes: Literal["economico", "mixto", "premium"] = "premium"


class PresentacionRead(BaseModel):
    id: UUID
    profesor_id: UUID
    materia_id: UUID | None
    titulo: str
    estado: str
    pptx_url: str | None
    pdf_url: str | None
    presenton_id: str | None
    error: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PresentacionEstadoRead(BaseModel):
    id: UUID
    estado: str
    progreso: int = 0
    pptx_url: str | None
    pdf_url: str | None = None
    error: str | None

    model_config = {"from_attributes": True}


class PresentacionExportRequest(BaseModel):
    format: Literal["pptx", "pdf"] = "pptx"


class PresentacionEditorUrlRead(BaseModel):
    url: str
    expires_in: int
