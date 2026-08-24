from __future__ import annotations

import asyncio
from types import SimpleNamespace
from uuid import uuid4

from app.main import create_app
from app.modules.evaluaciones.models import Evaluacion
from app.modules.herramientas import service


class QueryDB:
    def __init__(self) -> None:
        self.statement = ""

    async def execute(self, statement, _params):
        self.statement = str(statement)
        return SimpleNamespace(fetchall=lambda: [])


def test_resource_lifecycle_contract_is_registered_once() -> None:
    paths = create_app().openapi()["paths"]
    assert "/api/herramientas/{material_id}/visibilidad" in paths
    assert "/api/herramientas/{material_id}/asignar-apoyo" in paths
    assert "/api/herramientas/{material_id}/convertir-evaluacion" in paths
    assert set(paths["/api/herramientas/{material_id}/visibilidad"]) == {"patch"}


def test_activity_origin_has_a_single_database_identity() -> None:
    indexes = {index.name: index for index in Evaluacion.__table__.indexes}
    origin = indexes["uq_evaluaciones_material_origen_nonnull"]
    assert origin.unique is True
    assert [column.name for column in origin.columns] == ["material_origen_id"]


def test_student_subject_query_excludes_drafts_and_hidden_resources(monkeypatch) -> None:
    materia_id = uuid4()
    student = SimpleNamespace(id=uuid4(), rol="estudiante")

    async def can_read(_db, selected_id, current_user):
        assert selected_id == materia_id
        assert current_user is student

    monkeypatch.setattr(service.materias_service, "ensure_can_read_materia", can_read)
    db = QueryDB()
    result = asyncio.run(service.list_materials_for_materia(db, materia_id, student))

    assert result == []
    assert "mg.publicado_estudiantes = true" in db.statement
    assert "mg.asignacion_tipo = 'apoyo'" in db.statement
    assert "mg.asignacion_tipo = 'actividad'" in db.statement
    assert "e.estado IN" in db.statement
