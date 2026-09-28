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


def test_partial_adjustment_keeps_approved_criteria_snapshot_and_published_history(monkeypatch):
    from copy import deepcopy

    from app.core.config import settings
    from app.modules.calificaciones.breakdown_service import student_breakdown_is_publishable
    from app.modules.criterios_aprendizaje.models import GradingComponentCriterion

    monkeypatch.setattr(settings, "CRITERIA_GRADING_CONTEXT", True)
    monkeypatch.setattr(settings, "CRITERIA_GRADING_AUTHORITY", False)
    monkeypatch.setattr(settings, "EXPLAINABLE_GRADING_AUTHORITY_ENABLED", False)
    active = _active_breakdown()
    old_component = active.componentes[0]
    old_component.puntos_obtenidos = Decimal("1")
    old_component.estado = "correcta"
    version_id, application_id = uuid4(), uuid4()
    old_component.evidencia_json["criterios_aplicados"] = [
        {"stable_key": "metodo", "version_id": str(version_id)},
        {"stable_key": "resultado", "version_id": str(version_id)},
    ]
    original_evidence = deepcopy(old_component.evidencia_json)
    prior = [GradingComponentCriterion(
        component_id=old_component.id, application_id=application_id, criterion_stable_key=key,
        criterion_snapshot_json={"nombre": key, "descripcion": "Versión aprobada"},
        max_points=Decimal("0.5"), awarded_points=Decimal("0.5"),
    ) for key in ("metodo", "resultado")]

    class CriteriaDB(FakeDB):
        def __init__(self):
            super().__init__(active)
            self.mappings = []

        async def scalars(self, _query):
            return prior

        def add(self, value):
            super().add(value)
            if isinstance(value, GradingComponentCriterion):
                self.mappings.append(value)

        async def flush(self):
            if self.new_breakdown:
                self.new_breakdown.id = uuid4()
                for component in self.new_breakdown.componentes:
                    component.id = uuid4()

    db = CriteriaDB()
    cal = SimpleNamespace(id=active.calificacion_id, nota_confirmada=Decimal("5"), revisado_por_docente=True, estado="publicada")
    updated = asyncio.run(update_breakdown(db, calificacion=cal, expected_version=1, changes=[{
        "componente_id": old_component.id, "puntos_obtenidos": Decimal("0.7"), "estado": "parcial",
        "motivo_interno": "Reconocer procedimiento parcial", "explicacion_estudiante": "Revisa el resultado final.",
    }], global_adjustment=None, actor_id=uuid4()))
    assert updated.nota_final == cal.nota_confirmada == Decimal("3.50")
    assert cal.estado == "publicada" and student_breakdown_is_publishable(cal, updated)
    assert old_component.puntos_obtenidos == Decimal("1")
    assert old_component.evidencia_json == original_evidence
    assert not active.activo and updated.version == 2
    assert sum((row.awarded_points for row in db.mappings), Decimal("0")) == Decimal("0.7")
    assert all(row.application_id == application_id for row in db.mappings)
    assert [row.criterion_snapshot_json for row in db.mappings] == [row.criterion_snapshot_json for row in prior]
    assert all(item["version_id"] == str(version_id) for item in updated.componentes[0].evidencia_json["criterios_aplicados"])
    assert db.adjustments[0].valor_anterior_json["puntos"] == 1
    assert db.adjustments[0].valor_nuevo_json["puntos"] == 0.7


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
