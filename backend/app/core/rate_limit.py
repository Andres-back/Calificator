from __future__ import annotations

import asyncio
import hashlib
import time
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import HTTPException, Request, status

from redis.exceptions import RedisError

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
RateLimitDependency = Callable[[Request], Awaitable[None]]

_redis: Any | None = None
_redis_loop: asyncio.AbstractEventLoop | None = None
_fallback: dict[str, tuple[int, float]] = {}
_fallback_lock = asyncio.Lock()
_ATOMIC_INCREMENT = """
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('TTL', KEYS[1])}
"""


def _redis_client() -> Any:
    global _redis, _redis_loop
    current_loop = asyncio.get_running_loop()
    if _redis is None or _redis_loop is not current_loop:
        from redis.asyncio import Redis

        _redis = Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=0.25,
            socket_timeout=0.5,
        )
        _redis_loop = current_loop
    return _redis


def _client_key(request: Request, scope: str) -> str:
    # No se confía en X-Forwarded-For: el proxy debe entregar la IP real a ASGI.
    host = request.client.host if request.client else "unknown"
    digest = hashlib.sha256(f"{scope}:{host}".encode()).hexdigest()
    return f"xcalificator:rate:{digest}"


async def _fallback_increment(key: str, window_seconds: int) -> tuple[int, int]:
    now = time.monotonic()
    async with _fallback_lock:
        count, expires_at = _fallback.get(key, (0, now + window_seconds))
        if expires_at <= now:
            count, expires_at = 0, now + window_seconds
        count += 1
        _fallback[key] = (count, expires_at)
        if len(_fallback) > 10_000:
            expired = [item for item, (_, expiry) in _fallback.items() if expiry <= now]
            for item in expired:
                _fallback.pop(item, None)
    return count, max(1, int(expires_at - now))


def rate_limit(*, limit: int, window_seconds: int, scope: str) -> RateLimitDependency:
    """Límite por IP con Redis y respaldo local si Redis está temporalmente caído."""
    async def dependency(request: Request) -> None:
        key = _client_key(request, scope)
        retry_after = window_seconds
        try:
            count_raw, ttl_raw = await _redis_client().eval(
                _ATOMIC_INCREMENT, 1, key, window_seconds,
            )
            count = int(count_raw)
            retry_after = int(ttl_raw) if int(ttl_raw) > 0 else window_seconds
        except (ImportError, RedisError, OSError, TimeoutError) as exc:
            logger.warning(
                "Redis rate limit unavailable; using local guard: %s",
                type(exc).__name__,
            )
            count, retry_after = await _fallback_increment(key, window_seconds)

        if count > limit:
            logger.info("Rate limit applied scope=%s", scope)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiadas solicitudes. Espera un momento e intenta nuevamente.",
                headers={"Retry-After": str(retry_after)},
            )

    return dependency
