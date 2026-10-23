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


class ProviderCapacityUnavailable(RuntimeError):
    """Admission could not be coordinated; no provider request was sent."""

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
async def provider_capacity(*, strict: bool = False):
    """Wait for a global slot without imposing a timeout on live inference."""
    limit = max(1, int(settings.AI_PROVIDER_MAX_CONCURRENCY))
    token = uuid4().hex
    client: Redis | None = None
    key: str | None = None
    refresher: asyncio.Task | None = None
    owner_task = asyncio.current_task()
    previous_cancellations = owner_task.cancelling() if owner_task else 0
    lease_lost = False
    try:
        client = Redis.from_url(settings.REDIS_URL, decode_responses=True,
            **({"socket_connect_timeout": 5, "socket_timeout": 5} if strict else {}))
        while key is None:
            for index in range(limit):
                candidate = f"xcalificator:ai-provider-slot:{index}"
                if await client.set(candidate, token, nx=True, ex=_LEASE_SECONDS):
                    key = candidate
                    break
            if key is None:
                await asyncio.sleep(0.25)

        async def refresh() -> None:
            nonlocal lease_lost
            while True:
                await asyncio.sleep(_REFRESH_SECONDS)
                try:
                    renewed = await client.eval(
                        _REFRESH_SCRIPT, 1, key, token, _LEASE_SECONDS
                    )
                except RedisError as exc:
                    logger.warning("AI provider capacity lease could not renew: %s", exc)
                    if strict and owner_task:
                        lease_lost = True
                        owner_task.cancel()
                    return
                if not renewed:
                    logger.warning("AI provider capacity lease was lost")
                    if strict and owner_task:
                        lease_lost = True
                        owner_task.cancel()
                    return

        refresher = asyncio.create_task(refresh())
    except RedisError as exc:
        if strict:
            if client:
                with suppress(RedisError):
                    await client.aclose()
            raise ProviderCapacityUnavailable("capacity_unavailable") from exc
        # Queue durability is more important than a limiter during Redis incidents.
        logger.warning("AI provider capacity limiter unavailable; failing open: %s", exc)
    except BaseException:
        # Cancellation while waiting happens before yield/finally is entered.
        if client:
            if key:
                with suppress(RedisError):
                    await client.eval(_RELEASE_SCRIPT, 1, key, token)
            with suppress(RedisError):
                await client.aclose()
        raise

    try:
        yield
    except asyncio.CancelledError:
        if lease_lost and owner_task and owner_task.uncancel() <= previous_cancellations:
            raise ProviderCapacityUnavailable("capacity_lease_lost") from None
        raise
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
