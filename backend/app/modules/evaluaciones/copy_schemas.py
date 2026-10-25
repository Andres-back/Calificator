from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CopyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    materia_destino_id: UUID
    request_key: UUID
    expected_updated_at: datetime
    expected_content_version_id: UUID | None = None
    nombre: str | None = Field(default=None, min_length=2, max_length=220)

    @field_validator('nombre', mode='before')
    @classmethod
    def trim_name(cls, value):
        return value.strip() if isinstance(value, str) else value


class CopyRead(BaseModel):
    job_id: UUID
    estado: str
    progreso: int
    materia_destino_id: UUID
    evaluacion_id: UUID | None = None
    error: str | None = None
    solicitud: CopyRequest | None = None
