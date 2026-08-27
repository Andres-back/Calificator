from fastapi.testclient import TestClient

from app.main import create_app
from app.modules.auth import password_recovery_service


async def no_db():
    yield object()


def test_password_recovery_request_is_neutral(monkeypatch):
    async def fake_create(*_args, **_kwargs):
        return None

    monkeypatch.setattr(
        password_recovery_service,
        "create_password_reset_request",
        fake_create,
    )
    app = create_app()
    from app.db.session import get_db
    app.dependency_overrides[get_db] = no_db

    response = TestClient(app, base_url="http://localhost").post(
        "/api/auth/password-recovery/request",
        json={"email": "missing@example.com"},
    )
    assert response.status_code == 202
    assert "Si existe una cuenta activa" in response.json()["detail"]


def test_admin_mail_configuration_requires_authentication():
    response = TestClient(create_app(), base_url="http://localhost").get(
        "/api/admin/mail/config"
    )
    assert response.status_code == 401