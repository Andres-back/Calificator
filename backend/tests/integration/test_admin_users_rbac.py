from __future__ import annotations

from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.main import create_app
from app.modules.users import service
from app.modules.users.models import User
from app.shared.enums import UserRole


async def _empty_db():
    yield object()


def _actor(*permissions: str) -> User:
    user = User(
        nombre="Administrador de prueba",
        email="users-api@example.test",
        password_hash="synthetic-test-only",
        rol=UserRole.ADMIN.value,
        estado="activo",
    )
    user._effective_permissions = frozenset(permissions)
    return user


def _client(actor: User) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: actor
    app.dependency_overrides[get_db] = _empty_db
    return TestClient(app, base_url="https://localhost")


def test_users_api_allows_read_permission(monkeypatch) -> None:
    list_users = AsyncMock(return_value=[])
    monkeypatch.setattr(service, "list_users", list_users)

    with _client(_actor("users.read")) as client:
        response = client.get("/api/admin/users?limit=25&offset=0")

    assert response.status_code == 200
    assert response.json() == []
    list_users.assert_awaited_once()


def test_users_api_denies_before_service_without_permission(monkeypatch) -> None:
    list_users = AsyncMock(return_value=[])
    validate_assignment = AsyncMock()
    monkeypatch.setattr(service, "list_users", list_users)
    monkeypatch.setattr(service, "validate_access_assignment", validate_assignment)

    with _client(_actor()) as client:
        read_response = client.get("/api/admin/users")
        write_response = client.post(
            "/api/admin/users",
            json={
                "nombre": "Usuario no autorizado",
                "email": "blocked@example.test",
                "password": "SyntheticPassword2026!",
                "rol": "estudiante",
                "estado": "activo",
            },
        )

    assert read_response.status_code == 403
    assert write_response.status_code == 403
    list_users.assert_not_awaited()
    validate_assignment.assert_not_awaited()
