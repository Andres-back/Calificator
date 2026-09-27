from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class FilaRead(BaseModel):
    id: UUID
    orden: int
    nombre_detectado: str
    nombre_revisado: str
    confianza: float
    requiere_revision: bool
    duplicado_confirmado: bool = False
    decision: str
    estudiante_existente_id: UUID | None
    advertencias: list[str] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


class LoteRead(BaseModel):
    id: UUID
    materia_id: UUID
    job_id: UUID | None
    archivo_nombre: str
    estado: str
    resultado_json: dict = Field(default_factory=dict)
    filas: list[FilaRead] = Field(default_factory=list)
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LoteCreated(BaseModel):
    id: UUID
    job_id: UUID
    estado: str


class FilaUpdate(BaseModel):
    id: UUID | None = None
    nombre_revisado: str = Field(min_length=2, max_length=160)
    decision: str = Field(pattern="^(crear|omitir|asociar)$")
    estudiante_existente_id: UUID | None = None
    duplicado_confirmado: bool = False

    @model_validator(mode="after")
    def validate_existing(self):
        if self.decision == "asociar" and self.estudiante_existente_id is None:
            raise ValueError("Selecciona el estudiante existente")
        return self


class LoteUpdate(BaseModel):
    filas: list[FilaUpdate] = Field(min_length=1, max_length=100)


class CredencialCreada(BaseModel):
    estudiante_id: UUID
    nombre: str
    email: str
    password_temporal: str


class ConfirmacionRead(BaseModel):
    creados: int
    matriculados_existentes: int
    ya_matriculados: int
    omitidos: int
    credenciales: list[CredencialCreada] = Field(default_factory=list)
    credenciales_mostradas_una_vez: bool = True


class ExistingStudentRead(BaseModel):
    id: UUID
    nombre: str
    email: str
    materias: list[str] = Field(default_factory=list)


class ExistingEnrollmentRequest(BaseModel):
    estudiante_ids: list[UUID] = Field(min_length=1, max_length=100)


class TemporaryPasswordRead(BaseModel):
    estudiante_id: UUID
    email: str
    password_temporal: str
