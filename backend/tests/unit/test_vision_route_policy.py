"""Managed reading never consults a third model or crosses credentials."""

from contextlib import asynccontextmanager
import asyncio
import json
import time
from unittest.mock import AsyncMock

import httpx
import pytest

from app.services import vision_extractor as module
from app.services import ai_api_connections, ai_credentials_service
from app.db import session


def selection(model="visual-a", provider="api_a"):
    return {
        "model": model,
        "provider": provider,
        "credential_source": "institutional",
        "runtime_profile": {"protocol": "responses"},
        "capabilities": ["vision"],
        "connection": {
            "id": provider,
            "base_url": "https://example.test/v1",
            "credential_revision": provider + "-revision",
            "timeout_seconds": 120,
            "max_retries": 5,
        },
    }


def response():
    return {
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "content": json.dumps(
                        {
                            "student_detected": True,
                            "document_quality": 0.95,
                            "page_text": "1. B",
                            "answers": [
                                {
                                    "question_number": 1,
                                    "answer": "B",
                                    "confidence": 0.99,
                                    "legible": True,
                                }
                            ],
                        }
                    )
                },
            }
        ],
        "usage": {"prompt_tokens": 100, "completion_tokens": 80},
    }


@pytest.fixture
def transport(monkeypatch):
    @asynccontextmanager
    async def context(*_args, **_kw):
        yield object()

    monkeypatch.setattr(session, "AsyncSessionLocal", context)
    monkeypatch.setattr(module, "provider_capacity", context)
    monkeypatch.setattr(
        ai_credentials_service,
        "resolve_api_credential",
        AsyncMock(side_effect=lambda _db, connection: connection["id"] + "-secret"),
    )
    monkeypatch.setattr(
        module.VisionExtractor, "_keys", AsyncMock(return_value=["legacy-secret"])
    )
    monkeypatch.setattr(module.VisionExtractor, "_event", AsyncMock())
    transport = AsyncMock(return_value=response())
    monkeypatch.setattr(ai_api_connections, "call_configured_api", transport)
    return transport


async def read(snapshot):
    extractor = module.VisionExtractor(
        tracking={"_ai_config": {"feature": "calificacion.extraccion", **snapshot}}
    )
    return await extractor._one(
        (1, b"synthetic", "image/png", False),
        1,
        {"preguntas": [{"numero": 1}]},
        "student_response",
    )


def test_reading_limits_are_typed_and_bounded():
    from app.services.vision_route_policy import VisionRuntimeLimits

    assert VisionRuntimeLimits().model_dump() == {
        "call_timeout_seconds": 60,
        "max_attempts": 2,
        "max_output_tokens": 10000,
    }
    for invalid in (
        {"call_timeout_seconds": 61},
        {"call_timeout_seconds": 4},
        {"max_attempts": 3},
        {"max_attempts": 0},
        {"max_output_tokens": 10001},
        {"max_output_tokens": 1023},
        {"surprise": 1},
        {"max_attempts": True},
    ):
        with pytest.raises(ValueError):
            VisionRuntimeLimits.model_validate(invalid)


@pytest.mark.asyncio
async def test_captured_limits_and_connection_control_the_real_request(transport):
    result = await read(
        {
            "primary": selection(),
            "runtime_limits": {
                "call_timeout_seconds": 12,
                "max_attempts": 2,
                "max_output_tokens": 9216,
            },
        }
    )
    assert result.status == "extracted"
    call = transport.await_args
    assert call.args[1] == "api_a-secret"
    assert call.kwargs["max_tokens"] == 9216
    assert call.kwargs["timeout"] <= 12


@pytest.mark.asyncio
async def test_configured_fallback_gets_its_own_credential_once(transport):
    transport.side_effect = [httpx.ReadTimeout("synthetic"), response()]
    result = await read(
        {
            "primary": selection(),
            "fallback": selection("visual-b", "api_b"),
            "runtime_limits": {
                "call_timeout_seconds": 20,
                "max_attempts": 2,
                "max_output_tokens": 8192,
            },
        }
    )
    assert result.status == "extracted"
    assert [call.args[1] for call in transport.await_args_list] == [
        "api_a-secret",
        "api_b-secret",
    ]
    assert [call.args[0]["model"] for call in transport.await_args_list] == [
        "visual-a",
        "visual-b",
    ]


