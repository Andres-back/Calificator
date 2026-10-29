"""Synthetic direct teacher decisions, without inference or production data."""
import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.modules.calificaciones import service
from app.modules.calificaciones.schemas import AjustarNota


def payload(cal, **overrides):
    return AjustarNota(**{
        "nota_confirmada": "4.5", "actualizado_en_esperado": cal.updated_at,
        "version_desglose_esperada": None, "operacion_id": uuid4(),
        **overrides,
    })


def case(monkeypatch, **overrides):
    actor = SimpleNamespace(id=uuid4(), nombre="Docente sintético")
    cal = SimpleNamespace(
        id=uuid4(), profesor_id=actor.id, nota_sugerida=Decimal("4.1"),
        nota_confirmada=Decimal("4.1"), feedback="Explicación original",
        estado="confirmada", revisado_por_docente=True, entrega=None,
        resultado_json={"grader_a": {"nota": 4.1}},
        updated_at=datetime(2026, 10, 28, 12, 0),
    )
    for key, value in overrides.items():
        setattr(cal, key, value)
    db = SimpleNamespace(scalar=AsyncMock(return_value=cal), commit=AsyncMock(),
                         refresh=AsyncMock(), rollback=AsyncMock())
    monkeypatch.setattr(service, "get_evaluation_for_calificacion", AsyncMock(return_value=SimpleNamespace(nota_maxima=Decimal("5"))))
    monkeypatch.setattr(service, "get_active_breakdown", AsyncMock(return_value=None))
    monkeypatch.setattr(service, "_update_salon_estudiante_estado", AsyncMock())
    monkeypatch.setattr(service, "suspend_grade_publications", AsyncMock())
    monkeypatch.setattr("app.modules.calificaciones.visual_grade_policy.ensure_visual_grade_publishable", AsyncMock())
    return db, cal, actor


@pytest.mark.parametrize("value", [True, False, None, "", " ", "NaN", "Infinity", "-1", "1e1000"])
def test_invalid_scores_are_not_coerced(value):
    with pytest.raises(ValidationError):
        AjustarNota(nota_confirmada=value)


def test_protected_request_needs_all_preconditions():
    with pytest.raises(ValidationError):
        AjustarNota(nota_confirmada=4, operacion_id=uuid4())
    # Existing clients remain valid; new clients explicitly send null for no breakdown.
    assert AjustarNota(nota_confirmada=0).nota_confirmada == 0


def test_teacher_adjustment_preserves_zero_and_original_analysis(monkeypatch):
    db, cal, actor = case(monkeypatch, nota_confirmada=Decimal("0"))
    result = asyncio.run(service.ajustar_nota(db, cal, payload(cal), actor=actor))
    assert result.nota_confirmada == Decimal("4.5")
    assert result.nota_sugerida == Decimal("4.1")
    assert result.feedback == "Explicación original"
    assert result.resultado_json["grader_a"] == {"nota": 4.1}
    event = result.resultado_json["_timeline"][-1]
    assert event["nota_anterior"] == 0
    assert event["nota_nueva"] == 4.5
    assert event["actor_id"] == str(actor.id)
    assert result.estado == "ajustada"
    db.commit.assert_awaited_once()
    service.suspend_grade_publications.assert_awaited_once()


def test_retry_is_idempotent_but_reusing_id_for_other_intent_conflicts(monkeypatch):
    db, cal, actor = case(monkeypatch)
    request = payload(cal)
    asyncio.run(service.ajustar_nota(db, cal, request, actor=actor))
    # An old optimistic token is expected on a successful network retry.
    cal.updated_at = datetime(2026, 10, 28, 12, 1)
    asyncio.run(service.ajustar_nota(db, cal, request, actor=actor))
    assert len(cal.resultado_json["_timeline"]) == 1
    db.commit.assert_awaited_once()
    with pytest.raises(HTTPException) as error:
        asyncio.run(service.ajustar_nota(db, cal, request.model_copy(update={"nota_confirmada": Decimal("3")}), actor=actor))
    assert error.value.status_code == 409


@pytest.mark.parametrize("state", ["procesando", "anulada"])
def test_processing_and_void_grades_reject_edit(monkeypatch, state):
    db, cal, actor = case(monkeypatch, estado=state)
    with pytest.raises(HTTPException) as error:
        asyncio.run(service.ajustar_nota(db, cal, payload(cal), actor=actor))
    assert error.value.status_code == 409
    assert cal.nota_confirmada == Decimal("4.1")
    db.commit.assert_not_awaited()


def test_conflict_and_new_breakdown_do_not_overwrite(monkeypatch):
    db, cal, actor = case(monkeypatch)
    request = payload(cal, actualizado_en_esperado=datetime(2026, 10, 28, 11, tzinfo=timezone.utc))
    with pytest.raises(HTTPException) as error:
        asyncio.run(service.ajustar_nota(db, cal, request, actor=actor))
    assert error.value.status_code == 409
    monkeypatch.setattr(service, "get_active_breakdown", AsyncMock(return_value=SimpleNamespace(version=1)))
    with pytest.raises(HTTPException) as error:
        asyncio.run(service.ajustar_nota(db, cal, payload(cal), actor=actor))
    assert error.value.status_code == 409
    db.commit.assert_not_awaited()


def test_no_change_does_not_unpublish_or_round(monkeypatch):
    db, cal, actor = case(monkeypatch, estado="publicada", nota_confirmada=Decimal("4.10"))
    asyncio.run(service.ajustar_nota(db, cal, payload(cal, nota_confirmada="4.1"), actor=actor))
    assert cal.estado == "publicada"
    assert "_timeline" not in cal.resultado_json
    service.suspend_grade_publications.assert_not_awaited()
    db.commit.assert_not_awaited()


def test_maximum_is_validated_before_mutation(monkeypatch):
    db, cal, actor = case(monkeypatch)
    with pytest.raises(HTTPException) as error:
        asyncio.run(service.ajustar_nota(db, cal, payload(cal, nota_confirmada=6), actor=actor))
    assert error.value.status_code == 422
    assert cal.nota_confirmada == Decimal("4.1")


def test_legacy_empty_feedback_does_not_erase_the_existing_message(monkeypatch):
    db, cal, actor = case(monkeypatch)
    asyncio.run(service.ajustar_nota(db, cal, AjustarNota(nota_confirmada="4.5", feedback=""), actor=actor))
    assert cal.feedback == "Explicación original"
    assert cal.resultado_json["_timeline"][-1]["feedback"] is None
