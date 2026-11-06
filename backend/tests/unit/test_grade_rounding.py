"""Spec 147: regla del empate del umbral y decisión docente, sin datos reales."""
from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.modules.calificaciones import grade_rounding as rule


@pytest.mark.parametrize(("nota", "maxima", "empate"), [
    ("2.95", "5", True), ("2.94", "5", False), ("2.96", "5", False), ("3.45", "5", False),
    ("5.95", "10", True), ("2.95", "10", False), ("59.95", "100", True), ("2.65", "4.5", True),
    ("2.950", "5.00", True),
])
def test_detecta_solo_el_empate_del_umbral(nota, maxima, empate):
    assert rule.is_threshold_tie(Decimal(nota), Decimal(maxima)) is empate


@pytest.mark.parametrize(("nota", "maxima", "decision", "esperada"), [
    ("2.95", "5", "abajo", "2.9"), ("2.95", "5", "arriba", "3.0"), ("2.95", "5", None, None),
    ("2.96", "5", None, "3.0"), ("1.15", "5", None, "1.2"), ("3.45", "5", "abajo", "3.5"),
    ("5.95", "10", "arriba", "6.0"), ("2.65", "4.5", "abajo", "2.6"),
])
def test_nota_presentada(nota, maxima, decision, esperada):
    result = rule.presented_grade(Decimal(nota), Decimal(maxima), decision)
    assert result == (Decimal(esperada) if esperada else None)


def test_exige_decision_solo_en_empate_y_la_descarta_fuera_de_el():
    with pytest.raises(HTTPException) as exc:
        rule.resolve_tie_decision(Decimal("2.95"), Decimal("5"), None, require=True)
    assert exc.value.status_code == 422
    assert "2.95" in exc.value.detail and "2.9" in exc.value.detail and "3.0" in exc.value.detail
    assert rule.resolve_tie_decision(Decimal("2.95"), Decimal("5"), "arriba", require=True) == "arriba"
    assert rule.resolve_tie_decision(Decimal("2.95"), Decimal("5"), None, require=False) is None
    assert rule.resolve_tie_decision(Decimal("3.20"), Decimal("5"), "abajo", require=True) is None


def test_publicacion_bloquea_empate_sin_decision():
    with pytest.raises(HTTPException) as exc:
        rule.ensure_tie_decided(Decimal("2.95"), Decimal("5"), None)
    assert exc.value.status_code == 409
    rule.ensure_tie_decided(Decimal("2.95"), Decimal("5"), "abajo")
    rule.ensure_tie_decided(Decimal("4.00"), Decimal("5"), None)
    rule.ensure_tie_decided(None, Decimal("5"), None)