@pytest.mark.asyncio
async def test_total_budget_one_never_calls_fallback_even_when_provider_allows_retries(
    transport,
):
    transport.side_effect = httpx.ReadTimeout("synthetic")
    result = await read(
        {
            "primary": selection(),
            "fallback": selection("visual-b", "api_b"),
            "runtime_limits": {
                "call_timeout_seconds": 20,
                "max_attempts": 1,
                "max_output_tokens": 8192,
            },
        }
    )
    assert result.status.startswith("failed")
    transport.assert_awaited_once()


@pytest.mark.asyncio
async def test_without_fallback_only_transient_failures_may_repeat(transport):
    transport.side_effect = [httpx.ReadTimeout("synthetic"), response()]
    assert (await read({"primary": selection()})).status == "extracted"
    assert transport.await_count == 2


@pytest.mark.asyncio
async def test_truncated_output_is_not_accepted_as_a_complete_answer(transport):
    incomplete = response()
    incomplete["choices"][0]["finish_reason"] = "length"
    transport.return_value = incomplete
    result = await read({"primary": selection()})
    assert result.error_code == "vision_output_truncated"
    assert result.status.startswith("failed")
    transport.assert_awaited_once()
    event = module.VisionExtractor._event.await_args
    assert event.kwargs["usage"] == incomplete["usage"]


@pytest.mark.asyncio
async def test_unconfigured_legacy_cloud_model_does_not_use_environment_cascade(
    monkeypatch, transport
):
    post = AsyncMock(
        return_value=httpx.Response(
            200, json=response(), request=httpx.Request("POST", "https://example.test")
        )
    )
    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    result = await read({"primary": {"provider": "open_code", "model": "old-visual"}})
    assert result.error_code == "vision_route_not_ready"
    post.assert_not_awaited()
    transport.assert_not_awaited()


@pytest.mark.asyncio
async def test_no_primary_never_promotes_fallback_silently(transport):
    result = await read({"fallback": selection()})
    assert result.error_code == "vision_route_not_ready"
    transport.assert_not_awaited()


@pytest.mark.asyncio
async def test_missing_secret_can_use_explicit_fallback_but_never_legacy_key(
    monkeypatch, transport
):
    keys = AsyncMock(side_effect=["", "backup-secret"])
    monkeypatch.setattr(ai_credentials_service, "resolve_api_credential", keys)
    result = await read(
        {"primary": selection(), "fallback": selection("visual-b", "api_b")}
    )
    assert result.status == "extracted"
    assert result.fallback_used is True
    assert transport.await_args.args[1] == "backup-secret"
    transport.assert_awaited_once()


@pytest.mark.asyncio
async def test_rejected_principal_and_backup_never_call_a_third_model(transport):
    transport.side_effect = httpx.HTTPStatusError(
        "private response must not leak",
        request=httpx.Request("POST", "https://example.test"),
        response=httpx.Response(410),
    )
    result = await read(
        {"primary": selection(), "fallback": selection("visual-b", "api_b")}
    )
    assert result.error_code == "vision_http_410"
    assert transport.await_count == 2
    assert [c.args[0]["model"] for c in transport.await_args_list] == [
        "visual-a",
        "visual-b",
    ]
    assert "private response" not in str(result)


def test_limits_schema_is_scoped_and_diagnostics_are_closed():
    from app.modules.admin_ai_config.schemas import FeatureRouting
    from app.modules.analytics.usage_logger import _safe_error_code

    route = FeatureRouting(
        feature="calificacion.extraccion",
        label="Lectura",
        runtime_limits={"max_attempts": 1},
    )
    assert route.runtime_limits.max_attempts == 1
    with pytest.raises(ValueError):
        FeatureRouting(feature="xali", label="Xali", runtime_limits={"max_attempts": 1})
    for code in [
        "vision_timeout",
        "vision_invalid_schema",
        "vision_output_truncated",
        "vision_auth_missing",
    ]:
        assert _safe_error_code(code) == code
    assert _safe_error_code("vision_http_410") == "http_410"
    assert (
        _safe_error_code("vision_invalid_schema: private child text")
        == "provider_error"
    )


@pytest.mark.asyncio
async def test_inference_deadline_cancels_a_nonresponsive_transport(transport):
    async def stuck(*_args, **_kwargs):
        await asyncio.sleep(8)
        return response()

    transport.side_effect = stuck
    started = time.monotonic()
    result = await read(
        {
            "primary": selection(),
            "runtime_limits": {
                "call_timeout_seconds": 5,
                "max_attempts": 1,
                "max_output_tokens": 10000,
            },
        }
    )
    assert result.error_code == "vision_timeout"
    assert time.monotonic() - started < 7
    assert not result.fallback_used
    transport.assert_awaited_once()


