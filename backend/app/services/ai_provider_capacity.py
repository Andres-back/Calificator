"""Distributed, renewable provider capacity shared by all worker queues."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, suppress
from typing import Any
from uuid import uuid4

from redis.exceptions import RedisError

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:
    class Redis:  # type: ignore[no-redef]
        """Fail-open adapter for tooling environments with redis-py < 4.2."""

        @classmethod
        def from_url(cls, *_args: Any, **_kwargs: Any) -> Any:
            raise RedisError("redis asyncio client is unavailable")

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
_LEASE_SECONDS = 120
_REFRESH_SECONDS = 30

_REFRESH_SCRIPT = """
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('expire', KEYS[1], ARGV[2])
end
return 0
"""
_RELEASE_SCRIPT = """
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0
"""


@asynccontextmanager
async def provider_capacity():
    """Wait for a global slot without imposing a timeout on live inference."""
    limit = max(1, int(settings.AI_PROVIDER_MAX_CONCURRENCY))
    token = uuid4().hex
    client: Redis | None = None
    key: str | None = None
    refresher: asyncio.Task | None = None
    try:
        client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        while key is None:
            for index in range(limit):
                candidate = f"xcalificator:ai-provider-slot:{index}"
                if await client.set(candidate, token, nx=True, ex=_LEASE_SECONDS):
                    key = candidate
                    break
            if key is None:
                await asyncio.sleep(0.25)

        async def refresh() -> None:
            while True:
                await asyncio.sleep(_REFRESH_SECONDS)
                try:
                    renewed = await client.eval(
                        _REFRESH_SCRIPT, 1, key, token, _LEASE_SECONDS
                    )
                except RedisError as exc:
                    logger.warning("AI provider capacity lease could not renew: %s", exc)
                    return
                if not renewed:
                    logger.warning("AI provider capacity lease was lost")
                    return

        refresher = asyncio.create_task(refresh())
    except RedisError as exc:
        # Queue durability is more important than a limiter during Redis incidents.
        logger.warning("AI provider capacity limiter unavailable; failing open: %s", exc)

    try:
        yield
    finally:
        if refresher:
            refresher.cancel()
            with suppress(asyncio.CancelledError, RedisError):
                await refresher
        if client:
            if key:
                with suppress(RedisError):
                    await client.eval(_RELEASE_SCRIPT, 1, key, token)
            with suppress(RedisError):
                await client.aclose()
