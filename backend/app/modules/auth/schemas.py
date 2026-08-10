from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.users.schemas import UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RegisterRequest(BaseModel):
    """Public registration never accepts a privileged role from the client."""

    nombre: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    model_config = ConfigDict(extra="forbid")


class AuthResponse(BaseModel):
    user: UserRead

    @classmethod
    def from_user(cls, user: object) -> "AuthResponse":
        return cls(user=UserRead.model_validate(user))
