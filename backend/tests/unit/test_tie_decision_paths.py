"""Spec 147: cada camino que fija o publica la nota final respeta la decisión del empate."""
import asyncio
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.calificaciones import service
from app.modules.calificaciones.schemas import (
    AjustarNota, BatchConfirmItem, CalificacionManualCreate, ConfirmarNota,
)

EVALUATION = SimpleNamespace(id=uuid4(), materia_id=uuid4(), profesor_id=None, nota_maxima=Decimal("5"),
                             politica_intento=None)


def grade(**overrides):
    values = dict(id=uuid4(), evaluacion_id=EVALUATION.id, estudiante_id=uuid4(), profesor_id=uuid4(),
                  nota_sugerida=Decimal("2.95"), nota_confirmada=None, redondeo_empate=None, feedback=None,
                  estado="sugerida", revisado_por_docente=False, entrega=None, entrega_id=None,
                  resultado_json={}, updated_at=datetime(2026, 11, 4, 12, 0))
    values.update(overrides)
    return SimpleNamespace(**values)


@pytest.fixture(autouse=True)
def isolated(monkeypatch):
    monkeypatch.setattr(service, "get_evaluation_for_calificacion", AsyncMock(return_value=EVALUATION))
    monkeypatch.setattr(service, "get_active_breakdown", AsyncMock(return_value=None))
    monkeypatch.setattr(service, "_update_salon_estudiante_estado", AsyncMock())
    monkeypatch.setattr(service, "suspend_grade_publications", AsyncMock())
    monkeypatch.setattr("app.modules.calificaciones.visual_grade_policy.ensure_visual_grade_publishable", AsyncMock())


def test_confirmar_empate_sin_decision_no_guarda():
    cal = grade()
    with pytest.raises(HTTPException) as exc:
        asyncio.run(service.confirm_grade_decision(None, cal, EVALUATION, Decimal("2.95")))
    assert exc.value.status_code == 422
    assert cal.nota_confirmada is None and cal.estado == "sugerida"


def test_confirmar_empate_con_decision_la_guarda_y_la_registra():
    cal = grade()
    actor = SimpleNamespace(id=uuid4(), nombre="Docente sintético")
    asyncio.run(service.confirm_grade_decision(None, cal, EVALUATION, Decimal("2.95"), actor=actor, decision="arriba"))
    assert cal.nota_confirmada == Decimal("2.95")
    assert cal.redondeo_empate == "arriba"
    event = cal.resultado_json["_timeline"][-1]
    assert event["actor_id"] == str(actor.id)
    assert "3.0" in event["detalle"]


def test_confirmar_fuera_de_empate_ignora_la_decision():
    cal = grade(redondeo_empate="abajo")
    asyncio.run(service.confirm_grade_decision(None, cal, EVALUATION, Decimal("3.20"), decision="abajo"))
    assert cal.nota_confirmada == Decimal("3.20") and cal.redondeo_empate is None


def test_endpoint_confirmar_acepta_la_decision_opcional():
    assert ConfirmarNota(nota_confirmada="4").redondeo_empate is None
    assert ConfirmarNota(nota_confirmada="2.95", redondeo_empate="abajo").redondeo_empate == "abajo"
    with pytest.raises(ValueError):
        ConfirmarNota(nota_confirmada="2.95", redondeo_empate="medio")


def ajuste_db(cal):
    return SimpleNamespace(scalar=AsyncMock(return_value=cal), commit=AsyncMock(), refresh=AsyncMock(),
                           rollback=AsyncMock())


def test_ajustar_empate_exige_decision_y_la_incluye_en_la_intencion():
    cal = grade(nota_confirmada=Decimal("3.40"), estado="confirmada")
    with pytest.raises(HTTPException) as exc:
        asyncio.run(service.ajustar_nota(ajuste_db(cal), cal, AjustarNota(nota_confirmada="2.95")))
    assert exc.value.status_code == 422 and cal.nota_confirmada == Decimal("3.40")
    asyncio.run(service.ajustar_nota(ajuste_db(cal), cal, AjustarNota(nota_confirmada="2.95", redondeo_empate="abajo")))
    assert cal.nota_confirmada == Decimal("2.95") and cal.redondeo_empate == "abajo"


