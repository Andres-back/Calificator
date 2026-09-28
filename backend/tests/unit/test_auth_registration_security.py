from unittest.mock import AsyncMock
from types import SimpleNamespace
from uuid import uuid4

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
                "acepta_terminos": True,
                "acepta_privacidad": True,
                "rol": "profesor",
            }
        )


@pytest.mark.anyio
async def test_public_registration_always_creates_student(monkeypatch) -> None:
    captured = {}

    async def create_user(_db, payload, *, commit=True):
        captured["payload"] = payload
        captured["commit"] = commit
        return SimpleNamespace(id=uuid4())

    monkeypatch.setattr(service.user_service, "create_user", create_user)
    payload = RegisterRequest(
        nombre="Nueva estudiante",
        email="estudiante@example.com",
        password="strong-password",
        acepta_terminos=True,
        acepta_privacidad=True,
    )

    db = AsyncMock()
    await service.register_public_user(db, payload)

    assert captured["payload"].rol == UserRole.ESTUDIANTE
    assert captured["commit"] is False
    db.execute.assert_awaited_once()
