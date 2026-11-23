"""Spec 215: varias preguntas marcadas en un solo guardado."""
import asyncio
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from app.db.base import import_models
from app.modules.calificaciones.breakdown_models import CalificacionAjuste, CalificacionComponente, CalificacionDesglose
from app.modules.calificaciones.breakdown_service import update_breakdown

import_models()
HINT = "Relee la pregunta y compara tu resultado."


def question(number: int, state: str, points: str | None, *, review: bool = False) -> CalificacionComponente:
    return CalificacionComponente(
        id=uuid4(), desglose_id=uuid4(), clave=f"pregunta:{number}", orden=number - 1, tipo="pregunta", numero=str(number),
        titulo=f"Pregunta {number}", respuesta_estudiante="20", respuesta_referencia="24",
        puntos_obtenidos=None if points is None else Decimal(points), puntos_maximos=Decimal("1"), estado=state,
        explicacion_verificable="Explicación anterior.", explicacion_estudiante="Explicación anterior.",
        origen="consenso_ia", requiere_revision=review, evidencia_json={"paginas": [1], "orientacion_mejora": HINT}, valoraciones_json=[],
    )


def breakdown(components: list[CalificacionComponente]) -> CalificacionDesglose:
    active = CalificacionDesglose(
        id=uuid4(), calificacion_id=uuid4(), version=3, origen="automatico", activo=True,
        cobertura_estado="incompleta", puntos_obtenidos=1, puntos_posibles=len(components), nota_maxima=5,
        nota_base=0, ajuste_global=0, nota_antes_redondeo=0, regla_redondeo="half_up",
        decimales=2, nota_final=0, requiere_revision=True, bloqueos_json=[], procedencia_json={},
    )
    active.componentes = components
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


def change(component, state: str) -> dict:
    return {
        "componente_id": component.id,
        "puntos_obtenidos": component.puntos_maximos if state == "correcta" else Decimal("0"),
        "estado": state,
        "motivo_interno": f"Marcada como {state} junto con otras preguntas.",
        "explicacion_estudiante": "Tu profesor revisó esta respuesta.",
    }


def mark(active, cal, changes):
    db = FakeDB(active)
    return asyncio.run(update_breakdown(db, calificacion=cal, expected_version=3, changes=changes, global_adjustment=None, actor_id=uuid4())), db


def grade(active, state="requiere_revision"):
    return SimpleNamespace(id=active.calificacion_id, nota_confirmada=None, revisado_por_docente=False, estado=state, redondeo_empate=None)


def test_fr003_varias_preguntas_se_guardan_en_una_sola_version_con_su_historial():
    components = [question(1, "correcta", "1"), question(2, "no_evaluable", None, review=True),
                  question(3, "ilegible", None, review=True), question(4, "incorrecta", "0")]
    active = breakdown(components)
    cal = grade(active)

    updated, db = mark(active, cal, [change(components[1], "correcta"), change(components[2], "correcta"), change(components[3], "correcta")])

    assert updated.version == 4 and updated.origen == "docente"
    by_key = {item.clave: item for item in updated.componentes}
    assert [by_key[f"pregunta:{n}"].estado for n in (1, 2, 3, 4)] == ["correcta"] * 4
    assert all(by_key[f"pregunta:{n}"].puntos_obtenidos == Decimal("1") for n in (2, 3, 4))
    assert all(not by_key[f"pregunta:{n}"].requiere_revision and by_key[f"pregunta:{n}"].origen == "docente" for n in (2, 3, 4))
    # La que no se tocó conserva su origen.
    assert by_key["pregunta:1"].origen == "consenso_ia"
    assert sorted(row.componente_clave for row in db.adjustments) == ["pregunta:2", "pregunta:3", "pregunta:4"]
    assert updated.nota_final == Decimal("5.00")
    assert cal.estado == "ajustada" and cal.revisado_por_docente is True


def test_fr003_si_quedan_preguntas_sin_puntaje_la_nota_sigue_sin_confirmar():
    components = [question(1, "no_evaluable", None, review=True), question(2, "no_evaluable", None, review=True), question(3, "ilegible", None, review=True)]
    active = breakdown(components)
    cal = grade(active)

    updated, _ = mark(active, cal, [change(components[0], "incorrecta"), change(components[1], "correcta")])

    assert [item.puntos_obtenidos for item in sorted(updated.componentes, key=lambda item: item.orden)] == [Decimal("0"), Decimal("1"), None]
    assert cal.estado == "requiere_revision"


def test_fr005_una_pregunta_que_queda_correcta_no_conserva_para_mejorar():
    components = [question(1, "incorrecta", "0"), question(2, "parcial", "0.5"), question(3, "correcta", "1")]
    active = breakdown(components)

    updated, _ = mark(active, grade(active), [change(components[0], "correcta"), change(components[1], "incorrecta")])

    by_key = {item.clave: item for item in updated.componentes}
    assert "orientacion_mejora" not in by_key["pregunta:1"].evidencia_json
    assert by_key["pregunta:1"].evidencia_json["paginas"] == [1]
    # Una respuesta que sigue sin estar bien conserva la orientación, y la que no se tocó también.
    assert by_key["pregunta:2"].evidencia_json["orientacion_mejora"] == HINT
    assert by_key["pregunta:3"].evidencia_json["orientacion_mejora"] == HINT
    # El desglose anterior no se modifica.
    assert components[0].evidencia_json["orientacion_mejora"] == HINT
