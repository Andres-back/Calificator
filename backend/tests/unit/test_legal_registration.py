from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.auth import service
from app.modules.auth.schemas import RegisterRequest
from app.modules.legal.policy import PRIVACY_VERSION, TERMS_VERSION


def valid_registration(**overrides):
    payload = {
        "nombre": "Persona nueva",
        "email": "persona@example.com",
        "password": "Password123!",
        "acepta_terminos": True,
        "acepta_privacidad": True,
    }
    payload.update(overrides)
    return payload


@pytest.mark.parametrize(
    "missing_or_false",
    [
        {"acepta_terminos": False},
        {"acepta_privacidad": False},
        {"acepta_terminos": None},
        {"acepta_privacidad": None},
    ],
)
def test_registration_requires_both_explicit_acceptances(missing_or_false) -> None:
    with pytest.raises(ValidationError):
        RegisterRequest.model_validate(valid_registration(**missing_or_false))


@pytest.mark.anyio
async def test_registration_stages_versioned_acceptances_in_same_transaction(
    monkeypatch,
) -> None:
    user = SimpleNamespace(id=uuid4(), solicitud_docente_estado=None)
    db = AsyncMock()

    async def create_user(_db, _payload, *, commit=True):
        assert commit is False
        return user

    monkeypatch.setattr(service.user_service, "create_user", create_user)
    await service.register_public_user(
        db,
        RegisterRequest.model_validate(valid_registration()),
    )

    assert db.commit.await_count == 1
    assert db.refresh.await_count == 1
    assert db.execute.await_count == 1
    values = db.execute.await_args.args[1]
    assert len(values) == 2
    assert {(item["document_type"], item["document_version"]) for item in values} == {
        ("terms_of_use", TERMS_VERSION),
        ("privacy_policy", PRIVACY_VERSION),
    }
    assert all(item["user_id"] == user.id for item in values)


def test_legal_acceptance_migration_is_additive_and_does_not_backfill() -> None:
    migration = (
        Path(__file__).resolve().parents[2]
        / "alembic"
        / "versions"
        / "202609240001_legal_acceptances.py"
    ).read_text(encoding="utf-8")
    assert 'down_revision: Union[str, None] = "202609220001"' in migration
    assert 'op.create_table(\n        "legal_acceptances"' in migration
    assert "UPDATE users" not in migration.upper()
    assert "op.add_column(\"users\"" not in migration