def test_ajustar_solo_la_decision_sobre_la_misma_nota_se_guarda():
    cal = grade(nota_confirmada=Decimal("2.95"), estado="confirmada", redondeo_empate="abajo")
    asyncio.run(service.ajustar_nota(ajuste_db(cal), cal, AjustarNota(nota_confirmada="2.95", redondeo_empate="arriba")))
    assert cal.redondeo_empate == "arriba"


class ManualDB:
    def __init__(self, existing=None):
        self.values = [uuid4(), existing]
        self.commits = 0

    async def scalar(self, _statement):
        return self.values.pop(0)

    def add(self, _value):
        pass

    async def commit(self):
        self.commits += 1

    async def refresh(self, _value):
        return None


def test_establecer_nota_en_empate_exige_decision(monkeypatch):
    monkeypatch.setattr(service, "create_manual_breakdown", AsyncMock())
    teacher = SimpleNamespace(id=uuid4(), nombre="Docente")
    db = ManualDB()
    with pytest.raises(HTTPException) as exc:
        asyncio.run(service.set_manual_grade(db, EVALUATION, CalificacionManualCreate(
            estudiante_id=uuid4(), nota_confirmada=Decimal("2.95")), teacher))
    assert exc.value.status_code == 422 and db.commits == 0
    grade_ = asyncio.run(service.set_manual_grade(ManualDB(), EVALUATION, CalificacionManualCreate(
        estudiante_id=uuid4(), nota_confirmada=Decimal("2.95"), redondeo_empate="arriba"), teacher))
    assert grade_.redondeo_empate == "arriba" and grade_.estado == "publicada"


def test_lote_confirmar_solo_falla_el_item_en_empate(monkeypatch):
    tie, other = grade(), grade(nota_sugerida=Decimal("4.00"))
    by_id = {tie.id: tie, other.id: other}
    monkeypatch.setattr(service, "get_calificacion_or_404", AsyncMock(side_effect=lambda _db, cid: by_id[cid]))
    admin = SimpleNamespace(id=uuid4(), nombre="Admin", rol="admin")
    db = SimpleNamespace(commit=AsyncMock())
    result = asyncio.run(service.confirmar_nota_batch(db, [
        BatchConfirmItem(calificacion_id=tie.id, nota_confirmada=Decimal("2.95")),
        BatchConfirmItem(calificacion_id=other.id, nota_confirmada=Decimal("4.00")),
    ], admin))
    assert [item.success for item in result.results] == [False, True]
    assert "2.9" in result.results[0].error
    assert tie.nota_confirmada is None and other.nota_confirmada == Decimal("4.00")


def test_publicar_bloquea_empate_sin_decision():
    cal = grade(nota_confirmada=Decimal("2.95"), estado="confirmada")
    with pytest.raises(HTTPException) as exc:
        asyncio.run(service._prepare_grade_publication(None, cal, EVALUATION))
    assert exc.value.status_code == 409
    assert cal.estado == "confirmada"


def test_cambio_calculado_de_la_nota_descarta_la_decision_previa():
    cal = grade(nota_confirmada=Decimal("2.95"), redondeo_empate="arriba")
    service.apply_final_grade(cal, EVALUATION, Decimal("3.10"), None, require_decision=False)
    assert cal.nota_confirmada == Decimal("3.10") and cal.redondeo_empate is None
    cal = grade(nota_confirmada=Decimal("2.95"), redondeo_empate="arriba")
    service.apply_final_grade(cal, EVALUATION, Decimal("2.95"), None, require_decision=False)
    assert cal.redondeo_empate == "arriba"


def test_calculo_que_deja_publicada_una_nota_en_empate_la_despublica():
    from app.modules.calificaciones.grade_rounding import apply_computed_final_grade
    cal = grade(nota_confirmada=Decimal("3.40"), estado="publicada")
    assert apply_computed_final_grade(cal, EVALUATION, Decimal("2.95")) is True
    assert cal.estado == "ajustada" and cal.redondeo_empate is None
    cal = grade(nota_confirmada=Decimal("2.95"), estado="publicada", redondeo_empate="abajo")
    assert apply_computed_final_grade(cal, EVALUATION, Decimal("2.95")) is False
    assert cal.estado == "publicada" and cal.redondeo_empate == "abajo"
