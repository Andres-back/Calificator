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


def synthetic_review_rows() -> list[dict]:
    """Treinta matrículas; ocho PQRS, un cero y estados sin nota inventada."""
    rows = []
    for index, item in enumerate(synthetic_grading_batch()):
        state = "procesando" if index == 8 else "sin_entrega" if index == 9 else "publicada" if index == 10 else "sugerida"
        rows.append({
            "estudiante_id": item.student_id, "nombre": f"Alumno {index:02}",
            "calificacion_id": None if index == 9 else uuid4(),
            "entrega_id": None if index == 9 else item.delivery_id, "job_id": None,
            "estado": state, "nota": None if index in {8, 9} else 0 if index == 10 else 4,
            "resumen_revision": {
                "version": None if index == 11 else 1, "cobertura": None if index == 11 else "completa",
                "bloqueos": [], "componentes_pendientes": None if index == 11 else 0,
                "componentes_ilegibles": None if index == 11 else 0,
                "pqrs_abiertas": 1 if index < 8 else 0, "tiene_alertas": index < 8,
            },
        })
    return rows
