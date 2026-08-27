from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError

from app.modules.auth import service
from app.modules.auth.schemas import RegisterRequest
from app.shared.enums import UserRole


def test_public_registration_rejects_role_field() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest.model_validate(
            {
                "nombre": "Docente no autorizado",
                "email": "docente@example.com",
                "password": "strong-password",
                "rol": "profesor",
            }
        )


@pytest.mark.anyio
async def test_public_registration_always_creates_student(monkeypatch) -> None:
    captured = {}

    async def create_user(_db, payload, *, commit=True):
        captured["payload"] = payload
        captured["commit"] = commit
        return object()

    monkeypatch.setattr(service.user_service, "create_user", create_user)
    payload = RegisterRequest(
        nombre="Nueva estudiante",
        email="estudiante@example.com",
        password="strong-password",
    )

    await service.register_public_user(AsyncMock(), payload)

    assert captured["payload"].rol == UserRole.ESTUDIANTE
    assert captured["commit"] is False
