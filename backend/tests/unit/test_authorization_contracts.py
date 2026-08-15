from __future__ import annotations

import asyncio
import re
from datetime import date, datetime
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.asistencia import router as asistencia_router
from app.modules.dba import router as dba_router
from app.modules.evaluaciones import service as evaluaciones_service
from app.modules.herramientas import router as herramientas_router
from app.modules.herramientas import service as herramientas_service
from app.modules.materias import service as materias_service
from app.shared.enums import UserRole
from authorization_helpers import (
    AUTHORIZATION_SURFACES,
    assert_denied,
    assert_unchanged,
    authenticated_client,
    make_user,
    snapshot,
    unauthenticated_client,
)


MATRIX_PATH = (
    Path(__file__).resolve().parents[3]
    / "specs"
    / "014-alinear-autorizacion-superficies"
    / "contracts"
    / "authorization-matrix.md"
)


def test_authorization_matrix_defines_exactly_the_ten_canonical_surfaces() -> None:
    markdown = MATRIX_PATH.read_text(encoding="utf-8")
    documented = {
        f"{method} {path}"
        for method, path in re.findall(
            r"^\| `(GET|PUT|POST|PATCH) ([^`]+)` \|",
            markdown,
            flags=re.MULTILINE,
        )
    }

    assert documented == AUTHORIZATION_SURFACES
    assert len(documented) == 10


def test_authorization_matrix_documents_common_negative_guarantees() -> None:
    markdown = MATRIX_PATH.read_text(encoding="utf-8")

    assert "Sesión ausente: autenticación requerida" in markdown
    assert "Rol correcto sin propiedad: denegación" in markdown
    assert "Una denegación no produce cambios persistentes" in markdown
    assert "Los endpoints heredados conservan sus códigos públicos" in markdown


@pytest.mark.parametrize(
    ("method", "path", "json_body"),
    [
        ("get", f"/api/materias/{uuid4()}/asistencia?fecha=2026-08-14", None),
        ("put", f"/api/materias/{uuid4()}/asistencia", {"fecha": "2026-08-14", "registros": []}),
        ("get", f"/api/materias/{uuid4()}/dba", None),
        ("get", f"/api/herramientas/materias/{uuid4()}/recursos", None),
        ("get", f"/api/herramientas/{uuid4()}", None),
        ("get", "/api/presentaciones", None),
        ("get", f"/api/presentaciones/{uuid4()}/estado", None),
        ("get", f"/api/presentaciones/{uuid4()}/preview", None),
        ("post", "/api/analytics/evento", {"tipo": "session_view_opened", "metadata_json": {"surface": "inicio"}}),
        ("patch", f"/api/incidencias/{uuid4()}/resolver", {"resolucion": "Revisión documentada."}),
    ],
)
def test_all_canonical_surfaces_require_a_session(method: str, path: str, json_body: dict | None) -> None:
    client = unauthenticated_client()

    response = client.request(method, path, json=json_body)

    assert response.status_code == 401


def test_attendance_denial_happens_before_read_or_write(monkeypatch) -> None:
    outsider = make_user(UserRole.PROFESOR)
    materia_id = uuid4()
    writes: list[str] = []

    async def deny(*_args, **_kwargs):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    async def must_not_read(*_args, **_kwargs):
        writes.append("read")
        raise AssertionError("No debe consultar asistencia ajena")

    async def must_not_write(*_args, **_kwargs):
        writes.append("write")
        raise AssertionError("No debe registrar asistencia ajena")

    monkeypatch.setattr(asistencia_router.materias_service, "ensure_can_manage_materia", deny)
    monkeypatch.setattr(asistencia_router.service, "get_attendance_day", must_not_read)
    monkeypatch.setattr(asistencia_router.service, "save_attendance_day", must_not_write)
    before = snapshot(writes)

    with pytest.raises(HTTPException) as get_error:
        asyncio.run(
            asistencia_router.get_attendance_day(
                materia_id,
                date(2026, 8, 14),
                current_user=outsider,
                db=object(),
            )
        )
    with pytest.raises(HTTPException) as put_error:
        asyncio.run(
            asistencia_router.save_attendance_day(
                materia_id,
                SimpleNamespace(fecha=date(2026, 8, 14), registros=[]),
                current_user=outsider,
                db=object(),
            )
        )

    assert get_error.value.status_code == 403
    assert put_error.value.status_code == 403
    assert_unchanged(before, writes)


