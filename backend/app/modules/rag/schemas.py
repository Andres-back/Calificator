from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.shared.enums import RagTipo


class RagSourceCreate(BaseModel):
    materia_id: UUID | None = None
    tipo: RagTipo
    titulo: str
    contenido: str


class RagIngestRequest(BaseModel):
    source_id: UUID


class RagSearchRequest(BaseModel):
    query: str
    materia_id: UUID | None = None
    tipo: RagTipo | None = None
    limit: int = Field(default=8, ge=1, le=20)


class RagChunkRead(BaseModel):
    id: UUID
    chunk_text: str
    tipo: str
    similarity: float = 0.0
    metadata_json: dict = {}

    model_config = {"from_attributes": True}


class RagSourceRead(BaseModel):
    id: UUID
    materia_id: UUID | None
    tipo: str
    titulo: str
    created_at: datetime

    model_config = {"from_attributes": True}
