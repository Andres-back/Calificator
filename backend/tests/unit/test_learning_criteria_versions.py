from __future__ import annotations

import asyncio
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.db.base import import_models
from app.modules.criterios_aprendizaje import service
from app.modules.criterios_aprendizaje.schemas import LearningCriteriaVersionUpdate


import_models()


def _actor():
    return SimpleNamespace(id=uuid4(), rol="profesor")


def _criterion(*, weight: str = "100.00"):
    return SimpleNamespace(
        id=uuid4(),
        stable_key="comprension",
        orden=1,
        nombre="Comprensión",
        descripcion="Interpreta información del material.",
        evidencia_esperada="Explicación basada en la evidencia.",
        peso_porcentaje=Decimal(weight),
        puntaje_maximo=Decimal("5.00"),
        niveles_json=[{"nombre": "Logrado", "descripcion": "Explica con precisión."}],
        source_refs_json=[],
        official_standard_refs_json=[],
    )


def _db() -> MagicMock:
    db = MagicMock()
    db.scalar = AsyncMock()
    db.scalars = AsyncMock()
    db.get = AsyncMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    return db


def test_approved_version_is_immutable(monkeypatch: pytest.MonkeyPatch) -> None:
    version = SimpleNamespace(id=uuid4(), estado="aprobada", revision=4)
    criterion_set = SimpleNamespace(id=uuid4())
    monkeypatch.setattr(
        service.authorization,
        "get_version_for_management",
        AsyncMock(return_value=(version, criterion_set)),
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(service.update_version(
            _db(),
            version_id=version.id,
            payload=LearningCriteriaVersionUpdate(revision_esperada=4, titulo="Nuevo título"),
            actor=_actor(),
        ))

    assert error.value.status_code == 409


def test_stale_revision_returns_conflict_without_writing(monkeypatch: pytest.MonkeyPatch) -> None:
    version = SimpleNamespace(id=uuid4(), estado="borrador", revision=5)
    criterion_set = SimpleNamespace(id=uuid4())
    db = _db()
    monkeypatch.setattr(
        service.authorization,
        "get_version_for_management",
        AsyncMock(return_value=(version, criterion_set)),
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(service.update_version(
            db,
            version_id=version.id,
            payload=LearningCriteriaVersionUpdate(revision_esperada=4, titulo="Cambio vencido"),
            actor=_actor(),
        ))

    assert error.value.status_code == 409
    db.commit.assert_not_awaited()


def test_invalid_weights_and_unacknowledged_coverage_block_approval(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    version = SimpleNamespace(
        id=uuid4(), estado="borrador", revision=2,
        coverage_json={"bloqueos": ["Falta evidencia para un criterio"]},
    )
    criterion_set = SimpleNamespace(id=uuid4(), current_version_id=None)
    db = _db()
    monkeypatch.setattr(
        service.authorization,
        "get_version_for_management",
        AsyncMock(return_value=(version, criterion_set)),
    )

    db.scalars.side_effect = [[_criterion(weight="90.00")], []]
    with pytest.raises(HTTPException) as weight_error:
        asyncio.run(service.approve_version(
            db, version_id=version.id, revision_expected=2,
            acknowledge_warnings=False, actor=_actor(),
        ))
    assert weight_error.value.status_code == 422
    assert "100" in str(weight_error.value.detail)

    db.scalars.side_effect = [[_criterion()], []]
    with pytest.raises(HTTPException) as coverage_error:
        asyncio.run(service.approve_version(
            db, version_id=version.id, revision_expected=2,
            acknowledge_warnings=False, actor=_actor(),
        ))
    assert coverage_error.value.status_code == 422
    assert "cobertura" in str(coverage_error.value.detail).lower()


def test_valid_approval_freezes_current_version(monkeypatch: pytest.MonkeyPatch) -> None:
    actor = _actor()
    version = SimpleNamespace(
        id=uuid4(), estado="borrador", revision=2,
        version_number=1, coverage_json={}, approved_by=None, approved_at=None,
    )
    criterion_set = SimpleNamespace(id=uuid4(), current_version_id=None)
    db = _db()
    db.scalars.side_effect = [[_criterion()], []]
    monkeypatch.setattr(
        service.authorization,
        "get_version_for_management",
        AsyncMock(return_value=(version, criterion_set)),
    )
    audit = AsyncMock()
    monkeypatch.setattr(service, "audit_criteria_event", audit)

    result = asyncio.run(service.approve_version(
        db, version_id=version.id, revision_expected=2,
        acknowledge_warnings=False, actor=actor,
    ))

    assert result is criterion_set
    assert version.estado == "aprobada"
    assert version.revision == 3
    assert version.approved_by == actor.id
    assert version.approved_at is not None
    assert criterion_set.current_version_id == version.id
    db.commit.assert_awaited_once()
    audit.assert_awaited_once()


def test_cloning_creates_a_new_draft_without_mutating_approved_source(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    actor = _actor()
    set_id = uuid4()
    source_id = uuid4()
    criterion_set = SimpleNamespace(id=set_id, current_version_id=source_id)
    source = SimpleNamespace(
        id=source_id,
        set_id=set_id,
        version_number=1,
        estado="aprobada",
        teacher_intent_json={"que_evaluar": "Comprensión"},
        coverage_json={"resumen": "Completa"},
    )
    source_criterion = _criterion()
    source_criterion.version_id = source_id
    db = _db()
    db.scalar.side_effect = [None, 1]
    db.get.return_value = source
    db.scalars.side_effect = [[source_criterion], []]
    async def assign_cloned_id() -> None:
        cloned = db.add.call_args.args[0]
        if cloned.id is None:
            cloned.id = uuid4()
    db.flush.side_effect = assign_cloned_id
    monkeypatch.setattr(
        service.authorization,
        "get_set_for_management",
        AsyncMock(return_value=criterion_set),
    )
    monkeypatch.setattr(service, "audit_criteria_event", AsyncMock())

    result = asyncio.run(service.clone_version(
        db, set_id=set_id, source_version_id=None, actor=actor,
    ))

    assert result is criterion_set
    assert source.estado == "aprobada"
    assert source.version_number == 1
    added = [call.args[0] for call in db.add.call_args_list]
    cloned_version = added[0]
    cloned_criterion = added[1]
    assert cloned_version.estado == "borrador"
    assert cloned_version.version_number == 2
    assert cloned_criterion.stable_key == source_criterion.stable_key
    assert cloned_criterion.version_id == cloned_version.id
    db.commit.assert_awaited_once()
