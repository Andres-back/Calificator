from __future__ import annotations

import asyncio
from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.herramientas import service
from app.modules.evaluaciones import service as evaluaciones_service


class FakeDB:
    def __init__(self, rows: list[object] | None = None) -> None:
        self.executions: list[tuple[object, dict]] = []
        self.rows = rows or []
        self.commits = 0

    async def execute(self, statement, params):
        self.executions.append((statement, params))
        return SimpleNamespace(
            fetchall=lambda: self.rows,
            fetchone=lambda: self.rows[0] if self.rows else None,
        )

    async def commit(self) -> None:
        self.commits += 1


def test_assign_support_publishes_resource_without_creating_an_evaluation(monkeypatch) -> None:
    material_id = uuid4()
    subject_id = uuid4()
    teacher = SimpleNamespace(id=uuid4(), rol="profesor")
    before = {"id": material_id, "evaluacion_id": None}
    after = {
        "id": material_id,
        "materia_id": subject_id,
        "asignacion_tipo": "apoyo",
        "publicado_estudiantes": True,
    }
    calls = 0

    async def get_material(_db, selected_id, teacher_id):
        nonlocal calls
        assert selected_id == material_id
        assert teacher_id == teacher.id
        calls += 1
        return before if calls == 1 else after

    async def no_linked_evaluation(_db, selected_id, teacher_id):
        assert selected_id == material_id
        assert teacher_id == teacher.id
        return None

    async def can_manage(_db, selected_subject_id, user):
        assert selected_subject_id == subject_id
        assert user is teacher
        return SimpleNamespace(id=subject_id)

    monkeypatch.setattr(service, "get_material", get_material)
    monkeypatch.setattr(service, "_linked_evaluation", no_linked_evaluation)
    monkeypatch.setattr(service.materias_service, "ensure_can_manage_materia", can_manage)
    db = FakeDB()

    result = asyncio.run(
        service.assign_material_as_support(db, material_id, teacher, subject_id)
    )

    assert result is after
    assert db.commits == 1
    assert len(db.executions) == 1
    statement, params = db.executions[0]
    sql = str(statement)
    assert "asignacion_tipo = 'apoyo'" in sql
    assert "publicado_estudiantes = true" in sql
    assert "evaluaciones" not in sql
    assert params["materia_id"] == str(subject_id)


def test_assign_support_rejects_a_resource_already_used_as_activity(monkeypatch) -> None:
    material_id = uuid4()
    teacher = SimpleNamespace(id=uuid4(), rol="profesor")

    async def get_material(*_args):
        return {"id": material_id}

    async def linked(*_args):
        return SimpleNamespace(id=uuid4())

    monkeypatch.setattr(service, "get_material", get_material)
    monkeypatch.setattr(service, "_linked_evaluation", linked)

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            service.assign_material_as_support(
                FakeDB(), material_id, teacher, uuid4()
            )
        )

    assert error.value.status_code == 409


def test_student_subject_resources_include_only_visible_support_or_activity(monkeypatch) -> None:
    subject_id = uuid4()
    student = SimpleNamespace(id=uuid4(), rol="estudiante")
    now = datetime.now()
    row = SimpleNamespace(
        id=uuid4(),
        tipo="guia",
        titulo="Repaso de multiplicación",
        materia_id=subject_id,
        materia_nombre="Matemáticas",
        archivo_url=None,
        created_at=now,
        updated_at=now,
        asignacion_tipo="apoyo",
        publicado_estudiantes=True,
        fecha_publicacion=now,
        evaluacion_id=None,
        evaluacion_estado=None,
        evaluacion_modalidad=None,
        evaluacion_recepcion_habilitada=None,
    )
    authorized = False

    async def can_read(_db, selected_subject_id, user):
        nonlocal authorized
        assert selected_subject_id == subject_id
        assert user is student
        authorized = True

    monkeypatch.setattr(service.materias_service, "ensure_can_read_materia", can_read)
    db = FakeDB([row])

    result = asyncio.run(
        service.list_materials_for_materia(db, subject_id, student)
    )

    assert authorized is True
    assert result[0]["id"] == row.id
    sql = str(db.executions[0][0])
    assert "mg.asignacion_tipo = 'apoyo'" in sql
    assert "mg.publicado_estudiantes = true" in sql

def test_student_can_open_visible_activity_without_receiving_solution_keys(monkeypatch) -> None:
    subject_id = uuid4()
    material_id = uuid4()
    student = SimpleNamespace(id=uuid4(), rol="estudiante")
    now = datetime.now()
    row = SimpleNamespace(
        id=material_id,
        tipo="sopa_letras",
        titulo="Sopa de multiplicación",
        materia_id=subject_id,
        materia_nombre="Matemáticas",
        contenido_json={
            "titulo": "Sopa de multiplicación",
            "banco_palabras": ["PRODUCTO"],
            "respuesta_correcta": "PRODUCTO",
            "soluciones": [{"palabra": "PRODUCTO", "fila": 1}],
        },
        archivo_url=None,
        created_at=now,
        updated_at=now,
        asignacion_tipo="actividad",
        publicado_estudiantes=True,
        fecha_publicacion=now,
        evaluacion_id=uuid4(),
        evaluacion_estado="publicada",
        evaluacion_modalidad="fisica",
        evaluacion_recepcion_habilitada=True,
    )

    async def can_read(_db, selected_subject_id, user):
        assert selected_subject_id == subject_id
        assert user is student

    monkeypatch.setattr(service.materias_service, "ensure_can_read_materia", can_read)
    db = FakeDB([row])

    result = asyncio.run(service.get_material_for_user(db, material_id, student))

    assert result is not None
    assert result["asignacion_tipo"] == "actividad"
    assert result["contenido_json"]["banco_palabras"] == ["PRODUCTO"]
    assert "respuesta_correcta" not in result["contenido_json"]
    assert "soluciones" not in result["contenido_json"]
    sql = str(db.executions[0][0])
    assert "mg.asignacion_tipo = 'actividad'" in sql
    assert "e.estado IN" in sql


