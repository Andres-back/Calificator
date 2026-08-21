import asyncio
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.db.base import import_models
from app.modules.calificaciones.breakdown_models import CalificacionAjuste, CalificacionComponente, CalificacionDesglose
from app.modules.calificaciones.breakdown_service import update_breakdown

import_models()


def _active_breakdown(version=1):
    component = CalificacionComponente(
        id=uuid4(), desglose_id=uuid4(), clave="pregunta:1", orden=0, tipo="pregunta", numero="1",
        titulo="6 × 4", respuesta_estudiante="20", respuesta_referencia="24",
        puntos_obtenidos=Decimal("0"), puntos_maximos=Decimal("1"), estado="incorrecta",
        explicacion_verificable="Resultado incorrecto.", explicacion_estudiante="Revisa la multiplicación.",
        origen="consenso_ia", requiere_revision=False, evidencia_json={"paginas": [1]}, valoraciones_json=[],
    )
    active = CalificacionDesglose(
        id=uuid4(), calificacion_id=uuid4(), version=version, origen="automatico", activo=True,
        cobertura_estado="completa", puntos_obtenidos=0, puntos_posibles=1, nota_maxima=5,
        nota_base=0, ajuste_global=0, nota_antes_redondeo=0, regla_redondeo="half_up",
        decimales=2, nota_final=0, requiere_revision=False, bloqueos_json=[], procedencia_json={},
    )
    active.componentes = [component]
    return active


class FakeDB:
    def __init__(self, active):
        self.active = active
        self.new_breakdown = None
        self.adjustments = []

    async def scalar(self, _query):
        if self.active is not None:
            result, self.active = self.active, None
            return result
        return self.new_breakdown

    def add(self, value):
        if isinstance(value, CalificacionDesglose):
            self.new_breakdown = value
        elif isinstance(value, CalificacionAjuste):
            self.adjustments.append(value)

    async def flush(self):
        return None

    async def commit(self):
        return None


def test_teacher_change_creates_version_and_preserves_published_state():
    active = _active_breakdown()
    cal = SimpleNamespace(id=active.calificacion_id, nota_confirmada=Decimal("0"), revisado_por_docente=True, estado="publicada")
    db = FakeDB(active)
    updated = asyncio.run(update_breakdown(
        db,
        calificacion=cal,
        expected_version=1,
        changes=[{
            "componente_id": active.componentes[0].id,
            "puntos_obtenidos": Decimal("0.5"),
            "estado": "parcial",
            "motivo_interno": "El procedimiento es parcialmente correcto.",
            "explicacion_estudiante": "Tu procedimiento es válido, pero el resultado final debe ser 24.",
        }],
        global_adjustment=None,
        actor_id=uuid4(),
    ))
    assert updated.version == 2
    assert updated.componentes[0].puntos_obtenidos == Decimal("0.5")
    assert updated.nota_final == Decimal("2.50")
    assert cal.nota_confirmada == Decimal("2.50")
    assert cal.estado == "publicada"
    assert len(db.adjustments) == 1


def test_stale_version_is_rejected_without_overwrite():
    active = _active_breakdown(version=2)
    cal = SimpleNamespace(id=active.calificacion_id, nota_confirmada=Decimal("0"), revisado_por_docente=True, estado="confirmada")
    with pytest.raises(HTTPException) as error:
        asyncio.run(update_breakdown(
            FakeDB(active), calificacion=cal, expected_version=1,
            changes=[{"componente_id": active.componentes[0].id, "puntos_obtenidos": 1, "estado": "correcta", "motivo_interno": "Corrección", "explicacion_estudiante": "Correcta"}],
            global_adjustment=None, actor_id=uuid4(),
        ))
    assert error.value.status_code == 409


def test_global_adjustment_is_separate_explained_and_versioned():
    active = _active_breakdown()
    cal = SimpleNamespace(id=active.calificacion_id, nota_confirmada=Decimal("0"), revisado_por_docente=True, estado="confirmada")
    db = FakeDB(active)
    updated = asyncio.run(update_breakdown(
        db,
        calificacion=cal,
        expected_version=1,
        changes=[],
        global_adjustment={
            "valor": Decimal("0.25"),
            "motivo_interno": "Reconocimiento excepcional documentado.",
            "explicacion_estudiante": "Se reconoció un procedimiento válido adicional.",
        },
        actor_id=uuid4(),
    ))
    assert updated.ajuste_global == Decimal("0.25")
    assert updated.procedencia_json["ajuste_global_detalle"]["valor"] == 0.25
    assert updated.procedencia_json["ajuste_global_detalle"]["explicacion_estudiante"] == "Se reconoció un procedimiento válido adicional."
    assert db.adjustments[0].tipo == "global"