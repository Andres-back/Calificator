from __future__ import annotations

import asyncio
from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.calificaciones import service


def test_student_review_request_is_attached_to_their_confirmed_grade(monkeypatch) -> None:
    evaluation_id = uuid4()
    student_id = uuid4()
    grade_id = uuid4()
    grade = SimpleNamespace(id=grade_id)
    captured: dict = {}

    async def fake_grade(*_args, **kwargs):
        assert kwargs["evaluacion_id"] == evaluation_id
        assert kwargs["estudiante_id"] == student_id
        return grade

    class FakeDB:
        async def scalar(self, _statement):
            return None

    async def fake_create(_db, calificacion_id, tipo, descripcion, metadata):
        captured.update(
            calificacion_id=calificacion_id,
            tipo=tipo,
            descripcion=descripcion,
            metadata=metadata,
        )
        now = datetime.now()
        return {
            "id": uuid4(), "calificacion_id": calificacion_id, "tipo": tipo,
            "descripcion": descripcion, "estado": "abierta", "metadata_json": metadata,
            "resolucion": None, "resuelto_por": None, "resolved_at": None,
            "created_at": now, "updated_at": now,
        }

    monkeypatch.setattr(service, "_calificacion_revisada_del_estudiante", fake_grade)
    monkeypatch.setattr(service, "crear_incidencia", fake_create)

    result = asyncio.run(
        service.crear_solicitud_revision_estudiante(
            FakeDB(),
            evaluacion_id=evaluation_id,
            estudiante_id=student_id,
            motivo="respuesta",
            descripcion="La pregunta 3 necesita una segunda revisión.",
        )
    )

    assert result["estado"] == "abierta"
    assert captured["calificacion_id"] == grade_id
    assert captured["tipo"] == "solicitud_revision"
    assert captured["metadata"]["origen"] == "estudiante"
    assert captured["metadata"]["motivo"] == "respuesta"


def test_student_cannot_duplicate_an_open_review_request(monkeypatch) -> None:
    grade = SimpleNamespace(id=uuid4())

    async def fake_grade(*_args, **_kwargs):
        return grade

    class FakeDB:
        async def scalar(self, _statement):
            return SimpleNamespace(id=uuid4(), estado="abierta")

    monkeypatch.setattr(service, "_calificacion_revisada_del_estudiante", fake_grade)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            service.crear_solicitud_revision_estudiante(
                FakeDB(),
                evaluacion_id=uuid4(),
                estudiante_id=uuid4(),
                motivo="nota",
                descripcion="La suma del puntaje no coincide con los criterios.",
            )
        )

    assert exc.value.status_code == 409
    assert "solicitud de revisión abierta" in exc.value.detail
