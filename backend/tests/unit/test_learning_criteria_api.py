from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.permissions import get_current_user
from app.db.session import get_db
from app.main import create_app
from app.modules.criterios_aprendizaje import router as criteria_router
from app.modules.criterios_aprendizaje.router import router


def test_canonical_learning_criteria_routes_are_registered() -> None:
    routes = {(route.path, next(iter(route.methods))) for route in router.routes}
    paths = {path for path, _method in routes}

    assert "/materias/{materia_id}/criterios-aprendizaje" in paths
    assert "/criterios-aprendizaje/{set_id}" in paths
    assert "/criterios-aprendizaje/versiones/{version_id}/aprobar" in paths
    assert "/criterios-aprendizaje/versiones/{version_id}/fuentes/archivo" in paths
    assert "/criterios-aprendizaje/fuentes/{source_id}" in paths
    assert "/criterios-aprendizaje/versiones/{version_id}/proponer" in paths


def test_learning_criteria_requires_an_authenticated_session() -> None:
    response = TestClient(create_app(), base_url="http://localhost").get(
        "/api/criterios-aprendizaje/capacidades"
    )

    assert response.status_code == 401


def _set_payload(*, set_id, materia_id, teacher_id) -> dict:
    now = datetime.now(UTC).isoformat()
    return {
        "id": str(set_id),
        "materia_id": str(materia_id),
        "profesor_id": str(teacher_id),
        "titulo": "Comprensión del texto",
        "descripcion": None,
        "estado": "activo",
        "current_version_id": None,
        "version_trabajo": None,
        "version_aprobada": None,
        "usos": 0,
        "created_at": now,
        "updated_at": now,
    }


def _source_payload() -> dict:
    return {
        "id": str(uuid4()),
        "tipo": "texto",
        "orden": 1,
        "display_name": "Capítulo 3",
        "mime_type": "text/plain",
        "size_bytes": 25,
        "page_count": 1,
        "extraction_status": "lista",
        "visible_to_student": False,
        "error": None,
        "created_at": datetime.now(UTC).isoformat(),
    }


def test_manual_crud_and_text_source_keep_the_http_contract(monkeypatch) -> None:
    set_id, materia_id, version_id, teacher_id = uuid4(), uuid4(), uuid4(), uuid4()
    payload = _set_payload(set_id=set_id, materia_id=materia_id, teacher_id=teacher_id)
    actor = SimpleNamespace(id=teacher_id, rol="profesor", permissions=["dba.manage"])
    database = SimpleNamespace()

    async def db_override():
        yield database

    monkeypatch.setattr(settings, "CRITERIA_WRITE", True)
    monkeypatch.setattr(criteria_router.service, "list_sets", AsyncMock(return_value=([payload], 1)))
    monkeypatch.setattr(criteria_router.service, "create_set", AsyncMock(return_value=SimpleNamespace(id=set_id)))
    monkeypatch.setattr(criteria_router.service, "get_set", AsyncMock(return_value=payload))
    monkeypatch.setattr(criteria_router.service, "update_version", AsyncMock(return_value=SimpleNamespace(id=set_id)))
    monkeypatch.setattr(criteria_router.service, "archive_set", AsyncMock(return_value=SimpleNamespace(id=set_id)))
    monkeypatch.setattr(criteria_router.service, "serialize_set", AsyncMock(return_value=payload))
    monkeypatch.setattr(criteria_router.source_service, "add_text_source", AsyncMock(return_value=_source_payload()))
    monkeypatch.setattr(criteria_router.source_service, "delete_source", AsyncMock(return_value=None))

    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: actor
    app.dependency_overrides[get_db] = db_override
    client = TestClient(app, base_url="http://localhost")
    create_body = {
        "titulo": "Comprensión del texto",
        "intencion_docente": {"que_evaluar": "Comprensión y argumentación"},
    }

    assert client.get(f"/api/materias/{materia_id}/criterios-aprendizaje").status_code == 200
    created = client.post(
        f"/api/materias/{materia_id}/criterios-aprendizaje",
        headers={"Idempotency-Key": "criteria-contract-1"},
        json=create_body,
    )
    assert created.status_code == 201
    assert created.json()["id"] == str(set_id)
    criteria_router.service.create_set.assert_awaited_once()
    assert criteria_router.service.create_set.await_args.kwargs["idempotency_key"] == "criteria-contract-1"

    assert client.get(f"/api/criterios-aprendizaje/{set_id}").status_code == 200
    assert client.patch(
        f"/api/criterios-aprendizaje/versiones/{version_id}",
        json={"revision_esperada": 1, "titulo": "Comprensión revisada"},
    ).status_code == 200
    assert client.post(f"/api/criterios-aprendizaje/{set_id}/archivar").status_code == 200

    source = client.post(
        f"/api/criterios-aprendizaje/versiones/{version_id}/fuentes/texto",
        json={"titulo": "Capítulo 3", "contenido": "Material trabajado durante la clase."},
    )
    assert source.status_code == 201
    assert source.json()["visible_to_student"] is False
    assert client.delete(f"/api/criterios-aprendizaje/fuentes/{uuid4()}").status_code == 204


def test_invalid_multi_file_rotation_is_atomic_and_never_reaches_storage(monkeypatch) -> None:
    teacher_id = uuid4()
    actor = SimpleNamespace(id=teacher_id, rol="profesor", permissions=["dba.manage"])

    async def db_override():
        yield SimpleNamespace()

    monkeypatch.setattr(settings, "CRITERIA_WRITE", True)
    add_file = AsyncMock()
    monkeypatch.setattr(criteria_router.source_service, "add_file_source", add_file)
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: actor
    app.dependency_overrides[get_db] = db_override
    response = TestClient(app, base_url="http://localhost").post(
        f"/api/criterios-aprendizaje/versiones/{uuid4()}/fuentes/archivo",
        data={"rotaciones": "[90]"},
        files=[
            ("archivo", ("uno.png", b"one", "image/png")),
            ("archivo", ("dos.png", b"two", "image/png")),
        ],
    )

    assert response.status_code == 422
    add_file.assert_not_awaited()


def test_write_flag_rejects_changes_before_service_execution(monkeypatch) -> None:
    actor = SimpleNamespace(id=uuid4(), rol="profesor", permissions=["dba.manage"])

    async def db_override():
        yield SimpleNamespace()

    monkeypatch.setattr(settings, "CRITERIA_WRITE", False)
    create = AsyncMock()
    monkeypatch.setattr(criteria_router.service, "create_set", create)
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: actor
    app.dependency_overrides[get_db] = db_override
    response = TestClient(app, base_url="http://localhost").post(
        f"/api/materias/{uuid4()}/criterios-aprendizaje",
        json={
            "titulo": "Comprensión",
            "intencion_docente": {"que_evaluar": "Comprensión del texto"},
        },
    )

    assert response.status_code == 503
    create.assert_not_awaited()
