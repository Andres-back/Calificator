from __future__ import annotations

import asyncio
from types import SimpleNamespace
from uuid import uuid4

from app.modules.herramientas import service
from app.modules.herramientas.schemas import ConvertirEvaluacionRequest
from app.shared.enums import EvaluacionModalidad, PoliticaIntento


class FakeDB:
    def __init__(self) -> None:
        self.executions: list[tuple[object, dict]] = []

    async def execute(self, statement, params):
        self.executions.append((statement, params))


def test_conversion_delegates_to_the_canonical_evaluation_service(monkeypatch) -> None:
    material_id = uuid4()
    subject_id = uuid4()
    teacher = SimpleNamespace(id=uuid4())
    dba_id = uuid4()
    material = {
        "id": material_id,
        "tipo": "taller",
        "titulo": "Multiplicacion de cuarto",
        "materia_id": subject_id,
        "input_json": {
            "dba_ids": [str(dba_id), "uuid-invalido"],
            "dba_personalizado_ids": [],
        },
        "contenido_json": {
            "objetivo": "Resolver productos y explicar el procedimiento.",
            "preguntas": [
                {
                    "enunciado": "Cuanto es 4 x 9?",
                    "tipo": "opcion_multiple",
                    "opciones": ["A) 32", "B) 36"],
                    "respuesta_correcta": "B) 36",
                },
                {
                    "enunciado": "Explica la propiedad conmutativa.",
                    "tipo": "abierta",
                    "respuesta_esperada": "El orden no cambia el producto.",
                },
            ],
        },
    }
    request = ConvertirEvaluacionRequest(
        modalidad=EvaluacionModalidad.MIXTA,
        politica_intento=PoliticaIntento.MULTIPLES_INTENTOS,
        intentos_permitidos=2,
        tiempo_limite_minutos=45,
    )
    evaluation = SimpleNamespace(id=uuid4())
    captured: dict[str, object] = {}
    db = FakeDB()

    async def get_material(_db, selected_material_id, teacher_id):
        assert selected_material_id == material_id
        assert teacher_id == teacher.id
        return material

    async def no_existing(_db, selected_material_id, teacher_id):
        assert selected_material_id == material_id
        assert teacher_id == teacher.id
        return None

    async def can_manage(_db, selected_subject_id, user):
        assert selected_subject_id == subject_id
        assert user is teacher
        return SimpleNamespace(id=subject_id, profesor_id=teacher.id)

    async def create(
        _db,
        payload,
        user,
        *,
        material_origen_id,
        tipo_actividad,
    ):
        captured["payload"] = payload
        assert user is teacher
        assert material_origen_id == material_id
        assert tipo_actividad == "taller"
        return evaluation

    async def validate(_db, selected_evaluation, validation):
        assert selected_evaluation is evaluation
        captured["validation"] = validation
        return evaluation

    monkeypatch.setattr(service, "get_material", get_material)
    monkeypatch.setattr(service, "_linked_evaluation", no_existing)
    monkeypatch.setattr(service.materias_service, "ensure_can_manage_materia", can_manage)
    monkeypatch.setattr(service.evaluaciones_service, "create_evaluation", create)
    monkeypatch.setattr(service.evaluaciones_service, "validate_structure", validate)

    result = asyncio.run(
        service.convertir_a_evaluacion(db, material_id, teacher, request)
    )

    payload = captured["payload"]
    assert result is evaluation
    assert payload.materia_id == subject_id
    assert payload.modalidad == EvaluacionModalidad.MIXTA
    assert payload.politica_intento == PoliticaIntento.MULTIPLES_INTENTOS
    assert payload.intentos_permitidos == 2
    assert payload.tiempo_limite_minutos == 45
    assert payload.dba_ids == [dba_id]
    assert {item["modalidad_respuesta"] for item in payload.preguntas} == {
        "online",
        "fisica",
    }
    assert all(
        set(item) == {"numero", "respuesta"}
        for item in payload.respuestas_esperadas
    )
    assert "respuesta_correcta" not in str(payload.preguntas)
    assert "respuesta_esperada" not in str(payload.preguntas)
    assert len(db.executions) == 1
    statement, params = db.executions[0]
    assert "UPDATE materiales_generados" in str(statement)
    assert "INSERT INTO evaluaciones" not in str(statement)
    assert params["material_id"] == str(material_id)
    assert captured["validation"].reglas_feedback["requiere_confirmacion_docente"] is True


def test_conversion_is_idempotent_for_an_already_linked_material(monkeypatch) -> None:
    material_id = uuid4()
    teacher = SimpleNamespace(id=uuid4())
    existing = SimpleNamespace(id=uuid4(), material_origen_id=material_id)
    db = FakeDB()

    async def get_material(_db, selected_material_id, teacher_id):
        assert selected_material_id == material_id
        assert teacher_id == teacher.id
        return {"id": material_id, "tipo": "examen", "titulo": "Ya asignado"}

    async def linked(_db, selected_material_id, teacher_id):
        assert selected_material_id == material_id
        assert teacher_id == teacher.id
        return existing

    async def must_not_create(*_args, **_kwargs):
        raise AssertionError("La segunda conversion no debe crear otra evaluacion")

    monkeypatch.setattr(service, "get_material", get_material)
    monkeypatch.setattr(service, "_linked_evaluation", linked)
    monkeypatch.setattr(service.evaluaciones_service, "create_evaluation", must_not_create)

    result = asyncio.run(
        service.convertir_a_evaluacion(
            db,
            material_id,
            teacher,
            ConvertirEvaluacionRequest(modalidad=EvaluacionModalidad.ONLINE),
        )
    )

    assert result is existing
    assert db.executions == []
