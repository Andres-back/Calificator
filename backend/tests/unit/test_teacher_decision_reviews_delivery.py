from __future__ import annotations

import asyncio
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.modules.calificaciones import service
from app.modules.calificaciones.schemas import (
    AjustarNota,
    ConfirmarNota,
    RevisionManualCreate,
)
from app.shared.enums import CalificacionEstado, EntregaEstado


class FakeDB:
    def __init__(self) -> None:
        self.commits = 0
        self.refreshes = 0

    async def commit(self) -> None:
        self.commits += 1

    async def refresh(self, _value) -> None:
        self.refreshes += 1


def _grade() -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        evaluacion_id=uuid4(),
        estudiante_id=uuid4(),
        nota_sugerida=Decimal("4.0"),
        nota_confirmada=None,
        feedback=None,
        revisado_por_docente=False,
        estado=CalificacionEstado.SUGERIDA.value,
        resultado_json={},
        entrega=SimpleNamespace(estado=EntregaEstado.CALIFICADA.value),
    )


@pytest.mark.parametrize(
    "operation, payload, expected_state",
    [
        (
            service.confirmar_nota,
            ConfirmarNota(nota_confirmada=Decimal("4.0")),
            CalificacionEstado.CONFIRMADA.value,
        ),
        (
            service.ajustar_nota,
            AjustarNota(
                nota_confirmada=Decimal("3.8"),
                feedback="Revisa el segundo procedimiento.",
            ),
            CalificacionEstado.AJUSTADA.value,
        ),
    ],
    ids=["confirm", "adjust"],
)
def test_teacher_decision_marks_the_persisted_delivery_as_reviewed(
    monkeypatch,
    operation,
    payload,
    expected_state: str,
) -> None:
    grade = _grade()
    db = FakeDB()

    async def get_evaluation(_db, selected_grade):
        assert selected_grade is grade
        return SimpleNamespace(nota_maxima=Decimal("5"))

    async def update_classroom(_db, selected_grade, state):
        assert selected_grade is grade
        assert state == "confirmado"

    monkeypatch.setattr(service, "get_evaluation_for_calificacion", get_evaluation)
    monkeypatch.setattr(service, "_update_salon_estudiante_estado", update_classroom)

    result = asyncio.run(operation(db, grade, payload))

    assert result is grade
    assert grade.estado == expected_state
    assert grade.revisado_por_docente is True
    assert grade.entrega.estado == EntregaEstado.REVISADA.value
    assert grade.resultado_json["_timeline"][-1]["tipo"] in {
        "confirmada",
        "ajustada",
    }
    assert db.commits == 1
    assert db.refreshes == 1


def test_marking_manual_review_preserves_suggestion_and_opens_teacher_work() -> None:
    grade = _grade()
    db = FakeDB()
    actor = SimpleNamespace(id=uuid4(), nombre="Profesor Demo")

    result = asyncio.run(
        service.marcar_revision_manual(
            db,
            grade,
            RevisionManualCreate(motivo="Verificar personalmente el procedimiento."),
            actor,
        )
    )

    assert result is grade
    assert grade.estado == CalificacionEstado.REQUIERE_REVISION.value
    assert grade.nota_sugerida == Decimal("4.0")
    assert grade.nota_confirmada is None
    assert grade.revisado_por_docente is False
    assert grade.entrega.estado == EntregaEstado.CALIFICADA.value
    assert (
        grade.resultado_json["revision_manual"]["motivo"]
        == "Verificar personalmente el procedimiento."
    )
    assert grade.resultado_json["_timeline"][-1]["tipo"] == "revision_manual"
    assert db.commits == 1
    assert db.refreshes == 1
