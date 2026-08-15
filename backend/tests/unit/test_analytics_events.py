from __future__ import annotations

import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.analytics import event_policy, service
from app.shared.enums import UserRole


class FakeSession:
    def __init__(self) -> None:
        self.added = None
        self.committed = False
        self.refreshed = None

    def add(self, value) -> None:
        self.added = value

    async def commit(self) -> None:
        self.committed = True

    async def refresh(self, value) -> None:
        self.refreshed = value


def user(role: UserRole | str):
    role_value = role.value if isinstance(role, UserRole) else role
    return SimpleNamespace(id=uuid4(), rol=role_value)


def test_catalog_accepts_session_and_teacher_events() -> None:
    session = event_policy.validate_event_payload(
        tipo="session_view_opened",
        role=UserRole.ESTUDIANTE.value,
        evaluacion_id=None,
        calificacion_id=None,
        metadata_json={"surface": "actividades"},
    )
    workspace = event_policy.validate_event_payload(
        tipo="workspace_opened",
        role=UserRole.PROFESOR.value,
        evaluacion_id=uuid4(),
        calificacion_id=None,
        metadata_json={"materia_id": str(uuid4())},
    )

    assert session.metadata_json == {"surface": "actividades"}
    assert workspace.tipo == "workspace_opened"
    assert workspace.evaluacion_id is not None


@pytest.mark.parametrize(
    ("tipo", "role", "evaluation", "grade", "metadata", "status"),
    [
        ("evento_inventado", "profesor", None, None, {}, 422),
        ("workspace_opened", "estudiante", uuid4(), None, {"materia_id": str(uuid4())}, 403),
        ("workspace_opened", "profesor", None, None, {"materia_id": str(uuid4())}, 422),
        ("calificacion_opened", "profesor", uuid4(), None, {}, 422),
        ("session_view_opened", "estudiante", None, None, {"surface": "secreto"}, 422),
        ("batch_confirmed", "profesor", uuid4(), None, {"batch_size": 0}, 422),
        ("batch_confirmed", "profesor", uuid4(), None, {"batch_size": 501}, 422),
        ("session_view_opened", "estudiante", None, None, {"surface": ["inicio"]}, 422),
        ("session_view_opened", "estudiante", None, None, {"surface": "x" * 257}, 422),
        ("session_view_opened", "estudiante", None, None, {"actor_id": str(uuid4())}, 422),
        ("session_view_opened", "estudiante", None, None, {"rol": "admin"}, 422),
        ("session_view_opened", "estudiante", uuid4(), None, {"surface": "inicio"}, 422),
    ],
)
def test_catalog_rejects_unknown_role_reference_or_metadata(
    tipo: str,
    role: str,
    evaluation,
    grade,
    metadata: dict,
    status: int,
) -> None:
    with pytest.raises(event_policy.AnalyticsValidationError) as error:
        event_policy.validate_event_payload(
            tipo=tipo,
            role=role,
            evaluacion_id=evaluation,
            calificacion_id=grade,
            metadata_json=metadata,
        )

    assert error.value.status_code == status


def test_metadata_global_limits_are_enforced_before_event_keys() -> None:
    with pytest.raises(event_policy.AnalyticsValidationError, match="10 claves"):
        event_policy.validate_event_payload(
            tipo="session_view_opened",
            role="estudiante",
            evaluacion_id=None,
            calificacion_id=None,
            metadata_json={f"key_{index}": index for index in range(11)},
        )


def test_registrar_evento_derives_actor_and_persists_sanitized_payload(monkeypatch) -> None:
    session = FakeSession()
    actor = user(UserRole.PROFESOR)
    evaluation_id = uuid4()
    materia_id = uuid4()

    async def own_evaluation(*_args, **_kwargs):
        return SimpleNamespace(id=evaluation_id, materia_id=materia_id, profesor_id=actor.id)

    monkeypatch.setattr(service, "_get_allowed_evaluation", own_evaluation)
    monkeypatch.setattr(
        service,
        "AnalyticsEvento",
        lambda **values: SimpleNamespace(**values),
    )

    evento = asyncio.run(
        service.registrar_evento(
            session,
            tipo="workspace_opened",
            current_user=actor,
            evaluacion_id=evaluation_id,
            metadata_json={"materia_id": str(materia_id)},
        )
    )

    assert session.added is evento
    assert session.committed is True
    assert session.refreshed is evento
    assert evento.tipo == "workspace_opened"
    assert evento.actor_id == actor.id
    assert evento.evaluacion_id == evaluation_id
    assert evento.metadata_json == {"materia_id": str(materia_id)}


