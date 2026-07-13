from fastapi.testclient import TestClient

from app.main import create_app
from app.shared.constants import COOKIE_ACCESS_NAME, COOKIE_REFRESH_NAME


def test_logout_clears_auth_cookies() -> None:
    response = TestClient(create_app(), base_url="http://localhost").post("/api/auth/logout")

    assert response.status_code == 204
    set_cookie = response.headers.get("set-cookie", "")
    assert f"{COOKIE_ACCESS_NAME}=" in set_cookie
    assert f"{COOKIE_REFRESH_NAME}=" in set_cookie
    assert "Max-Age=0" in set_cookie
