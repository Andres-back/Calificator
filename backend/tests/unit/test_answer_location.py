"""Specs 175 y 182: ubicar las preguntas en la hoja sin cambiar la calificación."""

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
    GRID_METHOD,
    GRID_VERSION,
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


def grid_region(delivery_id, page=1, box=(0.25, 0.5, 0.25, 0.125)):
    return {**region(delivery_id, page, box), "metodo": GRID_METHOD}


@pytest.fixture
def scene(monkeypatch):
    delivery = SimpleNamespace(id=uuid4(), archivo_url="entregas/hoja.pdf")
    first, second = component(1), component(2)
    active = breakdown([first, second])
    grade = SimpleNamespace(id=active.calificacion_id, entrega_id=delivery.id, updated_at="sin cambios", estado="requiere_revision")
    evaluation = SimpleNamespace(id=uuid4(), nombre="Prueba de ciencias")
    actor = SimpleNamespace(id=uuid4())
    version = evidence_version(delivery.id, FINGERPRINT)
    state = SimpleNamespace(
        db=FakeDb(delivery), delivery=delivery, active=active, grade=grade, evaluation=evaluation, actor=actor,
        version=version, pages=[location.SheetPage(1, b"hoja1", version), location.SheetPage(2, b"hoja2", version)],
        calls=[], results={1: {"1": [0.25, 0.5, 0.25, 0.125]}, 2: {}}, failure=None, replaced=None,
    )

    async def active_breakdown(db, grade_id, *, lock=False):
        return state.replaced if lock and state.replaced is not None else state.active

    async def pages(entrega):
        return state.pages

    async def locate_page(page, numbers, *, snapshot, teacher_id):
        state.calls.append({"page": page.number, "numbers": numbers, "snapshot": snapshot, "teacher": teacher_id})
        if state.failure:
            raise state.failure
        return state.results[page.number]

    async def configuration(db, *, feature, teacher_id=None):
        return {"feature": feature, "primary": {"model": "modelo-de-vision"}}

    monkeypatch.setattr(breakdown_service, "get_active_breakdown", active_breakdown)
    monkeypatch.setattr(location, "load_pages", pages)
    monkeypatch.setattr(location, "locate_page", locate_page)
    monkeypatch.setattr("app.services.ai_configuration_resolver.resolve_ai_configuration", configuration)
    return state


async def locate(scene):
    return await location.locate_answers(scene.db, grade=scene.grade, evaluation=scene.evaluation, actor=scene.actor)


@pytest.mark.asyncio
async def test_saves_the_grid_zone_outside_the_components(scene):
    before = deepcopy([vars(item) for item in scene.active.componentes])

    result = await locate(scene)

    assert result == {"ubicadas": 1, "pendientes": 1, "intentos": 1, "intentos_maximos": 2}
    stored = scene.active.procedencia_json[LOCATED_KEY]
    assert stored["version"] == GRID_VERSION and stored["metodo"] == GRID_METHOD
    assert stored["regiones"] == {"pregunta:q1": [{
        "pagina": 1, "bbox": [0.25, 0.5, 0.25, 0.125], "marco": FRAME,
        "evidencia_version": scene.version, "metodo": GRID_METHOD,
    }]}
    assert [vars(item) for item in scene.active.componentes] == before
    assert scene.grade.updated_at == "sin cambios" and scene.grade.estado == "requiere_revision"
    assert scene.db.commits == 1


@pytest.mark.asyncio
async def test_every_page_is_located_without_an_open_transaction(scene):
    await locate(scene)

    assert scene.db.rollbacks == 1
    assert [call["page"] for call in scene.calls] == [1, 2]
    assert scene.calls[0]["numbers"] == ["1", "2"]
    assert scene.calls[0]["snapshot"]["feature"] == "calificacion.extraccion"
    assert scene.calls[0]["teacher"] == scene.actor.id


@pytest.mark.asyncio
async def test_the_locator_never_receives_answers_keys_or_scores(scene):
    await locate(scene)

    sent = repr(scene.calls)
    assert "Marcaste" not in sent and "Marcó B" not in sent and "'C'" not in sent


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
async def test_a_reading_zone_does_not_stop_the_grid_from_locating_the_question(scene):
    scene.active.componentes[0].evidencia_json = {"paginas": [1], "regiones": [region(scene.delivery.id, box=(0.65, 0.59, 0.22, 0.12))]}

    result = await locate(scene)

    assert result["ubicadas"] == 1
    assert list(scene.active.procedencia_json[LOCATED_KEY]["regiones"]) == ["pregunta:q1"]