def test_foreign_and_missing_reference_share_404_and_never_persist(monkeypatch) -> None:
    actor = user(UserRole.PROFESOR)

    async def missing(*_args, **_kwargs):
        return None

    monkeypatch.setattr(service, "_get_allowed_evaluation", missing)

    for _case in ("missing", "foreign"):
        session = FakeSession()
        with pytest.raises(HTTPException) as error:
            asyncio.run(
                service.registrar_evento(
                    session,
                    tipo="calificacion_confirmed",
                    current_user=actor,
                    evaluacion_id=uuid4(),
                    metadata_json={},
                )
            )
        assert error.value.status_code == 404
        assert error.value.detail == "Referencia no encontrada"
        assert session.added is None
        assert session.committed is False


def test_grade_must_belong_to_the_referenced_evaluation(monkeypatch) -> None:
    actor = user(UserRole.PROFESOR)
    evaluation_id = uuid4()
    other_evaluation_id = uuid4()
    grade_id = uuid4()

    async def own_evaluation(*_args, **_kwargs):
        return SimpleNamespace(id=evaluation_id, materia_id=uuid4(), profesor_id=actor.id)

    async def own_grade(*_args, **_kwargs):
        return SimpleNamespace(id=grade_id, evaluacion_id=other_evaluation_id, estudiante_id=uuid4())

    monkeypatch.setattr(service, "_get_allowed_evaluation", own_evaluation)
    monkeypatch.setattr(service, "_get_allowed_calificacion", own_grade)
    session = FakeSession()

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            service.registrar_evento(
                session,
                tipo="calificacion_opened",
                current_user=actor,
                evaluacion_id=evaluation_id,
                calificacion_id=grade_id,
                metadata_json={},
            )
        )

    assert error.value.status_code == 422
    assert session.added is None
    assert session.committed is False


def test_invalid_event_never_creates_partial_row() -> None:
    session = FakeSession()

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            service.registrar_evento(
                session,
                tipo="unknown",
                current_user=user(UserRole.ESTUDIANTE),
                metadata_json={"email": "student@example.test"},
            )
        )

    assert error.value.status_code == 422
    assert session.added is None
    assert session.committed is False


def test_analytics_http_contract_uses_201_403_404_and_422(monkeypatch) -> None:
    from fastapi.testclient import TestClient

    from app.core.permissions import get_current_user
    from app.db.session import get_db
    from app.main import create_app

    async def run_case(actor, payload, expected_status, *, missing_reference=False):
        session = FakeSession()

        async def db_override():
            yield session

        async def missing(*_args, **_kwargs):
            return None

        if missing_reference:
            monkeypatch.setattr(service, "_get_allowed_evaluation", missing)
        monkeypatch.setattr(
            service,
            "AnalyticsEvento",
            lambda **values: SimpleNamespace(**values),
        )
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: actor
        app.dependency_overrides[get_db] = db_override
        response = TestClient(app, base_url="http://localhost").post(
            "/api/analytics/evento",
            json=payload,
        )
        assert response.status_code == expected_status, response.text
        if expected_status != 201:
            assert session.added is None
            assert session.committed is False
        return response

    student = user(UserRole.ESTUDIANTE)
    teacher = user(UserRole.PROFESOR)

    success = asyncio.run(
        run_case(
            student,
            {
                "tipo": "session_view_opened",
                "metadata_json": {"surface": "inicio"},
            },
            201,
        )
    )
    forbidden = asyncio.run(
        run_case(
            student,
            {
                "tipo": "workspace_opened",
                "evaluacion_id": str(uuid4()),
                "metadata_json": {"materia_id": str(uuid4())},
            },
            403,
        )
    )
    missing = asyncio.run(
        run_case(
            teacher,
            {
                "tipo": "calificacion_confirmed",
                "evaluacion_id": str(uuid4()),
                "metadata_json": {},
            },
            404,
            missing_reference=True,
        )
    )
    invalid = asyncio.run(
        run_case(
            student,
            {"tipo": "evento_inventado", "metadata_json": {}},
            422,
        )
    )

    assert success.json() == {"status": "ok"}
    assert forbidden.json()["detail"] == "Evento no permitido para este rol"
    assert missing.json()["detail"] == "Referencia no encontrada"
    assert invalid.json()["detail"] == "Evento analítico desconocido"
