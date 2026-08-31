from __future__ import annotations

from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.main import create_app
from app.modules.authorization import service
from app.modules.users.models import User
from app.shared.enums import UserRole


async def _empty_db():
    yield object()


def _actor(*permissions: str) -> User:
    user = User(
        nombre="Administrador de prueba",
        email="roles-api@example.test",
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


def test_roles_api_allows_read_permission(monkeypatch) -> None:
    list_roles = AsyncMock(return_value=[])
    monkeypatch.setattr(service, "list_roles", list_roles)

    with _client(_actor("roles.read")) as client:
        response = client.get("/api/admin/roles")

    assert response.status_code == 200
    assert response.json() == []
    list_roles.assert_awaited_once()


def test_roles_api_denies_before_service_without_permission(monkeypatch) -> None:
    list_roles = AsyncMock(return_value=[])
    create_role = AsyncMock()
    monkeypatch.setattr(service, "list_roles", list_roles)
    monkeypatch.setattr(service, "create_role", create_role)

    with _client(_actor()) as client:
        read_response = client.get("/api/admin/roles")
        write_response = client.post(
            "/api/admin/roles",
            json={
                "name": "Rol no autorizado",
                "description": None,
                "active": True,
                "permission_keys": ["resources.read"],
                "expected_version": 0,
            },
        )

    assert read_response.status_code == 403
    assert write_response.status_code == 403
    list_roles.assert_not_awaited()
    create_role.assert_not_awaited()
