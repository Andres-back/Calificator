from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.users.schemas import UserSelfRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RegisterRequest(BaseModel):
    """Public registration never accepts a privileged role from the client."""

    nombre: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    solicitar_docente: bool = False

    model_config = ConfigDict(extra="forbid")


class AuthResponse(BaseModel):
    user: UserSelfRead

    @classmethod
    def from_user(cls, user: object) -> "AuthResponse":
        return cls(user=UserSelfRead.model_validate(user))