@pytest.mark.asyncio
async def test_spec_175_attempts_do_not_block_the_grid(scene):
    scene.active.procedencia_json = {LOCATED_KEY: {"version": 1, "intentos": 2, "regiones": {
        "pregunta:q2": [region(scene.delivery.id, box=(0.1, 0.1, 0.1, 0.1))],
    }}}

    result = await locate(scene)

    assert result["intentos"] == 1
    stored = scene.active.procedencia_json[LOCATED_KEY]["regiones"]
    assert sorted(stored) == ["pregunta:q1", "pregunta:q2"]
    assert "metodo" not in stored["pregunta:q2"][0]


@pytest.mark.asyncio
async def test_a_third_grid_location_is_refused_without_calling_the_model(scene):
    scene.active.procedencia_json = {LOCATED_KEY: {"version": GRID_VERSION, "metodo": GRID_METHOD, "intentos": 2, "regiones": {}}}

    with pytest.raises(HTTPException) as error:
        await locate(scene)

    assert error.value.status_code == 409
    assert scene.calls == []


@pytest.mark.asyncio
async def test_a_failed_location_changes_nothing_and_can_be_retried(scene):
    scene.failure = RuntimeError("proveedor caído")

    with pytest.raises(HTTPException) as error:
        await locate(scene)

    assert error.value.status_code == 503
    assert "No cambió nada" in error.value.detail
    assert scene.active.procedencia_json == {} and scene.db.commits == 0


@pytest.mark.asyncio
async def test_one_failed_page_keeps_what_the_other_pages_found(scene, monkeypatch):
    async def locate_page(page, numbers, *, snapshot, teacher_id):
        if page.number == 2:
            raise RuntimeError("hoja 2 falló")
        return {"1": [0.25, 0.5, 0.25, 0.125]}

    monkeypatch.setattr(location, "locate_page", locate_page)
    result = await locate(scene)

    assert result["ubicadas"] == 1 and scene.db.commits == 1


@pytest.mark.asyncio
async def test_a_grade_regraded_during_the_location_is_not_written(scene):
    scene.replaced = breakdown([component(1), component(2)])

    with pytest.raises(HTTPException) as error:
        await locate(scene)

    assert error.value.status_code == 409
    assert scene.active.procedencia_json == {} and scene.replaced.procedencia_json == {}
    assert scene.db.commits == 0


@pytest.mark.asyncio
async def test_a_second_location_keeps_the_zones_already_found(scene):
    await locate(scene)
    scene.results = {1: {}, 2: {"2": [0.5, 0.25, 0.25, 0.125]}}

    result = await locate(scene)

    assert result == {"ubicadas": 1, "pendientes": 0, "intentos": 2, "intentos_maximos": 2}
    stored = scene.active.procedencia_json[LOCATED_KEY]["regiones"]
    assert sorted(stored) == ["pregunta:q1", "pregunta:q2"]
    assert stored["pregunta:q2"][0]["pagina"] == 2


@pytest.mark.asyncio
async def test_a_delivery_written_online_has_no_sheet_to_locate():
    with pytest.raises(HTTPException) as error:
        await location.load_pages(SimpleNamespace(id=uuid4(), archivo_url=None, visual_text_json=None, evidencia_manifiesto=None))

    assert error.value.status_code == 409


def test_repeated_question_numbers_are_not_guessed():
    components = [component(1), component(2), component(3, numero="2")]

    assert location.question_numbers(components) == {"1": "pregunta:q1"}


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


def test_the_reading_zone_wins_over_a_spec_175_zone():
    delivery_id = uuid4()
    own = region(delivery_id, box=(0.5, 0.5, 0.2, 0.2))
    active = breakdown(
        [component(1, evidencia_json={"paginas": [1], "regiones": [own]})],
        {LOCATED_KEY: {"intentos": 1, "regiones": {"pregunta:q1": [region(delivery_id)]}}},
    )

    assert breakdown_service.serialize_breakdown(active)["componentes"][0]["evidencia_regiones"] == [own]


def test_the_grid_zone_wins_over_the_reading_zone_for_the_teacher_only():
    delivery_id = uuid4()
    own = region(delivery_id, box=(0.65, 0.59, 0.22, 0.12))
    located = grid_region(delivery_id, page=2)
    active = breakdown(
        [component(1, evidencia_json={"paginas": [1], "regiones": [own]})],
        {LOCATED_KEY: {"version": GRID_VERSION, "metodo": GRID_METHOD, "intentos": 1, "regiones": {"pregunta:q1": [located]}}},
    )

    teacher = breakdown_service.serialize_breakdown(active)["componentes"][0]
    student = breakdown_service.serialize_breakdown(active, student=True)["componentes"][0]
    assert teacher["evidencia_regiones"] == [located]
    assert teacher["evidencia_paginas"] == [1, 2]
    assert student["evidencia_regiones"] == []


def test_stored_zones_are_validated_before_they_are_served():
    delivery_id = uuid4()
    provenance = {LOCATED_KEY: {"version": GRID_VERSION, "metodo": GRID_METHOD, "intentos": "muchos", "regiones": {
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
