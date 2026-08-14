"""Compatibility adapter for the canonical AI usage event ledger.

New code should call ``app.modules.analytics.usage_logger.log_ai_usage``
directly. This class remains temporarily so external imports do not break while
the deprecated ``ai_usage_logs`` table is retired in a later release.
"""
from __future__ import annotations

import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import AsyncGenerator
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.analytics.usage_logger import log_ai_usage


class UsageLogger:
    """Preserve the old API while writing only to ``ai_usage_events``."""

    def __init__(self, db: AsyncSession) -> None:
        # Kept for constructor compatibility. The canonical logger deliberately
        # owns a short-lived session so usage telemetry cannot roll back the
        # caller's academic transaction.
        self._db = db

    async def log(
        self,
        *,
        provider: str,
        model: str,
        tipo: str,
        tokens_input: int = 0,
        tokens_output: int = 0,
        latencia_ms: int | None = None,
        costo_estimado: float | None = None,
        success: bool = True,
        error: str | None = None,
        user_id: UUID | None = None,
    ) -> None:
        # ``ai_usage_events`` does not store a user identifier and calculates
        # costs centrally from provider/model pricing. Accept both deprecated
        # arguments so old callers remain source-compatible.
        del costo_estimado, user_id

        completed_at = datetime.now(timezone.utc)
        elapsed_ms = max(latencia_ms or 0, 0)
        started_at = completed_at - timedelta(milliseconds=elapsed_ms)
        await log_ai_usage(
            feature=tipo or "legacy",
            stage="compat_usage_logger",
            provider=provider,
            model=model,
            status="success" if success else "failed",
            started_at=started_at,
            completed_at=completed_at,
            latency_ms=latencia_ms,
            input_tokens=tokens_input,
            output_tokens=tokens_output,
            error_code=error[:160] if error else None,
        )

    @asynccontextmanager
    async def track(
        self,
        *,
        provider: str,
        model: str,
        tipo: str,
        user_id: UUID | None = None,
    ) -> AsyncGenerator[dict, None]:
        """Measure a compatible operation and persist it in the canonical ledger."""
        meta: dict = {"tokens_input": 0, "tokens_output": 0}
        start = time.monotonic()
        try:
            yield meta
            latency = int((time.monotonic() - start) * 1000)
            await self.log(
                provider=provider,
                model=model,
                tipo=tipo,
                tokens_input=meta.get("tokens_input", 0),
                tokens_output=meta.get("tokens_output", 0),
                latencia_ms=latency,
                costo_estimado=meta.get("costo_estimado"),
                success=True,
                user_id=user_id,
            )
        except Exception as exc:
            latency = int((time.monotonic() - start) * 1000)
            await self.log(
                provider=provider,
                model=model,
                tipo=tipo,
                latencia_ms=latency,
                success=False,
                error=str(exc)[:500],
                user_id=user_id,
            )
            raise