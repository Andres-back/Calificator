from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from typing import Any, Iterable
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.main import create_app
from app.modules.users.models import User
from app.shared.enums import UserRole


AUTHORIZATION_SURFACES = {
    "GET /materias/{id}/asistencia",
    "PUT /materias/{id}/asistencia",
    "GET /materias/{id}/dba",
    "GET /herramientas/materias/{id}/recursos",
    "GET /herramientas/{id}",
    "GET /presentaciones",
    "GET /presentaciones/{id}/estado",
    "GET /presentaciones/{id}/preview",
    "POST /analytics/evento",
    "PATCH /incidencias/{id}/resolver",
}


def make_user(role: UserRole | str, *, user_id: UUID | None = None) -> User:
    role_value = role.value if isinstance(role, UserRole) else role
    return User(
        id=user_id or uuid4(),
        nombre=f"Usuario {role_value}",
        email=f"{role_value}-{uuid4().hex[:10]}@example.test",
        password_hash="unit-test-only",
        rol=role_value,
        estado="activo",
    )


async def empty_db_override():
    yield object()


def authenticated_client(user: User, *, db_override=empty_db_override) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = db_override
    return TestClient(app, base_url="http://localhost")


def unauthenticated_client() -> TestClient:
    return TestClient(create_app(), base_url="http://localhost")


def assert_denied(
    response,
    *,
    statuses: Iterable[int] = (403, 404),
    forbidden_values: Iterable[str] = (),
) -> None:
    assert response.status_code in set(statuses), response.text
    body = response.text.lower()
    for value in forbidden_values:
        assert value.lower() not in body


def snapshot(value: Any) -> Any:
    return deepcopy(value)


def assert_unchanged(before: Any, after: Any) -> None:
    assert after == before


@dataclass(frozen=True)
class AuthorizationActors:
    owner: User
    outsider: User
    student: User
    admin: User


@pytest.fixture
def authorization_actors() -> AuthorizationActors:
    return AuthorizationActors(
        owner=make_user(UserRole.PROFESOR),
        outsider=make_user(UserRole.PROFESOR),
        student=make_user(UserRole.ESTUDIANTE),
        admin=make_user(UserRole.ADMIN),
    )


@pytest.fixture
def authorization_objects() -> dict[str, Any]:
    return {
        "materia_id": uuid4(),
        "foreign_materia_id": uuid4(),
        "material_id": uuid4(),
        "foreign_material_id": uuid4(),
        "presentacion_id": uuid4(),
        "foreign_presentacion_id": uuid4(),
        "incidencia_id": uuid4(),
        "enrollment_active": True,
        "published": True,
    }
