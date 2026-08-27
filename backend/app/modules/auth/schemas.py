from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

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


class PasswordResetRequestCreate(BaseModel):
    email: EmailStr

    model_config = ConfigDict(extra="forbid")


class PasswordResetValidateRequest(BaseModel):
    token: str = Field(min_length=20, max_length=512)

    model_config = ConfigDict(extra="forbid")


class PasswordResetConsumeRequest(PasswordResetValidateRequest):
    password: str = Field(min_length=8, max_length=128)
    password_confirmation: str = Field(min_length=8, max_length=128)

    @model_validator(mode="after")
    def passwords_match(self) -> "PasswordResetConsumeRequest":
        if self.password != self.password_confirmation:
            raise ValueError("Las contraseñas no coinciden.")
        return self


class PublicMessage(BaseModel):
    detail: str


class PasswordResetValidation(BaseModel):
    valid: bool
    detail: str


class AuthResponse(BaseModel):
    user: UserSelfRead

    @classmethod
    def from_user(cls, user: object) -> "AuthResponse":
        return cls(user=UserSelfRead.model_validate(user))