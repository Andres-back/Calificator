from decimal import Decimal

from app.modules.calificaciones.breakdown_policy import calculate_formula
from app.modules.criterios_aprendizaje.grading_mapping import build_criterion_allocations


def test_explicit_criteria_map_to_answer_without_changing_formula() -> None:
    components = [
        {
            "tipo": "pregunta",
            "numero": "1",
            "puntos_maximos": Decimal("2"),
            "puntos_obtenidos": Decimal("1.5"),
        }
    ]
    blueprint = {
        "preguntas": [
            {"numero": 1, "learning_criterion_keys": ["procedimiento", "resultado"]}
        ]
    }
    snapshot = {
        "criterios": [
            {"stable_key": "procedimiento", "nombre": "Procedimiento"},
            {"stable_key": "resultado", "nombre": "Resultado"},
        ]
    }
    before = calculate_formula(components, Decimal("5"))

    allocations = build_criterion_allocations(
        components, blueprint=blueprint, snapshot=snapshot
    )
    after = calculate_formula(components, Decimal("5"))

    assert [item["criterion_stable_key"] for item in allocations[0]] == [
        "procedimiento",
        "resultado",
    ]
    assert sum((item["max_points"] for item in allocations[0]), Decimal("0")) == Decimal("2")
    assert sum((item["awarded_points"] for item in allocations[0]), Decimal("0")) == Decimal("1.5")
    assert after == before


def test_mapping_does_not_invent_relationship_when_ambiguous() -> None:
    allocations = build_criterion_allocations(
        [{"tipo": "pregunta", "numero": "2", "puntos_maximos": 1, "puntos_obtenidos": 1}],
        blueprint={"preguntas": [{"numero": 2}]},
        snapshot={
            "criterios": [
                {"stable_key": "a", "nombre": "A"},
                {"stable_key": "b", "nombre": "B"},
            ]
        },
    )

    assert allocations == [[]]


def test_single_criterion_is_safe_fallback_for_each_response() -> None:
    allocations = build_criterion_allocations(
        [{"tipo": "pregunta", "numero": "1", "puntos_maximos": 1, "puntos_obtenidos": None}],
        blueprint={"preguntas": [{"numero": 1}]},
        snapshot={"criterios": [{"stable_key": "ortografia", "nombre": "Ortografía"}]},
    )

    assert allocations[0][0]["criterion_stable_key"] == "ortografia"
    assert allocations[0][0]["awarded_points"] is None


def test_unanswered_component_keeps_all_criterion_links_without_an_invented_score() -> None:
    allocations = build_criterion_allocations(
        [{"tipo": "pregunta", "numero": "1", "puntos_maximos": Decimal("3"), "puntos_obtenidos": None}],
        blueprint={"preguntas": [{"numero": 1, "learning_criterion_keys": ["metodo", "resultado"]}]},
        snapshot={"criterios": [
            {"stable_key": "metodo", "nombre": "Método"},
            {"stable_key": "resultado", "nombre": "Resultado"},
        ]},
    )

    assert len(allocations[0]) == 2
    assert all(item["awarded_points"] is None for item in allocations[0])
    assert sum((item["max_points"] for item in allocations[0]), Decimal("0")) == Decimal("3")
