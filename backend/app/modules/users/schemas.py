from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.shared.enums import UserEstado, UserRole


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


class UserRead(BaseModel):
    id: UUID
    nombre: str
    email: EmailStr
    rol: UserRole
    estado: UserEstado
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
