"""Registro de uso de IA en ai_usage_logs."""
from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger

logger = get_logger(__name__)


class UsageLogger:
    """Registra cada llamada IA en la tabla ai_usage_logs."""

    def __init__(self, db: AsyncSession) -> None:
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
        try:
            await self._db.execute(
                text(
                    "INSERT INTO ai_usage_logs "
                    "(provider, model, tipo, tokens_input, tokens_output, "
                    "latencia_ms, costo_estimado, success, error, user_id) "
                    "VALUES (:provider, :model, :tipo, :tokens_input, :tokens_output, "
                    ":latencia_ms, :costo_estimado, :success, :error, :user_id)"
                ),
                {
                    "provider": provider,
                    "model": model,
                    "tipo": tipo,
                    "tokens_input": tokens_input,
                    "tokens_output": tokens_output,
                    "latencia_ms": latencia_ms,
                    "costo_estimado": costo_estimado,
                    "success": success,
                    "error": error,
                    "user_id": str(user_id) if user_id else None,
                },
            )
            await self._db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to write usage log: %s", exc)

    @asynccontextmanager
    async def track(
        self,
        *,
        provider: str,
        model: str,
        tipo: str,
        user_id: UUID | None = None,
    ) -> AsyncGenerator[dict, None]:
        """Context manager: mide tiempo y guarda el log automáticamente."""
        meta: dict = {"tokens_input": 0, "tokens_output": 0}
        start = time.monotonic()
        try:
            yield meta
            latencia = int((time.monotonic() - start) * 1000)
            await self.log(
                provider=provider,
                model=model,
                tipo=tipo,
                tokens_input=meta.get("tokens_input", 0),
                tokens_output=meta.get("tokens_output", 0),
                latencia_ms=latencia,
                costo_estimado=meta.get("costo_estimado"),
                success=True,
                user_id=user_id,
            )
        except Exception as exc:
            latencia = int((time.monotonic() - start) * 1000)
            await self.log(
                provider=provider,
                model=model,
                tipo=tipo,
                latencia_ms=latencia,
                success=False,
                error=str(exc)[:500],
                user_id=user_id,
            )
            raise
