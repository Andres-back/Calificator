from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.csrf import CSRFMiddleware


def _app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(CSRFMiddleware)

    @app.post("/api/mutacion")
    async def mutation() -> dict[str, bool]:
        return {"ok": True}

    @app.post("/api/auth/login")
    async def login() -> dict[str, bool]:
        return {"ok": True}

    return app


def test_cookie_authenticated_mutation_requires_csrf_token() -> None:
    client = TestClient(_app())
    client.cookies.set("access_token", "session")

    response = client.post("/api/mutacion")

    assert response.status_code == 403


def test_matching_double_submit_token_allows_mutation() -> None:
    client = TestClient(_app())
    client.cookies.set("access_token", "session")
    client.cookies.set("xcalificator_csrf", "known-token")

    response = client.post(
        "/api/mutacion",
        headers={"X-CSRF-Token": "known-token"},
    )

    assert response.status_code == 200


def test_login_remains_available_without_existing_csrf_token() -> None:
    client = TestClient(_app())
    client.cookies.set("access_token", "stale-session")

    response = client.post("/api/auth/login")

    assert response.status_code == 200