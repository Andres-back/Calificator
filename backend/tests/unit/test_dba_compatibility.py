from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import ANY, AsyncMock
from uuid import uuid4

import pytest
from authorization_helpers import make_user
from fastapi import HTTPException

from app.modules.criterios_aprendizaje.compatibility import to_legacy_criteria
from app.modules.dba import router as dba_router
from app.modules.dba.models import DBACatalog, DBAPersonalizado
from app.modules.dba.schemas import DBAPersonalizadoCreate
from app.shared.enums import UserRole


def test_legacy_dba_tables_remain_separate_and_addressable() -> None:
    assert DBACatalog.__table__.name == "dba_catalog"
    assert DBAPersonalizado.__table__.name == "dba_personalizados"
    assert "descripcion" in DBACatalog.__table__.columns
    assert "materia_id" in DBAPersonalizado.__table__.columns
    assert "profesor_id" in DBAPersonalizado.__table__.columns
    assert DBAPersonalizado.__table__.columns["activo"].nullable is False


def test_list_custom_dba_preserves_subject_scope(monkeypatch) -> None:
    materia_id = uuid4()
    teacher = make_user(UserRole.PROFESOR)
    authorize = AsyncMock(return_value=SimpleNamespace(id=materia_id))
    list_rows = AsyncMock(return_value=[])
    monkeypatch.setattr(
        dba_router.materias_service, "ensure_can_read_materia", authorize
    )
    monkeypatch.setattr(
        dba_router.service, "list_dba_personalizados_by_materia", list_rows
    )

    result = asyncio.run(
        dba_router.list_dba_personalizados(
            materia_id, current_user=teacher, db=object()
        )
    )

    assert result == []
    authorize.assert_awaited_once_with(ANY, materia_id, teacher)
    list_rows.assert_awaited_once_with(ANY, materia_id)


def test_create_custom_dba_uses_the_subject_owner(monkeypatch) -> None:
    materia_id = uuid4()
    owner_id = uuid4()
    admin = make_user(UserRole.ADMIN)
    materia = SimpleNamespace(
        id=materia_id,
        profesor_id=owner_id,
        area="Lenguaje",
        grado="3",
    )
    payload = DBAPersonalizadoCreate(
        enunciado="Comprende la idea principal de un cuento breve."
    )
    monkeypatch.setattr(
        dba_router.materias_service,
        "ensure_can_manage_materia",
        AsyncMock(return_value=materia),
    )
    create = AsyncMock(return_value=SimpleNamespace(id=uuid4()))
    monkeypatch.setattr(dba_router.service, "create_dba_personalizado", create)

    asyncio.run(
        dba_router.create_dba_personalizado(
            materia_id, payload, current_user=admin, db=object()
        )
    )

    assert create.await_args.kwargs == {
        "profesor_id": owner_id,
        "materia_id": materia_id,
        "area": "Lenguaje",
        "grado": "3",
        "payload": payload,
    }


def test_document_upload_rejects_unsupported_type_before_persisting(monkeypatch) -> None:
    materia_id = uuid4()
    teacher = make_user(UserRole.PROFESOR)
    db = SimpleNamespace(add=pytest.fail)
    monkeypatch.setattr(
        dba_router.materias_service,
        "ensure_can_manage_materia",
        AsyncMock(
            return_value=SimpleNamespace(
                id=materia_id, area="Lenguaje", grado="3"
            )
        ),
    )
    monkeypatch.setattr(
        dba_router, "read_upload_limited", AsyncMock(return_value=b"texto")
    )
    file = SimpleNamespace(filename="notas.txt", content_type="text/plain")

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            dba_router.upload_document_for_dba(
                materia_id, file, current_user=teacher, db=db
            )
        )

    assert error.value.status_code == 400
    assert "PDF o Word" in error.value.detail


def test_new_criteria_keep_the_legacy_dba_adapter_without_becoming_catalog_rows() -> None:
    official_id = uuid4()
    version_id = uuid4()
    snapshot = {
        "version_id": str(version_id),
        "criterios": [
            {
                "stable_key": "comprension",
                "nombre": "Comprensión",
                "descripcion": "Explica el sentido del texto.",
                "evidencia_esperada": "Respuesta sustentada.",
                "peso_porcentaje": 100,
                "niveles": [],
                "official_standard_refs": [{"id": str(official_id)}],
            }
        ],
    }

    legacy = to_legacy_criteria(snapshot)

    assert legacy[0]["dba_ids"] == [str(official_id)]
    assert legacy[0]["learning_criterion_key"] == "comprension"
    assert legacy[0]["learning_criteria_version_id"] == str(version_id)
    assert "id" not in legacy[0]
