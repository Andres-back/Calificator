from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.main import app
from app.modules.admin_ai_config.router import get_teacher_ai_config
from app.modules.admin_ai_config.schemas import TeacherAIConfigRead
from app.shared.enums import UserRole


def test_openapi_exposes_global_and_owner_scoped_contracts():
    paths = app.openapi()["paths"]
    assert "/api/admin/ai-settings" in paths
    assert "/api/admin/ai-features" in paths
    assert "/api/profesor/ai-config" in paths
    assert "/api/profesor/ai-credentials/{provider}" in paths
    assert "/api/profesor/ai-providers/{provider}/test" in paths


def test_teacher_config_schema_cannot_serialize_credentials():
    fields = TeacherAIConfigRead.model_fields
    assert "api_key" not in fields
    assert "secret" not in fields
    credential_fields = fields["credentials"].annotation.__args__[0].model_fields
    assert set(credential_fields).isdisjoint({"api_key", "secret", "secret_encrypted"})


@pytest.mark.asyncio
@pytest.mark.parametrize("role", [UserRole.ESTUDIANTE, UserRole.ADMIN])
async def test_non_teacher_roles_are_rejected_before_database_access(role):
    with pytest.raises(HTTPException) as exc:
        await get_teacher_ai_config(
            current_user=SimpleNamespace(id=uuid4(), rol=role, role=role),
            db=None,
        )
    assert exc.value.status_code == 403