@pytest.mark.asyncio
async def test_one_failed_page_prevents_accepting_partial_reading(
    monkeypatch, transport
):
    monkeypatch.setattr(
        module,
        "_pages",
        lambda *_: [
            (1, b"first", "image/png", False),
            (2, b"second", "image/png", False),
        ],
    )
    transport.side_effect = [response(), httpx.ReadTimeout("synthetic")]
    reader = module.VisionExtractor(
        tracking={
            "_ai_config": {
                "feature": "calificacion.extraccion",
                "primary": selection(),
                "runtime_limits": {"max_attempts": 1},
            }
        }
    )
    with pytest.raises(module.VisionExtractionError, match="vision_incomplete_pages"):
        await reader.extract(
            b"synthetic", "application/pdf", blueprint={"preguntas": [{"numero": 1}]}
        )
    assert transport.await_count == 2


@pytest.mark.asyncio
async def test_explicit_native_backup_shares_budget_and_keeps_its_secret(
    monkeypatch, transport
):
    native_calls = []

    class Native:
        def __init__(self, key, **kwargs):
            assert key == "ollama-secret"
            assert kwargs["timeout_seconds"] == 60

        async def chat(self, **kwargs):
            native_calls.append(kwargs)
            return {
                "message": {"content": response()["choices"][0]["message"]["content"]},
                "done_reason": "stop",
            }

    monkeypatch.setattr(module, "OllamaCloudProvider", Native)
    transport.side_effect = httpx.ReadTimeout("synthetic")
    native = {
        "provider": "ollama",
        "model": "native-visual",
        "credential_source": "institutional",
        "connection": {"id": "ollama", "base_url": "https://ollama.com/api"},
    }
    result = await read({"primary": selection(), "fallback": native})
    assert (
        result.status == "extracted"
        and result.provider == "ollama"
        and result.fallback_used
    )
    assert native_calls[0]["options"]["num_predict"] == 10000
    assert len(native_calls) == 1
    transport.assert_awaited_once()


@pytest.mark.asyncio
async def test_capacity_failure_is_not_misreported_as_invalid_photo(
    monkeypatch, transport
):
    @asynccontextmanager
    async def unavailable(**_kwargs):
        raise module.ProviderCapacityUnavailable("private coordinator detail")
        yield

    monkeypatch.setattr(module, "provider_capacity", unavailable)
    result = await read({"primary": selection()})
    assert result.status == "failed_temporary"
    assert result.error_code == "capacity_unavailable"
    assert "private coordinator detail" not in str(result)
    transport.assert_not_awaited()


@pytest.mark.asyncio
async def test_teacher_reader_and_institutional_backup_keep_their_secret_sources(
    monkeypatch, transport
):
    from uuid import uuid4

    teacher_id = uuid4()
    teacher_secret = AsyncMock(return_value="teacher-secret")
    monkeypatch.setattr(
        ai_credentials_service, "get_teacher_ai_credential", teacher_secret
    )
    transport.side_effect = [httpx.ReadTimeout("synthetic"), response()]
    reader = module.VisionExtractor(
        tracking={
            "teacher_id": str(teacher_id),
            "_ai_config": {
                "feature": "calificacion.extraccion",
                "primary": {**selection(), "credential_source": "teacher"},
                "fallback": selection("visual-b", "api_b"),
            },
        }
    )
    result = await reader._one(
        (1, b"synthetic", "image/png", False),
        1,
        {"preguntas": [{"numero": 1}]},
        "student_response",
    )
    assert result.status == "extracted"
    assert teacher_secret.await_args.kwargs == {
        "teacher_id": teacher_id,
        "provider_id": "api_a",
    }
    assert [c.args[1] for c in transport.await_args_list] == [
        "teacher-secret",
        "api_b-secret",
    ]


@pytest.mark.asyncio
@pytest.mark.parametrize('invalid', [False, 0, [], ''])
async def test_invalid_captured_limits_are_not_treated_as_absent(invalid, transport):
    result = await read({'primary':selection(), 'runtime_limits':invalid})
    assert result.error_code == 'vision_limits_invalid'
    transport.assert_not_awaited()
