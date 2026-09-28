from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.criterios_aprendizaje import application_service


def _result(row):
    result = MagicMock()
    result.mappings.return_value.first.return_value = row
    return result


def test_resource_application_requires_same_materia(monkeypatch) -> None:
    resource_materia, requested_materia = uuid4(), uuid4()
    db = AsyncMock()
    db.execute.return_value = _result(
        {"id": uuid4(), "materia_id": resource_materia, "profesor_id": uuid4()}
    )

    with pytest.raises(HTTPException) as caught:
        asyncio.run(
            application_service.apply_version_to_resource(
                db,
                resource_id=uuid4(),
                materia_id=requested_materia,
                version_id=uuid4(),
                actor_id=uuid4(),
            )
        )

    assert caught.value.status_code == 409


def test_resource_application_keeps_legacy_rubric_adapter(monkeypatch) -> None:
    materia_id, actor_id, version_id, set_id = uuid4(), uuid4(), uuid4(), uuid4()
    db = AsyncMock()
    db.execute.side_effect = [
        _result({"id": uuid4(), "materia_id": materia_id, "profesor_id": actor_id}),
        MagicMock(),
    ]
    snapshot = {
        "version_id": str(version_id),
        "set_id": str(set_id),
        "criterios": [
            {
                "stable_key": "ortografia",
                "nombre": "Ortografía",
                "descripcion": "Aplica reglas ortográficas.",
                "evidencia_esperada": "Texto sin errores recurrentes.",
                "peso_porcentaje": 100,
                "niveles": [],
                "official_standard_refs": [],
            }
        ],
    }
    monkeypatch.setattr(
        application_service,
        "_approved_snapshot",
        AsyncMock(
            return_value=(SimpleNamespace(id=version_id), SimpleNamespace(id=set_id), snapshot)
        ),
    )
    monkeypatch.setattr(
        application_service,
        "_persist_application",
        AsyncMock(return_value=SimpleNamespace(id=uuid4())),
    )

    asyncio.run(
        application_service.apply_version_to_resource(
            db,
            resource_id=uuid4(),
            materia_id=materia_id,
            version_id=version_id,
            actor_id=actor_id,
        )
    )

    update_params = db.execute.await_args_list[1].args[1]
    assert '"usar_rubrica": true' in update_params["compatibility"]
    assert "Ortografía" in update_params["compatibility"]
