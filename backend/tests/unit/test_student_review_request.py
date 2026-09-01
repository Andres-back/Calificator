from __future__ import annotations

import asyncio
from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.calificaciones import router, service
from app.modules.authorization.catalog import default_permissions_for_role
from app.modules.calificaciones.schemas import ResolverIncidencia
from app.shared.enums import UserRole


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


def test_resolve_review_request_uses_naive_utc_for_database(monkeypatch) -> None:
    incidencia = SimpleNamespace(
        id=uuid4(),
        calificacion_id=uuid4(),
        tipo="solicitud_revision",
        descripcion="Revisar el puntaje de la pregunta 2.",
        estado="abierta",
        metadata_json={},
        resolucion=None,
        resuelto_por=None,
        resolved_at=None,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    class FakeDB:
        async def scalar(self, _statement):
            return incidencia

        async def commit(self):
            assert incidencia.resolved_at is not None
            assert incidencia.resolved_at.tzinfo is None

        async def refresh(self, _instance):
            return None

    result = asyncio.run(
        service.resolver_incidencia(
            FakeDB(),
            incidencia_id=incidencia.id,
            resolucion="Se verificó y ajustó la calificación.",
            resuelto_por=uuid4(),
        )
    )

    assert result is not None
    assert result["estado"] == "resuelta"
    assert result["resolved_at"].tzinfo is None


def test_teacher_cannot_resolve_another_teachers_review_request(monkeypatch) -> None:
    teacher = SimpleNamespace(
        id=uuid4(), rol=UserRole.PROFESOR.value,
        _effective_permissions=default_permissions_for_role(UserRole.PROFESOR.value),
    )
    incidence = SimpleNamespace(id=uuid4(), calificacion_id=uuid4())
    grade = SimpleNamespace(evaluacion_id=uuid4())

    class FakeDB:
        async def scalar(self, _statement):
            return incidence

    async def fake_grade(*_args, **_kwargs):
        return grade

    async def deny_management(*_args, **_kwargs):
        raise HTTPException(status_code=403, detail="No puedes administrar esta evaluación")

    async def must_not_resolve(*_args, **_kwargs):
        raise AssertionError("Una incidencia ajena no debe resolverse")

    monkeypatch.setattr(router.service, "get_calificacion_or_404", fake_grade)
    monkeypatch.setattr(
        router.evaluaciones_service,
        "ensure_can_manage_evaluation",
        deny_management,
    )
    monkeypatch.setattr(router.service, "resolver_incidencia", must_not_resolve)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            router.resolver_incidencia(
                incidence.id,
                ResolverIncidencia(resolucion="Se revisó la solicitud."),
                current_user=teacher,
                db=FakeDB(),
            )
        )

    assert exc.value.status_code == 403

def test_owner_teacher_can_resolve_their_review_request(monkeypatch) -> None:
    teacher = SimpleNamespace(
        id=uuid4(), rol=UserRole.PROFESOR.value,
        _effective_permissions=default_permissions_for_role(UserRole.PROFESOR.value),
    )
    incidence = SimpleNamespace(id=uuid4(), calificacion_id=uuid4())
    grade = SimpleNamespace(evaluacion_id=uuid4())
    expected = {"id": incidence.id, "estado": "resuelta"}

    class FakeDB:
        async def scalar(self, _statement):
            return incidence

    async def fake_grade(*_args, **_kwargs):
        return grade

    async def allow_management(*_args, **_kwargs):
        return SimpleNamespace(id=grade.evaluacion_id)

    async def fake_resolve(*_args, **kwargs):
        assert kwargs["incidencia"] is incidence
        return expected

    monkeypatch.setattr(router.service, "get_calificacion_or_404", fake_grade)
    monkeypatch.setattr(
        router.evaluaciones_service,
        "ensure_can_manage_evaluation",
        allow_management,
    )
    monkeypatch.setattr(router.service, "resolver_incidencia", fake_resolve)

    result = asyncio.run(
        router.resolver_incidencia(
            incidence.id,
            ResolverIncidencia(resolucion="Se revisó y respondió la solicitud."),
            current_user=teacher,
            db=FakeDB(),
        )
    )

    assert result == expected

def test_student_cannot_resolve_review_request() -> None:
    student = SimpleNamespace(
        id=uuid4(), rol=UserRole.ESTUDIANTE.value,
        _effective_permissions=default_permissions_for_role(UserRole.ESTUDIANTE.value),
    )

    class MustNotQueryDB:
        async def scalar(self, _statement):
            raise AssertionError("El estudiante debe ser rechazado antes de consultar la incidencia")

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            router.resolver_incidencia(
                uuid4(),
                ResolverIncidencia(resolucion="Intento inválido."),
                current_user=student,
                db=MustNotQueryDB(),
            )
        )

    assert error.value.status_code == 403


def test_student_consults_only_their_review_request(monkeypatch) -> None:
    student = SimpleNamespace(
        id=uuid4(), rol=UserRole.ESTUDIANTE.value,
        _effective_permissions=default_permissions_for_role(UserRole.ESTUDIANTE.value),
    )
    evaluation_id = uuid4()
    expected = {"id": uuid4(), "estado": "abierta"}
    captured: dict[str, object] = {}

    async def fake_get(_db, *, evaluacion_id, estudiante_id):
        captured.update(evaluacion_id=evaluacion_id, estudiante_id=estudiante_id)
        return expected

    monkeypatch.setattr(service, "obtener_solicitud_revision_estudiante", fake_get)
    result = asyncio.run(
        router.obtener_mi_solicitud_revision(
            evaluation_id,
            current_user=student,
            db=object(),
        )
    )

    assert result == expected
    assert captured == {"evaluacion_id": evaluation_id, "estudiante_id": student.id}


def test_admin_resolution_preserves_actor_and_auditable_result(monkeypatch) -> None:
    admin = SimpleNamespace(
        id=uuid4(), rol=UserRole.ADMIN.value,
        _effective_permissions=default_permissions_for_role(UserRole.ADMIN.value),
    )
    incidence = SimpleNamespace(id=uuid4(), calificacion_id=uuid4())
    grade = SimpleNamespace(evaluacion_id=uuid4())
    now = datetime.now()
    expected = {
        "id": incidence.id,
        "estado": "resuelta",
        "resuelto_por": admin.id,
        "resolved_at": now,
        "resolucion": "Se verificó la evidencia y se mantuvo la nota.",
    }

    class FakeDB:
        async def scalar(self, _statement):
            return incidence

    async def fake_grade(*_args, **_kwargs):
        return grade

    async def allow_management(*_args, **_kwargs):
        return SimpleNamespace(id=grade.evaluacion_id)

    async def fake_resolve(_db, incidencia_id, resolucion, resuelto_por, *, incidencia):
        assert incidencia_id == incidence.id
        assert incidencia is incidence
        assert resolucion == expected["resolucion"]
        assert resuelto_por == admin.id
        return expected

    monkeypatch.setattr(router.service, "get_calificacion_or_404", fake_grade)
    monkeypatch.setattr(router.evaluaciones_service, "ensure_can_manage_evaluation", allow_management)
    monkeypatch.setattr(router.service, "resolver_incidencia", fake_resolve)

    result = asyncio.run(
        router.resolver_incidencia(
            incidence.id,
            ResolverIncidencia(resolucion=expected["resolucion"]),
            current_user=admin,
            db=FakeDB(),
        )
    )

    assert result == expected
    assert result["resuelto_por"] == admin.id
    assert result["resolved_at"] == now
