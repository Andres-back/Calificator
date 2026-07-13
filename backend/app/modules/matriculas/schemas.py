from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.materias.schemas import MateriaRead
from app.shared.enums import MatriculaEstado


class MatriculaJoinRequest(BaseModel):
    codigo_matricula: str = Field(min_length=4, max_length=30)


class MatriculaEstadoUpdate(BaseModel):
    estado: MatriculaEstado


class MatriculaRead(BaseModel):
    id: UUID
    materia_id: UUID
    estudiante_id: UUID
    estado: MatriculaEstado
    fecha_matricula: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MisMateriasRead(BaseModel):
    materias: list[MateriaRead]
