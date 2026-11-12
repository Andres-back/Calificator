"""Spec 171: confirmar en lote no despublica una nota ya publicada."""
import asyncio
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.modules.calificaciones import service
from app.modules.calificaciones.schemas import BatchConfirmItem

EVALUATION = SimpleNamespace(id=uuid4(), materia_id=uuid4(), profesor_id=None, nota_maxima=Decimal("5"),
                             politica_intento=None)


def grade(**overrides):
    values = dict(id=uuid4(), evaluacion_id=EVALUATION.id, estudiante_id=uuid4(), profesor_id=uuid4(),
                  nota_sugerida=Decimal("4.00"), nota_confirmada=None, redondeo_empate=None, feedback=None,
                  estado="sugerida", revisado_por_docente=False, entrega=None, entrega_id=None,
                  resultado_json={}, updated_at=datetime(2026, 11, 11, 12, 0))
    values.update(overrides)
    return SimpleNamespace(**values)


@pytest.fixture
def suspended(monkeypatch):
    suspend = AsyncMock()
    monkeypatch.setattr(service, "get_evaluation_for_calificacion", AsyncMock(return_value=EVALUATION))
    monkeypatch.setattr(service, "get_active_breakdown", AsyncMock(return_value=None))
    monkeypatch.setattr(service, "_update_salon_estudiante_estado", AsyncMock())
    monkeypatch.setattr(service, "suspend_grade_publications", suspend)
    monkeypatch.setattr("app.modules.calificaciones.visual_grade_policy.ensure_visual_grade_publishable", AsyncMock())
    return suspend


def confirm(monkeypatch, grades, items):
    by_id = {item.id: item for item in grades}
    monkeypatch.setattr(service, "get_calificacion_or_404", AsyncMock(side_effect=lambda _db, cid: by_id[cid]))
    admin = SimpleNamespace(id=uuid4(), nombre="Admin", rol="admin")
    return asyncio.run(service.confirmar_nota_batch(SimpleNamespace(commit=AsyncMock()), items, admin))


def test_published_grade_stays_published_when_confirmed_in_batch(monkeypatch, suspended):
    published = grade(nota_confirmada=Decimal("4.00"), estado="publicada", revisado_por_docente=True)
    pending = grade(nota_sugerida=Decimal("3.50"))
    result = confirm(monkeypatch, [published, pending], [
        BatchConfirmItem(calificacion_id=published.id, nota_confirmada=Decimal("4.00")),
        BatchConfirmItem(calificacion_id=pending.id, nota_confirmada=Decimal("3.50")),
    ])
    assert [item.success for item in result.results] == [True, True]
    # La publicada no se toca: ni su estado, ni su historial, ni sus enlaces de devolución.
    assert published.estado == "publicada"
    assert published.nota_confirmada == Decimal("4.00")
    assert published.resultado_json == {}
    assert [call.args[1] for call in suspended.await_args_list] == [pending.id]
    # La que estaba por confirmar sigue el flujo de siempre.
    assert pending.estado == "confirmada" and pending.nota_confirmada == Decimal("3.50")


def test_batch_confirm_does_not_change_the_score_of_a_published_grade(monkeypatch, suspended):
    published = grade(nota_confirmada=Decimal("4.00"), estado="publicada", revisado_por_docente=True)
    result = confirm(monkeypatch, [published], [
        BatchConfirmItem(calificacion_id=published.id, nota_confirmada=Decimal("4.50")),
    ])
    assert result.results[0].success is False
    assert "Editar nota" in result.results[0].error
    assert published.estado == "publicada" and published.nota_confirmada == Decimal("4.00")
    suspended.assert_not_awaited()
