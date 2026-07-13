from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.users.schemas import UserRead
from app.shared.enums import MateriaEstado


class MateriaCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=180)
    area: str | None = Field(default=None, max_length=100)
    grado: str | None = Field(default=None, max_length=30)
    descripcion: str | None = None
    requiere_aprobacion: bool = False


class MateriaUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=180)
    area: str | None = Field(default=None, max_length=100)
    grado: str | None = Field(default=None, max_length=30)
    descripcion: str | None = None
    codigo_activo: bool | None = None
    requiere_aprobacion: bool | None = None
    estado: MateriaEstado | None = None


class MateriaRead(BaseModel):
    id: UUID
    profesor_id: UUID
    nombre: str
    area: str | None
    grado: str | None
    descripcion: str | None
    codigo_matricula: str
    codigo_activo: bool
    requiere_aprobacion: bool
    estado: MateriaEstado
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MateriaStudentsRead(MateriaRead):
    estudiantes: list[UserRead] = Field(default_factory=list)
