from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ImageGenerationRequest(BaseModel):
    prompt: str
    image_type: str = "simple"
    size: str = "1024x1024"


class ImageGenerationResponse(BaseModel):
    url: str | None
    b64_data: str | None
    provider: str
    is_placeholder: bool = False


class ImagenGeneradaRead(BaseModel):
    id: UUID
    url: str | None = Field(default=None, validation_alias="public_url")
    descripcion: str | None
    tags: list[str]
    tema: str | None
    area: str | None
    grado: str | None
    tipo_uso: str
    modulo_origen: str
    proveedor: str
    modelo: str
    calidad: str
    size: str
    costo_estimado: Decimal | None
    prompt_original: str
    prompt_normalizado: str | None
    prompt_usado: str
    restricciones: str | None
    prompt_hash: str
    file_hash: str | None
    estado: str
    reusable: bool
    presentation_id: UUID | None
    slide_index: int | None
    materia_id: UUID | None
    error: str | None
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class ImagenGeneradaUpdate(BaseModel):
    tags: list[str] | None = None
    descripcion: str | None = None
    reusable: bool | None = None
    estado: str | None = None
