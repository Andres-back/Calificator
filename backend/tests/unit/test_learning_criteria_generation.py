from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest

from app.modules.criterios_aprendizaje.generation_service import normalize_proposal


def test_proposal_is_bounded_to_known_sources_and_sums_one_hundred() -> None:
    source_id = str(uuid4())
    criteria, coverage = normalize_proposal(
        {
            "criterios": [
                {
                    "nombre": "Comprende el concepto",
                    "descripcion": "Explica el concepto con sus propias palabras.",
                    "evidencia_esperada": "Una explicación relacionada con el material.",
                    "source_refs": [
                        {"source_id": source_id, "pagina": 2},
                        {"source_id": str(uuid4()), "pagina": 1},
                    ],
                },
                {
                    "nombre": "Aplica el procedimiento",
                    "descripcion": "Usa el procedimiento en una situación nueva.",
                    "evidencia_esperada": "Procedimiento visible y resultado coherente.",
                },
                {
                    "nombre": "Justifica su respuesta",
                    "descripcion": "Relaciona el resultado con los datos disponibles.",
                    "evidencia_esperada": "Argumento breve basado en el ejercicio.",
                },
            ],
            "cobertura": {"resumen": "Cubre la intención", "advertencias": []},
        },
        {source_id},
    )

    assert sum((item.peso_porcentaje for item in criteria), Decimal("0")) == Decimal("100.00")
    assert criteria[0].source_refs == [{"source_id": source_id, "pagina": 2}]
    assert all(len(item.niveles) == 4 for item in criteria)
    assert coverage["resumen"] == "Cubre la intención"


def test_empty_or_vague_provider_contract_is_not_accepted() -> None:
    with pytest.raises(ValueError, match="no devolvió criterios"):
        normalize_proposal({"criterios": []}, set())


def test_proposal_rejects_a_page_outside_the_uploaded_document() -> None:
    source_id = str(uuid4())
    criteria, _coverage = normalize_proposal({"criterios": [{
        "nombre": "Comprensión",
        "descripcion": "Interpreta la idea principal.",
        "evidencia_esperada": "Explicación justificada.",
        "source_refs": [{"source_id": source_id, "pagina": 99}],
    }]}, {source_id}, {source_id: 2})

    assert criteria[0].source_refs == []


def test_provider_cannot_hide_incomplete_criteria_among_valid_rows() -> None:
    criteria, _coverage = normalize_proposal(
        {
            "criterios": [
                {"nombre": "X", "descripcion": "no", "evidencia_esperada": ""},
                {
                    "nombre": "Producción escrita",
                    "descripcion": "Organiza las ideas en una secuencia comprensible.",
                    "evidencia_esperada": "Texto con inicio, desarrollo y cierre.",
                },
            ]
        },
        set(),
    )

    assert [item.nombre for item in criteria] == ["Producción escrita"]
    assert criteria[0].peso_porcentaje == Decimal("100.00")
