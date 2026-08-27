from types import SimpleNamespace
from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.auth import service as auth_service
from app.modules.auth.schemas import RegisterRequest
from app.modules.users import service
from app.modules.users.schemas import (
    SolicitudDocenteDecisionRequest,
    UserRead,
    UserSelfRead,
    UserUpdate,
)
from app.shared.enums import SolicitudDocenteEstado, UserEstado, UserRole


class FakeDB:
    def __init__(self, admins=None):
        self.admins = admins or []
        self.commits = 0

    async def scalars(self, _statement):
        return self.admins

    async def commit(self):
        self.commits += 1

    async def refresh(self, _value):
        return None

    async def rollback(self):
        return None


def user(role=UserRole.ESTUDIANTE, *, state=UserEstado.ACTIVO):
    return SimpleNamespace(
        id=uuid4(),
        nombre="Persona",
        email=f"{uuid4().hex}@example.test",
        password_hash="hash",
        rol=role.value,
        estado=state.value,
    )


@pytest.mark.anyio
async def test_public_registration_never_assigns_teacher_before_approval(monkeypatch):
    created = user()
    captured = {}

    async def create(_db, payload, *, commit=True):
        captured["payload"] = payload
        captured["commit"] = commit
        return created

    monkeypatch.setattr(auth_service.user_service, "create_user", create)
    db = FakeDB()
    result = await auth_service.register_public_user(
        db,
        RegisterRequest(
            nombre="Ana Docente",
            email="ana@example.com",
            password="Password123!",
            solicitar_docente=True,
        ),
    )

    assert captured["payload"].rol == UserRole.ESTUDIANTE
    assert captured["commit"] is False
    assert result.rol == UserRole.ESTUDIANTE.value
    assert result.solicitud_docente_estado == SolicitudDocenteEstado.PENDIENTE.value
    assert db.commits == 1


@pytest.mark.anyio
async def test_approve_teacher_request_changes_role_atomically(monkeypatch):
    applicant = user()
    applicant.solicitud_docente_estado = SolicitudDocenteEstado.PENDIENTE.value
    admin = user(UserRole.ADMIN)
    db = FakeDB()

    async def get_locked(*_args, **_kwargs):
        return applicant

    async def no_audit(*_args, **_kwargs):
        return None

    monkeypatch.setattr(service, "get_user_or_404", get_locked)
    monkeypatch.setattr(service, "audit", no_audit)

    result = await service.resolve_teacher_request(
        db,
        applicant.id,
        SolicitudDocenteDecisionRequest(decision="aprobar", motivo="Validado"),
        admin,
    )

    assert result.rol == UserRole.PROFESOR.value
    assert result.solicitud_docente_estado == SolicitudDocenteEstado.APROBADA.value
    assert result.solicitud_docente_revisada_por == admin.id
    assert result.solicitud_docente_motivo == "Validado"
    assert db.commits == 1


@pytest.mark.anyio
async def test_reject_teacher_request_keeps_student(monkeypatch):
    applicant = user()
    applicant.solicitud_docente_estado = SolicitudDocenteEstado.PENDIENTE.value
    admin = user(UserRole.ADMIN)
    db = FakeDB()

    async def get_locked(*_args, **_kwargs):
        return applicant

    async def no_audit(*_args, **_kwargs):
        return None

    monkeypatch.setattr(service, "get_user_or_404", get_locked)
    monkeypatch.setattr(service, "audit", no_audit)
    await service.resolve_teacher_request(
        db,
        applicant.id,
        SolicitudDocenteDecisionRequest(decision="rechazar"),
        admin,
    )
    assert applicant.rol == UserRole.ESTUDIANTE.value
    assert applicant.solicitud_docente_estado == SolicitudDocenteEstado.RECHAZADA.value


@pytest.mark.anyio
async def test_same_decision_is_idempotent_and_opposite_conflicts(monkeypatch):
    applicant = user(UserRole.PROFESOR)
    applicant.solicitud_docente_estado = SolicitudDocenteEstado.APROBADA.value
    admin = user(UserRole.ADMIN)
    db = FakeDB()

    async def get_locked(*_args, **_kwargs):
        return applicant

    monkeypatch.setattr(service, "get_user_or_404", get_locked)
    same = await service.resolve_teacher_request(
        db, applicant.id, SolicitudDocenteDecisionRequest(decision="aprobar"), admin
    )
    assert same is applicant
    assert db.commits == 0

    with pytest.raises(HTTPException) as error:
        await service.resolve_teacher_request(
            db,
            applicant.id,
            SolicitudDocenteDecisionRequest(decision="rechazar"),
            admin,
        )
    assert error.value.status_code == 409


@pytest.mark.anyio
async def test_last_active_admin_cannot_be_demoted_or_disabled():
    admin = user(UserRole.ADMIN)
    db = FakeDB([admin])

    with pytest.raises(HTTPException) as demote:
        await service.update_user(
            db, admin, UserUpdate(rol=UserRole.ESTUDIANTE), actor=admin
        )
    assert demote.value.status_code == 409

    with pytest.raises(HTTPException) as disable:
        await service.update_user(
            db, admin, UserUpdate(estado=UserEstado.INACTIVO), actor=admin
        )
    assert disable.value.status_code == 409
    assert db.commits == 0


@pytest.mark.anyio
async def test_inactive_user_cannot_authenticate(monkeypatch):
    inactive = user(state=UserEstado.INACTIVO)

    async def find(*_args, **_kwargs):
        return inactive

    monkeypatch.setattr(auth_service.user_service, "get_user_by_email", find)
    monkeypatch.setattr(auth_service, "verify_password", lambda *_args: True)
    assert (
        await auth_service.authenticate_user(
            AsyncMock(), inactive.email, "Password123!"
        )
        is None
    )


def test_teacher_request_migration_is_additive():
    from pathlib import Path

    path = (
        Path(__file__).resolve().parents[2]
        / "alembic"
        / "versions"
        / "202608260002_teacher_role_requests.py"
    )
    source = path.read_text(encoding="utf-8")
    assert 'down_revision: Union[str, None] = "202608260001"' in source
    assert source.count("op.add_column(") == 5
    assert "op.drop_column" in source


def test_teacher_request_reason_is_only_exposed_in_self_contract() -> None:
    applicant = SimpleNamespace(
        id=uuid4(),
        nombre="Docente Aspirante",
        email="aspirante@example.com",
        rol=UserRole.ESTUDIANTE.value,
        estado=UserEstado.ACTIVO.value,
        solicitud_docente_estado=SolicitudDocenteEstado.RECHAZADA.value,
        solicitud_docente_solicitada_at=datetime(2026, 8, 24),
        solicitud_docente_resuelta_at=datetime(2026, 8, 24),
        solicitud_docente_motivo="Validación incompleta",
        created_at=datetime(2026, 8, 24),
        updated_at=datetime(2026, 8, 24),
    )

    public_payload = UserRead.model_validate(applicant).model_dump()
    self_payload = UserSelfRead.model_validate(applicant).model_dump()

    assert "solicitud_docente_motivo" not in public_payload
    assert self_payload["solicitud_docente_motivo"] == "Validación incompleta"
    assert self_payload["solicitud_docente_estado"] == SolicitudDocenteEstado.RECHAZADA
