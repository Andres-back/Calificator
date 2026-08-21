from decimal import Decimal

from app.modules.calificaciones.breakdown_policy import build_component_scaffold, calculate_formula, coverage_state


def test_formula_is_reproducible_and_rounds_half_up():
    components = [
        {"clave": "pregunta:1", "puntos_obtenidos": Decimal("1"), "puntos_maximos": Decimal("3"), "requiere_revision": False},
        {"clave": "pregunta:2", "puntos_obtenidos": Decimal("2"), "puntos_maximos": Decimal("3"), "requiere_revision": False},
    ]
    formula = calculate_formula(components, Decimal("5"))
    assert formula["puntos_obtenidos"] == Decimal("3")
    assert formula["puntos_posibles"] == Decimal("6")
    assert formula["nota_final"] == Decimal("2.50")


def test_scaffold_uses_questions_not_dba_as_points():
    blueprint = {"nota_maxima": 5, "dba": [{"puntaje": 5}], "preguntas": [{"numero": 1, "enunciado": "Uno"}, {"numero": 2, "enunciado": "Dos"}]}
    scaffold = build_component_scaffold(blueprint)
    assert [item["clave"] for item in scaffold] == ["pregunta:1", "pregunta:2"]
    assert sum(item["puntos_maximos"] for item in scaffold) == Decimal("5")


def test_pending_component_never_becomes_automatic_zero():
    state, blockers = coverage_state([{"clave": "pregunta:1", "puntos_obtenidos": None, "requiere_revision": True}])
    assert state == "incompleta"
    assert blockers == ["componente_pendiente:pregunta:1"]
