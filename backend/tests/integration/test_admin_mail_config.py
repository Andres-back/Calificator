from collections.abc import AsyncGenerator
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.main import create_app
from app.modules.users.models import User
from app.shared.enums import UserRole


class EmptyMailDb:
    async def get(self, _model, _identifier):
        return None


async def empty_mail_db() -> AsyncGenerator[EmptyMailDb, None]:
    yield EmptyMailDb()


def user(role: UserRole) -> User:
    return User(
        id=uuid4(),
        nombre=f"Test {role.value}",
        email=f"{role.value}@example.com",
        password_hash="not-used",
        rol=role.value,
        estado="activo",
        auth_version=1,
    )


def client_for(role: UserRole) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: user(role)
    app.dependency_overrides[get_db] = empty_mail_db
    return TestClient(app, base_url="http://localhost")


def test_admin_can_read_mail_metadata_without_a_secret():
    response = client_for(UserRole.ADMIN).get("/api/admin/mail/config")
    assert response.status_code == 200, response.text
    payload = response.json()
    assert "password" not in payload
    assert payload["has_password"] is False


def test_teacher_and_student_cannot_read_mail_configuration():
    for role in (UserRole.PROFESOR, UserRole.ESTUDIANTE):
        response = client_for(role).get("/api/admin/mail/config")
        assert response.status_code == 403
        assert "password" not in response.text.lower()