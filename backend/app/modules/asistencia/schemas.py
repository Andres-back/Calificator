from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.shared.enums import AsistenciaEstado


class AsistenciaRegistroInput(BaseModel):
    estudiante_id: UUID
    estado: AsistenciaEstado
    observacion: str | None = Field(default=None, max_length=300)


class AsistenciaDiaUpsert(BaseModel):
    fecha: date
    registros: list[AsistenciaRegistroInput]

    @model_validator(mode="after")
    def reject_duplicate_students(self) -> "AsistenciaDiaUpsert":
        student_ids = [registro.estudiante_id for registro in self.registros]
        if len(student_ids) != len(set(student_ids)):
            raise ValueError("No puedes registrar dos veces al mismo estudiante.")
        return self


class AsistenciaEstudianteRead(BaseModel):
    estudiante_id: UUID
    estudiante_nombre: str
    estudiante_email: str
    estado: AsistenciaEstado | None
    observacion: str | None


class AsistenciaResumenRead(BaseModel):
    total: int
    presentes: int
    tarde: int
    ausentes: int
    excusas: int
    pendientes: int


class AsistenciaDiaRead(BaseModel):
    materia_id: UUID
    fecha: date
    registros: list[AsistenciaEstudianteRead]
    resumen: AsistenciaResumenRead
