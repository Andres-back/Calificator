"""Proveedores simulados y reloj controlado para pipelines de IA."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ControlledClock:
    milliseconds: int = 0

    def advance(self, value: int) -> None:
        self.milliseconds += max(0, value)

    def monotonic(self) -> float:
        return self.milliseconds / 1000


@dataclass
class FakeProvider:
    outcomes: list[Any]
    calls: list[dict[str, Any]] = field(default_factory=list)

    async def __call__(self, **kwargs) -> Any:
        self.calls.append({
            key: value for key, value in kwargs.items()
            if key not in {"prompt", "messages", "image_bytes", "content"}
        })
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome
