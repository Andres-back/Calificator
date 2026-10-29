from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
import pytest

from app.modules.calificaciones import agents
from app.modules.importacion_estudiantes import vision_service as vision
from app.modules.importacion_estudiantes.service import normalize_name
from app.modules.importacion_estudiantes.vision_service import normalize_candidates


def test_roster_candidates_keep_names_and_flag_low_confidence() -> None:
    result = normalize_candidates({"estudiantes": [
        {"nombre": "  María   José Pérez  ", "confianza": 0.96, "requiere_revision": False},
        {"nombre": "Andr?", "confianza": 0.42, "requiere_revision": False, "advertencias": ["letra dudosa"]},
        {"nombre": "---", "confianza": 1},
    ]})
    assert result[0]["nombre"] == "María José Pérez"
    assert result[0]["requiere_revision"] is False
    assert result[1]["requiere_revision"] is True
    assert result[1]["advertencias"] == ["letra dudosa"]
    assert len(result) == 2


def test_name_normalization_is_only_for_warning_not_identity_merge() -> None:
    assert normalize_name("Ángela  Muñoz") == "angela munoz"


@pytest.fixture
def roster_transport(monkeypatch):
    monkeypatch.setattr(vision, "prepare_orientation_variants", lambda *_: [
        SimpleNamespace(data=b"synthetic", mime="image/png"),
        SimpleNamespace(data=b"rotated", mime="image/png"),
    ])
    monkeypatch.setattr(agents, "_prepare_multimodal_images", lambda data, mime: [(data, mime, 1)])
    monkeypatch.setattr(agents.OpenCodeClient, "_log_call", AsyncMock())
    monkeypatch.setattr(vision, "get_effective_ai_credentials", AsyncMock(return_value=SimpleNamespace(open_code_key="legacy-test")))
    transport = AsyncMock(return_value={"choices": [{"message": {"content": '{"estudiantes":[{"nombre":"Persona Ficticia","confianza":0.99}]}'}}]})
    monkeypatch.setattr(agents, "call_configured_api", transport)
    return transport


def selection(model="glm-5.3-flash", revision="revision-a"):
    return {"provider": "open_code", "model": model, "capabilities": ["vision", "text"],
            "credential_source": "institutional", "runtime_profile": {"protocol": "chat_completions"},
            "connection": {"id": "open_code", "base_url": "https://api.example.test/v1", "credential_revision": revision, "max_retries": 0}}


@pytest.mark.asyncio
async def test_roster_uses_captured_profile_and_destination_bound_credential(monkeypatch, roster_transport):
    resolver = AsyncMock(return_value="profile-test-key")
    monkeypatch.setattr(vision, "resolve_api_credential", resolver, raising=False)
    route = selection()
    result = await vision.extract_student_names(image_bytes=b"photo", mime="image/png", teacher_id=uuid4(), ai_config={"primary": route}, db=object())
    assert result[0]["nombre"] == "Persona Ficticia"
    assert roster_transport.await_args.args[:2] == (route, "profile-test-key")
    resolver.assert_awaited_once()


@pytest.mark.asyncio
async def test_roster_binds_both_profiles_without_crossing_credentials(monkeypatch, roster_transport):
    primary, fallback = selection(), selection("backup-visual", "revision-b")
    monkeypatch.setattr(vision, "resolve_api_credential", AsyncMock(side_effect=["key-a", "key-b"]), raising=False)
    roster_transport.side_effect = [httpx.HTTPStatusError("private provider body", request=httpx.Request("POST", "https://api.example.test"), response=httpx.Response(410)), roster_transport.return_value]
    result = await vision.extract_student_names(image_bytes=b"photo", mime="image/png", teacher_id=uuid4(), ai_config={"primary": primary, "fallback": fallback}, db=object())
    assert result
    assert [call.args[1] for call in roster_transport.await_args_list] == ["key-a", "key-b"]
    assert [call.args[0]["model"] for call in roster_transport.await_args_list] == [primary["model"], fallback["model"]]


@pytest.mark.asyncio
async def test_roster_without_selection_never_uses_retired_default(roster_transport):
    with pytest.raises(vision.RosterExtractionError) as failure:
        await vision.extract_student_names(image_bytes=b"photo", mime="image/png", teacher_id=uuid4(), ai_config={}, db=object())
    assert failure.value.code == "service_unavailable"
    roster_transport.assert_not_awaited()


@pytest.mark.asyncio
async def test_roster_permanent_provider_failure_does_not_rotate_and_retry(monkeypatch, roster_transport):
    monkeypatch.setattr(vision, "resolve_api_credential", AsyncMock(return_value="key-a"), raising=False)
    roster_transport.side_effect = httpx.HTTPStatusError("private provider body", request=httpx.Request("POST", "https://api.example.test"), response=httpx.Response(410))
    with pytest.raises(vision.RosterExtractionError) as failure:
        await vision.extract_student_names(image_bytes=b"photo", mime="image/png", teacher_id=uuid4(), ai_config={"primary": selection()}, db=object())
    assert failure.value.code == "service_unavailable"
    assert "private" not in str(failure.value)
    roster_transport.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize(("content", "code"), [('{"estudiantes":[]}', "no_names"), ('not json', "invalid_response"), ('{}', "invalid_response")])
async def test_roster_classifies_empty_and_invalid_responses(monkeypatch, roster_transport, content, code):
    monkeypatch.setattr(vision, "resolve_api_credential", AsyncMock(return_value="key-a"), raising=False)
    roster_transport.return_value = {"choices": [{"message": {"content": content}}]}
    with pytest.raises(vision.RosterExtractionError) as failure:
        await vision.extract_student_names(image_bytes=b"photo", mime="image/png", teacher_id=uuid4(), ai_config={"primary": selection()}, db=object())
    assert failure.value.code == code
    assert roster_transport.await_count == 2


def test_roster_worker_error_projection_is_closed_and_contains_no_provider_content():
    from app.workers import tasks_roster_import
    result = tasks_roster_import.roster_error_result(RuntimeError("private names, key, provider output"))
    assert result["codigo"] == "service_unavailable"
    assert "private" not in str(result)
    assert "buena luz" not in str(result)
    assert vision.roster_error_result(vision.RosterExtractionError("no_names"))["codigo"] == "no_names"


@pytest.mark.asyncio
async def test_roster_missing_profile_secret_never_reuses_legacy_key(monkeypatch, roster_transport):
    monkeypatch.setattr(vision, "resolve_api_credential", AsyncMock(return_value=""))
    with pytest.raises(vision.RosterExtractionError):
        await vision.extract_student_names(image_bytes=b"photo", mime="image/png", teacher_id=uuid4(), ai_config={"primary": selection()}, db=object())
    roster_transport.assert_not_awaited()


@pytest.mark.asyncio
async def test_roster_profile_teacher_secret_cannot_be_overwritten_by_institutional_fallback(monkeypatch, roster_transport):
    primary, fallback = selection(), selection("backup-visual")
    primary["credential_source"] = "teacher"
    monkeypatch.setattr(vision, "get_teacher_ai_credential", AsyncMock(return_value="teacher-only"))
    monkeypatch.setattr(vision, "resolve_api_credential", AsyncMock(return_value="institution-only"))
    with pytest.raises(vision.RosterExtractionError):
        await vision.extract_student_names(image_bytes=b"photo", mime="image/png", teacher_id=uuid4(), ai_config={"primary": primary, "fallback": fallback}, db=object())
    roster_transport.assert_not_awaited()
