from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.shared.enums import SolicitudDocenteEstado, UserEstado, UserRole


class UserBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=160)
    email: EmailStr
    rol: UserRole = UserRole.ESTUDIANTE


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=160)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    rol: UserRole | None = None
    estado: UserEstado | None = None


class UserSelfUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=160)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class SolicitudDocenteDecision(StrEnum):
    APROBAR = "aprobar"
    RECHAZAR = "rechazar"


class SolicitudDocenteDecisionRequest(BaseModel):
    decision: SolicitudDocenteDecision
    motivo: str | None = Field(default=None, max_length=500)


class UserRead(BaseModel):
    id: UUID
    nombre: str
    email: EmailStr
    rol: UserRole
    estado: UserEstado
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserSelfRead(UserRead):
    solicitud_docente_estado: SolicitudDocenteEstado | None = None
    solicitud_docente_solicitada_at: datetime | None = None
    solicitud_docente_resuelta_at: datetime | None = None
    solicitud_docente_motivo: str | None = None


class AdminUserRead(UserSelfRead):
    solicitud_docente_revisada_por: UUID | None = None
