"""Spec 175: ubicar las respuestas en la foto sin cambiar la calificación."""

from copy import deepcopy
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.calificaciones import answer_location_service as location
from app.modules.calificaciones import breakdown_service, revision_router
from app.modules.feedback_sharing.projection import review_source_fingerprint
from app.services.answer_evidence_regions import (
    FRAME,
    LOCATED_KEY,
    evidence_version,
    located_answer_regions,
    location_attempts,
)

FINGERPRINT = "a" * 64


def region(delivery_id, page=1, box=(0.1, 0.2, 0.3, 0.1)):
    return {"pagina": page, "bbox": list(box), "marco": FRAME, "evidencia_version": evidence_version(delivery_id, FINGERPRINT)}


def component(number, **overrides):
    values = {
        "id": uuid4(), "clave": f"pregunta:q{number}", "orden": number - 1, "tipo": "pregunta",
        "numero": str(number), "titulo": f"Enunciado {number}", "respuesta_estudiante": "B",
        "respuesta_referencia": "C", "puntos_obtenidos": 0, "puntos_maximos": 1, "estado": "incorrecta",
        "explicacion_verificable": "Marcó B.", "explicacion_estudiante": "Marcaste B.", "origen": "automatico",
        "requiere_revision": False, "evidencia_json": {"paginas": [1]}, "valoraciones_json": [],
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def breakdown(components, provenance=None):
    return SimpleNamespace(
        id=uuid4(), calificacion_id=uuid4(), version=1, origen="automatico", cobertura_estado="completa",
        puntos_obtenidos=0, puntos_posibles=2, nota_maxima=5, nota_base=0, ajuste_global=0,
        nota_antes_redondeo=0, regla_redondeo="half_up", decimales=1, nota_final=0, requiere_revision=True,
        bloqueos_json=[], procedencia_json=provenance or {}, componentes=components, created_at=None,
    )


def reading(delivery_id, answers):
    return {
        "source_fingerprint": FINGERPRINT,
        "pages_processed": 1,
        "answers": [
            {"question_id": question_id, "question_number": number,
             "regions": [{"page": 1, "bbox": list(box), "frame": FRAME}]}
            for question_id, number, box in answers
        ],
    }


class FakeDb:
    def __init__(self, delivery):
        self.delivery = delivery
        self.rollbacks = 0
        self.commits = 0
        self.locks = 0

    async def get(self, model, identifier):
        return self.delivery

    async def rollback(self):
        self.rollbacks += 1

    async def commit(self):
        self.commits += 1

    async def execute(self, statement):
        self.locks += 1


@pytest.fixture
def scene(monkeypatch):
    delivery = SimpleNamespace(id=uuid4(), archivo_url="entregas/hoja.jpg")
    first, second = component(1), component(2)
    active = breakdown([first, second])
    grade = SimpleNamespace(id=active.calificacion_id, entrega_id=delivery.id, updated_at="sin cambios", estado="requiere_revision")
    evaluation = SimpleNamespace(id=uuid4(), nombre="Prueba de ciencias")
    actor = SimpleNamespace(id=uuid4())
    state = SimpleNamespace(
        db=FakeDb(delivery), delivery=delivery, active=active, grade=grade, evaluation=evaluation, actor=actor,
        readings=[], result=reading(delivery.id, [("q1", 1, (0.1, 0.2, 0.3, 0.1))]), failure=None, replaced=None,
    )

    async def active_breakdown(db, grade_id, *, lock=False):
        return state.replaced if lock and state.replaced is not None else state.active

    async def photo(entrega):
        return location.Photo(b"foto", "image/jpeg")

    async def read(photo, *, context, tracking):
        state.readings.append({"context": context, "tracking": tracking})
        if state.failure:
            raise state.failure
        return state.result

    async def configuration(db, *, feature, teacher_id=None):
        return {"feature": feature, "primary": {"model": "modelo-de-lectura"}}

    monkeypatch.setattr(breakdown_service, "get_active_breakdown", active_breakdown)
    monkeypatch.setattr(location, "load_photo", photo)
    monkeypatch.setattr(location, "read_regions", read)
    monkeypatch.setattr("app.services.ai_configuration_resolver.resolve_ai_configuration", configuration)
    return state


async def locate(scene):
    return await location.locate_answers(scene.db, grade=scene.grade, evaluation=scene.evaluation, actor=scene.actor)


@pytest.mark.asyncio
async def test_saves_the_zone_outside_the_components(scene):
    before = deepcopy([vars(item) for item in scene.active.componentes])

    result = await locate(scene)

    assert result == {"ubicadas": 1, "pendientes": 1, "intentos": 1, "intentos_maximos": 2}
    stored = scene.active.procedencia_json[LOCATED_KEY]
    assert list(stored["regiones"]) == ["pregunta:q1"]
    assert stored["regiones"]["pregunta:q1"][0]["bbox"] == [0.1, 0.2, 0.3, 0.1]
    assert [vars(item) for item in scene.active.componentes] == before
    assert scene.grade.updated_at == "sin cambios" and scene.grade.estado == "requiere_revision"
    assert scene.db.commits == 1


@pytest.mark.asyncio
async def test_the_reading_runs_without_an_open_transaction(scene):
    await locate(scene)

    assert scene.db.rollbacks == 1
    assert scene.readings[0]["tracking"]["_require_configured_route"] is True
    assert scene.readings[0]["tracking"]["_ai_config"]["feature"] == "calificacion.extraccion"


@pytest.mark.asyncio
async def test_the_reading_never_receives_keys_or_scores(scene):
    await locate(scene)

    context = scene.readings[0]["context"]
    assert context == {
        "nombre": "Prueba de ciencias",
        "preguntas": [
            {"id": "q1", "numero": "1", "enunciado": "Enunciado 1"},
            {"id": "q2", "numero": "2", "enunciado": "Enunciado 2"},
        ],
    }


@pytest.mark.asyncio
async def test_an_approved_feedback_review_keeps_its_fingerprint(scene):
    def fingerprint():
        return review_source_fingerprint(
            SimpleNamespace(id=scene.grade.id), SimpleNamespace(id=scene.evaluation.id, estructura_documento=None, respuestas_liberadas_actual=False),
            "Estudiante", "Materia", scene.active,
        )

    before = fingerprint()
    await locate(scene)

    assert fingerprint() == before


@pytest.mark.asyncio
async def test_a_question_that_already_has_its_zone_is_not_replaced(scene):
    own = region(scene.delivery.id, box=(0.5, 0.5, 0.2, 0.2))
    scene.active.componentes[0].evidencia_json = {"paginas": [1], "regiones": [own]}

    result = await locate(scene)

    assert result["ubicadas"] == 0
    assert scene.active.procedencia_json[LOCATED_KEY]["regiones"] == {}


@pytest.mark.asyncio
async def test_nothing_is_read_when_every_question_has_a_zone(scene):
    for item in scene.active.componentes:
        item.evidencia_json = {"paginas": [1], "regiones": [region(scene.delivery.id)]}

    result = await locate(scene)

    assert result == {"ubicadas": 0, "pendientes": 0, "intentos": 0, "intentos_maximos": 2}
    assert scene.readings == [] and scene.db.commits == 0


@pytest.mark.asyncio
async def test_a_third_search_is_refused_without_reading(scene):
    scene.active.procedencia_json = {LOCATED_KEY: {"intentos": 2, "regiones": {}}}

    with pytest.raises(HTTPException) as error:
        await locate(scene)

    assert error.value.status_code == 409
    assert scene.readings == []


@pytest.mark.asyncio
async def test_a_failed_reading_changes_nothing_and_can_be_retried(scene):
    scene.failure = RuntimeError("proveedor caído")

    with pytest.raises(HTTPException) as error:
        await locate(scene)

    assert error.value.status_code == 503
    assert "No cambió nada" in error.value.detail
    assert scene.active.procedencia_json == {} and scene.db.commits == 0


@pytest.mark.asyncio
async def test_a_grade_regraded_during_the_reading_is_not_written(scene):
    scene.replaced = breakdown([component(1), component(2)])

    with pytest.raises(HTTPException) as error:
        await locate(scene)

    assert error.value.status_code == 409
    assert scene.active.procedencia_json == {} and scene.replaced.procedencia_json == {}
    assert scene.db.commits == 0


@pytest.mark.asyncio
async def test_a_second_search_keeps_the_zones_already_found(scene):
    await locate(scene)
    scene.result = reading(scene.delivery.id, [("q2", 2, (0.4, 0.6, 0.2, 0.1))])

    result = await locate(scene)

    assert result == {"ubicadas": 1, "pendientes": 0, "intentos": 2, "intentos_maximos": 2}
    assert sorted(scene.active.procedencia_json[LOCATED_KEY]["regiones"]) == ["pregunta:q1", "pregunta:q2"]


@pytest.mark.asyncio
async def test_a_delivery_written_online_has_no_photo_to_search():
    with pytest.raises(HTTPException) as error:
        await location.load_photo(SimpleNamespace(id=uuid4(), archivo_url=None, visual_text_json=None))

    assert error.value.status_code == 409


def test_the_teacher_sees_the_located_zone_and_the_student_never_does():
    delivery_id = uuid4()
    located = region(delivery_id, page=2)
    active = breakdown([component(1), component(2)], {LOCATED_KEY: {"intentos": 1, "regiones": {"pregunta:q1": [located]}}})

    teacher = breakdown_service.serialize_breakdown(active)
    student = breakdown_service.serialize_breakdown(active, student=True)

    assert teacher["componentes"][0]["evidencia_regiones"] == [located]
    assert teacher["componentes"][0]["evidencia_paginas"] == [1, 2]
    assert teacher["componentes"][1]["evidencia_regiones"] == []
    assert teacher["componentes"][1]["evidencia_paginas"] == [1]
    assert [item["evidencia_regiones"] for item in student["componentes"]] == [[], []]
    assert student["componentes"][0]["evidencia_paginas"] == [1]


def test_the_zone_saved_when_grading_wins_over_a_located_one():
    delivery_id = uuid4()
    own = region(delivery_id, box=(0.5, 0.5, 0.2, 0.2))
    active = breakdown(
        [component(1, evidencia_json={"paginas": [1], "regiones": [own]})],
        {LOCATED_KEY: {"intentos": 1, "regiones": {"pregunta:q1": [region(delivery_id)]}}},
    )

    assert breakdown_service.serialize_breakdown(active)["componentes"][0]["evidencia_regiones"] == [own]


def test_stored_zones_are_validated_before_they_are_served():
    delivery_id = uuid4()
    provenance = {LOCATED_KEY: {"intentos": "muchos", "regiones": {
        "pregunta:q1": [region(delivery_id)],
        "pregunta:q2": [{"pagina": 1, "bbox": [0.9, 0.9, 0.5, 0.5], "marco": FRAME, "evidencia_version": "x"}],
        "pregunta:q3": "no es una lista",
    }}}

    assert list(located_answer_regions(provenance)) == ["pregunta:q1"]
    assert location_attempts(provenance) == 0
    assert located_answer_regions({LOCATED_KEY: "roto"}) == {} and located_answer_regions(None) == {}


def test_the_route_is_registered_for_the_owner_of_the_grade():
    paths = {route.path: route for route in revision_router.router.routes}

    assert "POST" in paths["/calificaciones/{calificacion_id}/ubicar-respuestas"].methods
