from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from redis.exceptions import RedisError
from starlette.requests import Request

from app.core import rate_limit as rate_limit_module


def _request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/auth/login",
            "headers": [],
            "client": ("127.0.0.1", 1234),
        },
    )


@pytest.mark.anyio
async def test_local_guard_limits_when_redis_is_unavailable(monkeypatch) -> None:
    redis = AsyncMock()
    redis.eval.side_effect = RedisError("offline")
    monkeypatch.setattr(rate_limit_module, "_redis_client", lambda: redis)
    rate_limit_module._fallback.clear()
    dependency = rate_limit_module.rate_limit(
        limit=2,
        window_seconds=60,
        scope="unit-login",
    )

    await dependency(_request())
    await dependency(_request())
    with pytest.raises(HTTPException) as exc_info:
        await dependency(_request())

    assert exc_info.value.status_code == 429
    assert exc_info.value.headers["Retry-After"]