from __future__ import annotations

from statistics import quantiles
from time import perf_counter

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.core.permissions import get_current_user, require_permission
from app.db.session import get_db
from app.modules.authorization.catalog import ALL_PERMISSION_KEYS
from app.modules.users import service as users_service
from app.modules.users.models import User
from app.shared.enums import UserRole


async def _empty_db():
    yield object()


def _actor(permissions: frozenset[str]) -> User:
    user = User(
        nombre="Actor de matriz",
        email="permission-matrix@example.test",
        password_hash="synthetic-test-only",
        rol=UserRole.ADMIN.value,
        estado="activo",
    )
    user._effective_permissions = permissions
    return user


def _matrix_app(actor: User) -> FastAPI:
    app = FastAPI()
    app.dependency_overrides[get_current_user] = lambda: actor
    app.dependency_overrides[get_db] = _empty_db
    for index, permission_key in enumerate(sorted(ALL_PERMISSION_KEYS)):
        async def check(_: User = Depends(require_permission(permission_key))) -> dict[str, bool]:
            return {"allowed": True}

        app.add_api_route(f"/permission/{index}", check, methods=["GET"])
    return app


def test_every_catalog_permission_has_allowed_and_denied_api_contract() -> None:
    ordered = sorted(ALL_PERMISSION_KEYS)
    allowed_actor = _actor(frozenset(ordered))
    denied_actor = _actor(frozenset())

    with TestClient(_matrix_app(allowed_actor)) as allowed_client:
        allowed_statuses = [allowed_client.get(f"/permission/{index}").status_code for index in range(len(ordered))]
    with TestClient(_matrix_app(denied_actor)) as denied_client:
        denied_statuses = [denied_client.get(f"/permission/{index}").status_code for index in range(len(ordered))]

    assert allowed_statuses == [200] * len(ordered)
    assert denied_statuses == [403] * len(ordered)


def test_preloaded_permission_resolution_is_below_50_ms_p95() -> None:
    actor = _actor(ALL_PERMISSION_KEYS)
    app = _matrix_app(actor)
    samples: list[float] = []

    with TestClient(app) as client:
        for _ in range(100):
            started = perf_counter()
            response = client.get("/permission/0")
            samples.append((perf_counter() - started) * 1000)
            assert response.status_code == 200

    p95 = quantiles(samples, n=100, method="inclusive")[94]
    assert p95 < 50, f"La resolución p95 fue {p95:.2f} ms"


@pytest.mark.anyio
async def test_user_listing_keeps_database_pagination_at_the_10000th_record() -> None:
    class FakeDb:
        def __init__(self) -> None:
            self.statement = None

        async def scalars(self, statement):
            self.statement = statement
            return []

    db = FakeDb()
    result = await users_service.list_users(db, limit=100, offset=9900)

    assert result == []
    compiled = db.statement.compile()
    assert compiled.params["param_1"] == 100
    assert compiled.params["param_2"] == 9900
