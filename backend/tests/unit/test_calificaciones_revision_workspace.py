from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from app.modules.calificaciones.service import (
    _build_revision_guide,
    _select_current_calificaciones,
)
from app.shared.enums import PoliticaIntento


def _grade(*, student_id, created_at, score, estado="sugerida"):
    return SimpleNamespace(
        estudiante_id=student_id,
        created_at=created_at,
        nota_confirmada=Decimal(str(score)) if score is not None else None,
        nota_sugerida=Decimal(str(score)) if score is not None else None,
        estado=estado,
    )


def test_workspace_muestra_solo_el_intento_mas_reciente_por_estudiante() -> None:
    student_id = uuid4()
    now = datetime.now(timezone.utc)
    old = _grade(student_id=student_id, created_at=now - timedelta(days=1), score=5)
    current = _grade(student_id=student_id, created_at=now, score=3.8)

    selected = _select_current_calificaciones(
        [old, current],
        PoliticaIntento.ULTIMO_INTENTO.value,
    )

    assert selected == [current]


def test_workspace_respeta_mejor_puntaje_y_descarta_anuladas() -> None:
    student_id = uuid4()
    now = datetime.now(timezone.utc)
    best = _grade(student_id=student_id, created_at=now - timedelta(days=1), score=4.8)
    latest = _grade(student_id=student_id, created_at=now, score=3.5)
    annulled = _grade(student_id=uuid4(), created_at=now, score=5, estado="anulada")

    selected = _select_current_calificaciones(
        [best, latest, annulled],
        PoliticaIntento.MEJOR_PUNTAJE.value,
    )

    assert selected == [best]


def test_revision_guide_combina_preguntas_y_respuestas_por_numero() -> None:
    guide = _build_revision_guide(
        {
            "preguntas": [
                {
                    "numero": 2,
                    "enunciado": "¿Cuánto es 4 × 9?",
                    "tipo": "seleccion_multiple",
                    "opciones": ["A) 32", {"texto": "B) 36"}],
                    "puntaje": 1,
                },
                {"numero": 3, "texto": "La multiplicación es conmutativa."},
            ],
            "respuestas_esperadas": [
                {"numero": 3, "respuesta": True},
                {"numero": 2, "respuesta_correcta": "B) 36"},
            ],
        }
    )

    assert guide[0]["opciones"] == ["A) 32", "B) 36"]
    assert guide[0]["respuesta_correcta"] == "B) 36"
    assert guide[1]["respuesta_correcta"] == "Verdadero"
