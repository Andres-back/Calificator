from __future__ import annotations

import json
from pathlib import Path

from app.modules.calificaciones.breakdown_policy import calculate_formula, coverage_state

FIXTURE = Path(__file__).parents[1] / "fixtures" / "resource_grading_sanitized.json"


def test_twenty_component_regression_keeps_formula_and_identity_stable() -> None:
    payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
    components = payload["grading"]["componentes"]

    first = calculate_formula(components, payload["grading"]["nota_maxima"])
    second = calculate_formula(components, payload["grading"]["nota_maxima"])
    coverage, blockers = coverage_state(components)

    assert len({item["componente_id"] for item in components}) == 20
    assert first == second
    assert float(first["puntos_posibles"]) == 5.0
    assert float(first["puntos_obtenidos"]) == 4.0
    assert float(first["nota_final"]) == 4.0
    assert coverage == "completa"
    assert blockers == []
