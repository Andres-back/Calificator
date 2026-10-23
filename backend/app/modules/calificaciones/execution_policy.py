"""Provider-neutral grading policy, shared by runtime and administration."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

import httpx

from app.services.ai_provider_capacity import ProviderCapacityUnavailable, provider_capacity

CALL_TIMEOUT_SECONDS = 60
MAX_STAGE_ATTEMPTS = 2
BOUNDED_STAGES = frozenset({"grading_primary", "grading_secondary", "targeted_recheck"})
TRANSIENT_ERRORS = frozenset({
    "provider_read_timeout", "provider_connect_timeout", "provider_write_timeout",
    "provider_pool_timeout", "provider_deadline_exceeded", "provider_timeout",
    "provider_network_error", "capacity_unavailable", "worker_interrupted",
    *(f"http_{status}" for status in (408, 425, 429, 500, 502, 503, 504)),
})


def execution_policy() -> dict:
    return {"schema_version": 1, "call_timeout_seconds": CALL_TIMEOUT_SECONDS,
            "max_stage_attempts": MAX_STAGE_ATTEMPTS}


def provider_error_code(exc: Exception) -> str:
    for kind, code in (
        (httpx.ConnectTimeout, "provider_connect_timeout"),
        (httpx.ReadTimeout, "provider_read_timeout"),
        (httpx.WriteTimeout, "provider_write_timeout"),
        (httpx.PoolTimeout, "provider_pool_timeout"),
        (httpx.TimeoutException, "provider_timeout"),
        (TimeoutError, "provider_deadline_exceeded"),
        (ProviderCapacityUnavailable, "capacity_unavailable"),
    ):
        if isinstance(exc, kind):
            return code
    if isinstance(exc, httpx.HTTPStatusError):
        return f"http_{exc.response.status_code}"
    if isinstance(exc, (httpx.NetworkError, httpx.RemoteProtocolError)):
        return "provider_network_error"
    return "provider_error"


@asynccontextmanager
async def grading_call_window(stage: str):
    """Admission wait is outside the inference deadline; other uses unchanged."""
    if stage not in BOUNDED_STAGES:
        yield
        return
    async with provider_capacity(strict=True):
        async with asyncio.timeout(CALL_TIMEOUT_SECONDS):
            yield
