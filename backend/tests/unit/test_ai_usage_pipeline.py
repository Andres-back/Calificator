from __future__ import annotations

import asyncio

import httpx

from app.modules.analytics import usage_logger
from app.modules.calificaciones import agents


def test_error_codes_never_keep_provider_or_student_text() -> None:
    assert usage_logger._safe_error_code("La respuesta del estudiante fue secreta") == "provider_error"
    assert usage_logger._safe_error_code("request timed out with respuesta 27") == "provider_timeout"
    assert usage_logger._safe_error_code("HTTP 429: demasiadas solicitudes") == "rate_limited"


def test_unknown_stages_are_collapsed_without_leaking_labels() -> None:
    assert usage_logger._safe_stage("grading_primary") == "grading_primary"
    assert usage_logger._safe_stage("respuesta-estudiante-27") == "other"


def test_each_external_attempt_has_one_canonical_private_event(monkeypatch) -> None:
    request = httpx.Request("POST", "https://example.test/chat/completions")
    responses = [
        httpx.Response(503, request=request),
        httpx.Response(
            200,
            request=request,
            json={
                "choices": [{"message": {"content": '{"nota_sugerida": 4.0}'}}],
                "usage": {"prompt_tokens": 10, "completion_tokens": 4},
            },
        ),
    ]
    events: list[dict] = []

    class FakeHTTPClient:
        async def post(self, *_args, **_kwargs):
            return responses.pop(0)

        async def aclose(self):
            return None

    async def capture_usage(**kwargs):
        events.append(kwargs)
        return "request-id"

    async def no_sleep(_delay):
        return None

    monkeypatch.setattr(agents, "log_ai_usage", capture_usage)
    monkeypatch.setattr(agents.asyncio, "sleep", no_sleep)
    client = agents.OpenCodeClient()
    client._client = FakeHTTPClient()

    result = asyncio.run(
        client.chat(
            "deepseek-v4-flash",
            [{"role": "user", "content": "contenido privado que no debe registrarse"}],
            max_attempts=2,
            stage="grading_secondary",
        )
    )

    assert result["choices"][0]["message"]["content"]
    assert [(event["attempt_number"], event["status"]) for event in events] == [
        (1, "retry"),
        (2, "success"),
    ]
    assert {event["stage"] for event in events} == {"grading_secondary"}
    assert all("messages" not in event and "prompt" not in event for event in events)
    assert events[0]["error_code"] == "http_503"
    assert events[1]["image_count"] == 0


def test_personal_fallback_records_only_sanitized_route_metadata(monkeypatch) -> None:
    request = httpx.Request("POST", "https://example.test/chat/completions")
    responses = [
        httpx.Response(503, request=request),
        httpx.Response(200, request=request, json={
            "choices": [{"message": {"content": "{}"}}], "usage": {},
        }),
    ]
    events: list[dict] = []

    class FakeHTTPClient:
        async def post(self, *_args, **_kwargs):
            return responses.pop(0)

        async def aclose(self):
            return None

    async def capture_usage(**kwargs):
        events.append(kwargs)
        return "request-id"

    monkeypatch.setattr(agents, "log_ai_usage", capture_usage)
    client = agents.OpenCodeClient(tracking={"_ai_config": {
        "primary": {"credential_source": "teacher"},
        "config_hash": "safe-hash",
        "teacher_config_version": 7,
    }})
    client.api_key = "personal-secret"
    client.fallback_api_key = "institutional-secret"
    client._client = FakeHTTPClient()

    asyncio.run(client.chat(
        "qwen3.7-plus", [{"role": "user", "content": "private"}],
        max_attempts=1, stage="grading_primary",
    ))

    assert [event["fallback_used"] for event in events] == [False, True]
    assert all(event["routing_origin"] == "teacher" for event in events)
    assert all(event["config_hash"] == "safe-hash" for event in events)
    assert all(event["config_version"] == 7 for event in events)
    assert "secret" not in str(events).lower()


def test_pipeline_timings_preserves_total_and_structure() -> None:
    from app.modules.jobs.schemas import PipelineTimings

    timings = PipelineTimings.model_validate({
        "queue": 10,
        "extraction": 20,
        "structure": 30,
        "persistence": 40,
        "total": 100,
    })

    assert timings.structure == 30
    assert timings.total == 100
    assert timings.model_dump()["total"] == 100