def test_attendance_owner_and_admin_preserve_success_contract(monkeypatch) -> None:
    materia_id = uuid4()
    expected = {
        "materia_id": materia_id,
        "fecha": "2026-08-14",
        "registros": [],
        "resumen": {"total": 0, "presentes": 0, "tarde": 0, "ausentes": 0, "excusas": 0, "pendientes": 0},
    }

    async def allow(_db, _materia_id, current_user):
        assert current_user.rol in {UserRole.PROFESOR.value, UserRole.ADMIN.value}
        return SimpleNamespace(id=materia_id)

    async def read(*_args, **_kwargs):
        return expected

    async def write(*_args, **_kwargs):
        return expected

    monkeypatch.setattr(asistencia_router.materias_service, "ensure_can_manage_materia", allow)
    monkeypatch.setattr(asistencia_router.service, "get_attendance_day", read)
    monkeypatch.setattr(asistencia_router.service, "save_attendance_day", write)

    for user in (make_user(UserRole.PROFESOR), make_user(UserRole.ADMIN)):
        client = authenticated_client(user)
        get_response = client.get(f"/api/materias/{materia_id}/asistencia?fecha=2026-08-14")
        put_response = client.put(
            f"/api/materias/{materia_id}/asistencia",
            json={"fecha": "2026-08-14", "registros": []},
        )
        assert get_response.status_code == 200, get_response.text
        assert put_response.status_code == 200, put_response.text
        assert get_response.json()["materia_id"] == str(materia_id)


def test_dba_combined_denies_before_listing_and_preserves_success(monkeypatch) -> None:
    materia_id = uuid4()
    outsider = make_user(UserRole.PROFESOR)
    listed: list[str] = []

    async def deny(*_args, **_kwargs):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    async def list_rows(*_args, **_kwargs):
        listed.append("listed")
        return []

    monkeypatch.setattr(dba_router.materias_service, "ensure_can_read_materia", deny)
    monkeypatch.setattr(dba_router.service, "list_combined_dba", list_rows)
    with pytest.raises(HTTPException) as error:
        asyncio.run(
            dba_router.list_materia_dba_combined(
                materia_id,
                current_user=outsider,
                db=object(),
            )
        )
    assert error.value.status_code == 403
    assert listed == []

    async def allow(_db, _materia_id, _current_user):
        return SimpleNamespace(id=materia_id)

    monkeypatch.setattr(dba_router.materias_service, "ensure_can_read_materia", allow)
    for user in (
        make_user(UserRole.PROFESOR),
        make_user(UserRole.ESTUDIANTE),
        make_user(UserRole.ADMIN),
    ):
        response = authenticated_client(user).get(f"/api/materias/{materia_id}/dba")
        assert response.status_code == 200, response.text
        assert response.json() == []


class _RowsResult:
    def __init__(self, rows: list[object]) -> None:
        self._rows = rows

    def fetchall(self) -> list[object]:
        return self._rows

    def fetchone(self):
        return self._rows[0] if self._rows else None


class _ExecuteDB:
    def __init__(self, rows: list[object] | None = None) -> None:
        self.rows = rows or []
        self.statements: list[str] = []

    async def execute(self, statement, _params=None):
        self.statements.append(str(statement))
        return _RowsResult(self.rows)


def test_resource_list_denies_foreign_teacher_before_query(monkeypatch) -> None:
    outsider = make_user(UserRole.PROFESOR)
    db = _ExecuteDB()

    async def deny(*_args, **_kwargs):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    monkeypatch.setattr(herramientas_service.materias_service, "ensure_can_manage_materia", deny)
    with pytest.raises(HTTPException) as error:
        asyncio.run(
            herramientas_service.list_materials_for_materia(db, uuid4(), outsider)
        )

    assert error.value.status_code == 403
    assert db.statements == []


