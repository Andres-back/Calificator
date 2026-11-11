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

    async def execute(self, _query):
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


# --- Spec 167: corregir una pregunta aunque otras sigan pendientes -----------------

def _component(number, points, state="correcta"):
    pending = points is None
    return CalificacionComponente(
        id=uuid4(), desglose_id=uuid4(), clave=f"pregunta:{number}", orden=number - 1, tipo="pregunta",
        numero=str(number), titulo=f"Pregunta {number}", respuesta_estudiante="respuesta", respuesta_referencia="clave",
        puntos_obtenidos=points, puntos_maximos=Decimal("1"), estado="revision_pendiente" if pending else state,
        explicacion_verificable="Sin valoración verificable." if pending else "Valorada.",
        explicacion_estudiante="Revisa esta respuesta con tu docente." if pending else "Valorada.",
        origen="consenso_ia", requiere_revision=pending, evidencia_json={}, valoraciones_json=[],
    )


def _breakdown_with(components):
    active = CalificacionDesglose(
        id=uuid4(), calificacion_id=uuid4(), version=1, origen="automatico", activo=True,
        cobertura_estado="incompleta", puntos_obtenidos=0, puntos_posibles=len(components), nota_maxima=5,
        nota_base=0, ajuste_global=0, nota_antes_redondeo=0, regla_redondeo="half_up",
        decimales=2, nota_final=0, requiere_revision=True, bloqueos_json=[], procedencia_json={},
    )
    active.componentes = components
    return active


def _pending_grade(active):
    return SimpleNamespace(id=active.calificacion_id, nota_sugerida=None, nota_confirmada=None,
                           redondeo_empate=None, revisado_por_docente=False, estado="requiere_revision")


def _teacher_change(component, points, state="correcta"):
    return {"componente_id": component.id, "puntos_obtenidos": Decimal(points), "estado": state,
            "motivo_interno": "Revisión docente de la respuesta.", "explicacion_estudiante": "Tu respuesta fue revisada."}


def test_167_a_pending_question_is_saved_while_another_stays_pending():
    components = [_component(1, Decimal("1")), _component(2, None), _component(3, None)]
    active = _breakdown_with(components)
    cal = _pending_grade(active)
    updated = asyncio.run(update_breakdown(
        FakeDB(active), calificacion=cal, expected_version=1,
        changes=[_teacher_change(components[1], "1")], global_adjustment=None, actor_id=uuid4(),
    ))
    by_key = {item.clave: item for item in updated.componentes}
    assert updated.version == 2
    assert by_key["pregunta:2"].puntos_obtenidos == Decimal("1")
    assert by_key["pregunta:2"].origen == "docente"
    # La pregunta que nadie tocó sigue pendiente y sin puntaje.
    assert by_key["pregunta:3"].puntos_obtenidos is None
    assert by_key["pregunta:3"].estado == "revision_pendiente"
    assert by_key["pregunta:3"].requiere_revision is True
    assert updated.requiere_revision is True
    # La nota no se confirma mientras falten preguntas.
    assert cal.estado == "requiere_revision"
    assert cal.nota_confirmada is None
    assert cal.revisado_por_docente is True


def test_167_a_scored_question_can_be_corrected_while_another_is_pending():
    components = [_component(1, Decimal("0"), "incorrecta"), _component(2, None)]
    active = _breakdown_with(components)
    cal = _pending_grade(active)
    updated = asyncio.run(update_breakdown(
        FakeDB(active), calificacion=cal, expected_version=1,
        changes=[_teacher_change(components[0], "1")], global_adjustment=None, actor_id=uuid4(),
    ))
    assert updated.componentes[0].puntos_obtenidos == Decimal("1")
    assert updated.componentes[1].puntos_obtenidos is None
    assert cal.estado == "requiere_revision"
    assert cal.nota_confirmada is None


def test_167_resolving_the_last_pending_question_sets_the_grade_as_before():
    components = [_component(1, Decimal("1")), _component(2, None)]
    active = _breakdown_with(components)
    cal = _pending_grade(active)
    updated = asyncio.run(update_breakdown(
        FakeDB(active), calificacion=cal, expected_version=1,
        changes=[_teacher_change(components[1], "0.5", "parcial")], global_adjustment=None, actor_id=uuid4(),
    ))
    assert updated.requiere_revision is False
    assert updated.nota_final == Decimal("3.75")
    assert cal.estado == "ajustada"
    assert cal.nota_confirmada == Decimal("3.75")


def test_167_out_of_range_points_on_the_edited_question_are_a_validation_error():
    components = [_component(1, Decimal("1")), _component(2, None)]
    active = _breakdown_with(components)
    cal = _pending_grade(active)
    with pytest.raises(HTTPException) as error:
        asyncio.run(update_breakdown(
            FakeDB(active), calificacion=cal, expected_version=1,
            changes=[_teacher_change(components[1], "2")], global_adjustment=None, actor_id=uuid4(),
        ))
    assert error.value.status_code == 422
    assert "pregunta 2" in error.value.detail
    assert cal.estado == "requiere_revision"
