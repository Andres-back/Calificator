from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any


@dataclass
class DeterministicAIProvider:
    latency_ms: int = 0
    fail_on_calls: set[int] = field(default_factory=set)
    truncate_on_calls: set[int] = field(default_factory=set)
    calls: int = 0

    async def generate_json(
        self,
        _feature: str,
        _prompt: str,
        *,
        response: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        self.calls += 1
        call_number = self.calls
        if self.latency_ms:
            await asyncio.sleep(self.latency_ms / 1000)
        if call_number in self.fail_on_calls:
            raise ConnectionError(f"deterministic-provider-failure-{call_number}")
        if call_number in self.truncate_on_calls:
            raise RuntimeError(f"deterministic-output-truncated-{call_number}")
        return response or {"ok": True, "call": call_number}
