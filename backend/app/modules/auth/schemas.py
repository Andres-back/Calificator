from pydantic import BaseModel, EmailStr, Field

from app.modules.users.schemas import UserCreate, UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RegisterRequest(UserCreate):
    pass


class AuthResponse(BaseModel):
    user: UserRead

    @classmethod
    def from_user(cls, user: object) -> "AuthResponse":
        return cls(user=UserRead.model_validate(user))
