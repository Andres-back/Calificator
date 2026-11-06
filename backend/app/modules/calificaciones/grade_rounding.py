"""Spec 147: regla institucional de la nota final presentada.

La nota se presenta con un decimal (la mitad sube). La única excepción es el
empate exacto en el umbral de aprobación (60 % de la nota máxima llevado a un
decimal, menos 0.05; 2.95 sobre 5): lo decide el docente. La nota exacta se
conserva con dos decimales y la decisión se guarda aparte (``redondeo_empate``).
Es la misma regla que ``formatGradeScore`` del frontend (Spec 145).
"""
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from fastapi import HTTPException

TieDecision = Literal["abajo", "arriba"]
TIE_DECISIONS = ("abajo", "arriba")
_CENT = Decimal("0.01")
_TENTH = Decimal("0.1")
_HALF_TENTH = Decimal("0.05")
PASS_RATIO = Decimal("0.6")


def pass_threshold(nota_maxima: Decimal) -> Decimal:
    return (Decimal(nota_maxima) * PASS_RATIO).quantize(_TENTH, rounding=ROUND_HALF_UP)


def is_threshold_tie(nota: Decimal | None, nota_maxima: Decimal | None) -> bool:
    if nota is None or nota_maxima is None or Decimal(nota_maxima) <= 0:
        return False
    cents = Decimal(nota).quantize(_CENT, rounding=ROUND_HALF_UP)
    return cents == pass_threshold(nota_maxima) - _HALF_TENTH


def presented_grade(nota: Decimal | None, nota_maxima: Decimal | None, decision: str | None) -> Decimal | None:
    """Nota final con un decimal; ``None`` si es un empate aún sin decidir."""
    if nota is None:
        return None
    if is_threshold_tie(nota, nota_maxima):
        if decision not in TIE_DECISIONS:
            return None
        threshold = pass_threshold(nota_maxima)
        return threshold if decision == "arriba" else threshold - _TENTH
    return Decimal(nota).quantize(_CENT, rounding=ROUND_HALF_UP).quantize(_TENTH, rounding=ROUND_HALF_UP)


def tie_message(nota: Decimal, nota_maxima: Decimal) -> str:
    threshold = pass_threshold(nota_maxima)
    cents = Decimal(nota).quantize(_CENT, rounding=ROUND_HALF_UP)
    return (f"La nota {cents} está justo en el empate del umbral de aprobación ({threshold}). "
            f"Indica si queda en {threshold - _TENTH} o en {threshold}.")


def resolve_tie_decision(nota: Decimal, nota_maxima: Decimal, decision: str | None, *, require: bool) -> str | None:
    """Decisión a guardar para ``nota``: solo existe en empate; sin ella, 422 si se exige."""
    if not is_threshold_tie(nota, nota_maxima):
        return None
    if decision in TIE_DECISIONS:
        return decision
    if require:
        raise HTTPException(status_code=422, detail=tie_message(nota, nota_maxima))
    return None


def ensure_tie_decided(nota: Decimal | None, nota_maxima: Decimal | None, decision: str | None) -> None:
    """Ninguna nota en empate se publica sin decisión docente."""
    if is_threshold_tie(nota, nota_maxima) and decision not in TIE_DECISIONS:
        raise HTTPException(status_code=409, detail=tie_message(nota, nota_maxima))


def apply_final_grade(cal, evaluacion, score, decision=None, *, require_decision: bool) -> str | None:
    """Único punto que fija la nota final y su decisión de empate.

    La nota exacta se guarda tal cual. En el empate, la decisión se exige si
    ``require_decision``; un cambio calculado de valor descarta la anterior,
    porque se tomó sobre otra cifra. Devuelve la decisión guardada.
    """
    if decision is None and not require_decision and score == cal.nota_confirmada:
        decision = getattr(cal, "redondeo_empate", None)
    resolved = resolve_tie_decision(score, evaluacion.nota_maxima, decision, require=require_decision)
    cal.nota_confirmada = score
    cal.redondeo_empate = resolved
    return resolved


PENDING_TIE_NOTE = "La nueva nota quedó en el empate del umbral: decide 2.9 o 3.0 antes de volver a publicarla."


def apply_computed_final_grade(cal, evaluacion, score) -> bool:
    """Nota calculada (desglose o reparto): nunca deja publicado un empate sin decidir.

    Devuelve ``True`` si la nota publicada volvió a "ajustada" a la espera de la decisión.
    """
    resolved = apply_final_grade(cal, evaluacion, score, None, require_decision=False)
    if is_threshold_tie(score, evaluacion.nota_maxima) and resolved is None and cal.estado == "publicada":
        cal.estado = "ajustada"
        return True
    return False


def decision_label(nota: Decimal, nota_maxima: Decimal, decision: str) -> str:
    return f"Empate del umbral decidido por el docente: {presented_grade(nota, nota_maxima, decision)}"
