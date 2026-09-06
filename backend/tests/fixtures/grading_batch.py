from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID, uuid4


@dataclass(frozen=True)
class SyntheticDelivery:
    student_id: UUID
    delivery_id: UUID
    evidence: bytes


def synthetic_grading_batch(size: int = 30) -> list[SyntheticDelivery]:
    if not 1 <= size <= 30:
        raise ValueError("Synthetic grading batches must contain 1 to 30 items")
    return [
        SyntheticDelivery(
            student_id=uuid4(),
            delivery_id=uuid4(),
            evidence=f"synthetic-evidence-{index}".encode(),
        )
        for index in range(size)
    ]