def test_resource_list_allows_owner_admin_and_filters_student_publication(monkeypatch) -> None:
    materia_id = uuid4()

    async def allow(*_args, **_kwargs):
        return SimpleNamespace(id=materia_id)

    monkeypatch.setattr(herramientas_service.materias_service, "ensure_can_manage_materia", allow)
    monkeypatch.setattr(herramientas_service.materias_service, "ensure_can_read_materia", allow)

    for user in (make_user(UserRole.PROFESOR), make_user(UserRole.ADMIN)):
        db = _ExecuteDB()
        assert asyncio.run(herramientas_service.list_materials_for_materia(db, materia_id, user)) == []
        assert "publicado_estudiantes = true" not in db.statements[0]

    student_db = _ExecuteDB()
    student = make_user(UserRole.ESTUDIANTE)
    assert asyncio.run(
        herramientas_service.list_materials_for_materia(student_db, materia_id, student)
    ) == []
    assert "publicado_estudiantes = true" in student_db.statements[0]


def test_individual_resource_preserves_author_scope_for_admin(monkeypatch) -> None:
    admin = make_user(UserRole.ADMIN)
    material_id = uuid4()
    captured: dict[str, object] = {}

    async def get_material(_db, requested_id, professor_id):
        captured.update(requested_id=requested_id, professor_id=professor_id)
        return {"id": requested_id, "contenido_json": {}}

    monkeypatch.setattr(herramientas_service, "get_material", get_material)
    result = asyncio.run(
        herramientas_service.get_material_for_user(object(), material_id, admin)
    )

    assert result is not None
    assert captured == {"requested_id": material_id, "professor_id": admin.id}


def test_student_activity_resource_is_enrolled_visible_and_sanitized(monkeypatch) -> None:
    student = make_user(UserRole.ESTUDIANTE)
    materia_id = uuid4()
    now = datetime(2026, 8, 14)
    row = SimpleNamespace(
        id=uuid4(),
        tipo="taller",
        titulo="Actividad publicada",
        materia_id=materia_id,
        materia_nombre="Matemáticas",
        contenido_json={
            "preguntas": [
                {"enunciado": "¿Cuánto es 3 × 9?", "respuesta_correcta": "27"}
            ]
        },
        archivo_url=None,
        created_at=now,
        updated_at=now,
        asignacion_tipo="actividad",
        publicado_estudiantes=True,
        fecha_publicacion=now,
        evaluacion_id=uuid4(),
        evaluacion_estado="publicada",
        evaluacion_modalidad="online",
    )
    db = _ExecuteDB([row])

    async def allow(*_args, **_kwargs):
        return SimpleNamespace(id=materia_id)

    monkeypatch.setattr(herramientas_service.materias_service, "ensure_can_read_materia", allow)
    result = asyncio.run(
        herramientas_service.get_material_for_user(db, row.id, student)
    )

    assert result is not None
    question = result["contenido_json"]["preguntas"][0]
    assert question == {"enunciado": "¿Cuánto es 3 × 9?"}
    assert "e.estado IN" in db.statements[0]


def test_student_payload_sanitizer_removes_nested_answer_keys() -> None:
    payload = {
        "preguntas": [
            {
                "enunciado": "Pregunta visible",
                "respuesta_correcta": "secreto",
                "detalle": {"solucion": "secreto", "pista": "visible"},
            }
        ]
    }

    safe = evaluaciones_service.sanitize_student_payload(payload)

    assert safe == {
        "preguntas": [
            {"enunciado": "Pregunta visible", "detalle": {"pista": "visible"}}
        ]
    }


def test_denial_helper_rejects_sensitive_values() -> None:
    response = SimpleNamespace(status_code=403, text='{"detail":"Not enough permissions"}')
    assert_denied(response, forbidden_values=["Actividad publicada", "27"])