def test_activity_payload_keeps_material_metadata_and_sanitizes_generic_content() -> None:
    material_id = uuid4()
    payload = evaluaciones_service.build_student_activity_payload(
        "taller",
        "Taller de fracciones",
        {
            "puntos": [
                {
                    "numero": 1,
                    "enunciado": "Representa un medio.",
                    "respuesta_esperada": "1/2",
                }
            ]
        },
        material_id=material_id,
    )

    assert payload["material_id"] == material_id
    assert payload["tipo"] == "taller"
    assert payload["interactivo"] is False
    assert payload["contenido"]["puntos"][0]["enunciado"] == "Representa un medio."
    assert "respuesta_esperada" not in payload["contenido"]["puntos"][0]

def test_editing_word_search_rebuilds_grid_and_removes_stale_words() -> None:
    rebuilt = service._rebuild_edited_puzzle(
        "sopa_letras",
        {
            "titulo": "Repaso",
            "banco": [
                {"palabra": "SUMA", "pista": "Operación de agregar"},
                {"palabra": "RESTA", "pista": "Operación de quitar"},
            ],
            "grilla": [["X"]],
            "banco_palabras": ["PALABRA_ANTIGUA"],
        },
    )

    assert set(rebuilt["banco_palabras"]) == {"SUMA", "RESTA"}
    assert "PALABRA_ANTIGUA" not in rebuilt["banco_palabras"]
    assert len(rebuilt["grilla"]) >= 5
    assert rebuilt["sopa_letras"]["grid"] == rebuilt["grilla"]
    assert {item["palabra"] for item in rebuilt["banco"]} == {"SUMA", "RESTA"}


def test_editing_matching_pairs_rebuilds_columns_and_solution_key() -> None:
    rebuilt = service._rebuild_edited_puzzle(
        "emparejar",
        {
            "pares": [
                {"izquierda": "2 × 3", "derecha": "6"},
                {"izquierda": "4 × 5", "derecha": "20"},
            ],
            "columna_izquierda": [{"numero": 99, "texto": "Dato viejo"}],
        },
    )

    assert [item["numero"] for item in rebuilt["columna_izquierda"]] == [1, 2]
    assert {item["texto"] for item in rebuilt["columna_derecha"]} == {"6", "20"}
    assert len(rebuilt["soluciones"]) == 2

def test_teacher_subject_resources_include_drafts_and_activities(monkeypatch) -> None:
    subject_id = uuid4()
    teacher = SimpleNamespace(id=uuid4(), rol="profesor")

    async def can_manage(_db, selected_subject_id, user):
        assert selected_subject_id == subject_id
        assert user is teacher

    monkeypatch.setattr(service.materias_service, "ensure_can_manage_materia", can_manage)
    db = FakeDB()

    assert asyncio.run(service.list_materials_for_materia(db, subject_id, teacher)) == []
    sql = str(db.executions[0][0])
    assert "mg.materia_id = :materia_id" in sql
    assert "mg.asignacion_tipo = 'apoyo'" not in sql
    assert "mg.publicado_estudiantes = true" not in sql


def test_visibility_update_does_not_change_evaluation_reception(monkeypatch) -> None:
    material_id = uuid4()
    teacher = SimpleNamespace(id=uuid4(), rol="profesor")
    calls = 0

    async def get_material(_db, _material_id, _teacher_id):
        nonlocal calls
        calls += 1
        return {
            "id": material_id,
            "asignacion_tipo": "apoyo",
            "publicado_estudiantes": calls > 1,
        }

    monkeypatch.setattr(service, "get_material", get_material)
    db = FakeDB()
    result = asyncio.run(
        service.set_material_visibility(db, material_id, teacher, visible=True)
    )

    assert result["publicado_estudiantes"] is True
    sql = str(db.executions[0][0])
    assert "publicado_estudiantes = :visible" in sql
    assert "recepcion_habilitada" not in sql

def test_assign_support_rejects_changing_original_subject(monkeypatch) -> None:
    material_id = uuid4()
    original_subject_id = uuid4()
    other_subject_id = uuid4()
    teacher = SimpleNamespace(id=uuid4(), rol="profesor")

    async def get_material(*_args):
        return {"id": material_id, "materia_id": original_subject_id}

    monkeypatch.setattr(service, "get_material", get_material)
    db = FakeDB()

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            service.assign_material_as_support(
                db, material_id, teacher, other_subject_id
            )
        )

    assert error.value.status_code == 409
    assert "conserva la materia" in error.value.detail
    assert db.executions == []


def test_convert_activity_rejects_changing_original_subject(monkeypatch) -> None:
    material_id = uuid4()
    original_subject_id = uuid4()
    other_subject_id = uuid4()
    teacher = SimpleNamespace(id=uuid4(), rol="profesor")

    async def get_material(*_args):
        return {"id": material_id, "materia_id": original_subject_id}

    async def no_linked_evaluation(*_args):
        return None

    monkeypatch.setattr(service, "get_material", get_material)
    monkeypatch.setattr(service, "_linked_evaluation", no_linked_evaluation)

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            service.convertir_a_evaluacion(
                FakeDB(),
                material_id,
                teacher,
                SimpleNamespace(materia_id=other_subject_id),
            )
        )

    assert error.value.status_code == 409
    assert "conserva la materia" in error.value.detail
