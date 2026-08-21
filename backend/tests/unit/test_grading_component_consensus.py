from decimal import Decimal

from app.modules.calificaciones.breakdown_policy import build_component_scaffold, component_consensus


def test_equal_totals_do_not_hide_component_disagreement():
    scaffold = build_component_scaffold({"nota_maxima": 5, "preguntas": [{"numero": 1, "puntaje": 2}, {"numero": 2, "puntaje": 3}]})
    a = [{"clave": "pregunta:1", "puntaje": 2, "estado": "correcta", "explicacion": "A1"}, {"clave": "pregunta:2", "puntaje": 1, "estado": "parcial", "explicacion": "A2"}]
    b = [{"clave": "pregunta:1", "puntaje": 1, "estado": "parcial", "explicacion": "B1"}, {"clave": "pregunta:2", "puntaje": 2, "estado": "parcial", "explicacion": "B2"}]
    components, blockers = component_consensus(scaffold, a, b)
    assert sum(item["puntos_obtenidos"] or Decimal("0") for item in components) == Decimal("3")
    assert "componente_pendiente:pregunta:1" in blockers


def test_objective_correct_answer_always_gets_full_points():
    scaffold = build_component_scaffold({"nota_maxima": 5, "preguntas": [{"numero": 1, "puntaje": 5}]})
    components, _ = component_consensus(scaffold, [{"clave": "pregunta:1", "puntaje": 2, "estado": "parcial"}], [], [{"numero": "1", "correcta": True, "respuesta_detectada": "12"}])
    assert components[0]["puntos_obtenidos"] == Decimal("5")
    assert components[0]["origen"] == "objetivo"
