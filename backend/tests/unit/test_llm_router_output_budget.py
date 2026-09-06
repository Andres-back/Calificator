from __future__ import annotations

import asyncio

import httpx
import pytest

from app.services import llm_router as llm_router_module
from app.services.llm_router import LLMOutputTruncatedError, LLMRouter


class FakeHTTPClient:
    response: httpx.Response
    last_json: dict = {}

    def __init__(self, timeout):
        self.timeout = timeout

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return False

    async def post(self, url, headers, json):
        type(self).last_json = json
        return type(self).response


async def no_usage_log(**kwargs):
    return None


def configured_router(model: str, max_tokens: int) -> LLMRouter:
    router = LLMRouter()
    router._credentials["open_code"] = "test-key"
    router._provider_configs["open_code"] = {
        "base_url": "https://example.test",
        "model": model,
        "max_tokens": max_tokens,
    }
    return router


def test_chat_completions_receives_output_budget(monkeypatch) -> None:
    request = httpx.Request("POST", "https://example.test/chat/completions")
    FakeHTTPClient.response = httpx.Response(
        200,
        request=request,
        json={"choices": [{"finish_reason": "stop", "message": {"content": "{}"}}], "usage": {}},
    )
    monkeypatch.setattr(llm_router_module.httpx, "AsyncClient", FakeHTTPClient)
    monkeypatch.setattr(llm_router_module, "log_ai_usage", no_usage_log)

    result = asyncio.run(configured_router("deepseek-v4-flash", 2048)._call_open_code("test", True))

    assert result == "{}"
    assert FakeHTTPClient.last_json["max_tokens"] == 2048


@pytest.mark.parametrize(
    ("model", "payload"),
    [
        ("deepseek-v4-flash", {"choices": [{"finish_reason": "length", "message": {"content": "{"}}], "usage": {}}),
        ("qwen3.7-plus", {"stop_reason": "max_tokens", "content": [{"type": "text", "text": "{"}], "usage": {}}),
    ],
)
def test_incomplete_output_is_rejected_for_both_contracts(monkeypatch, model, payload) -> None:
    endpoint = "messages" if model.startswith("qwen") else "chat/completions"
    request = httpx.Request("POST", f"https://example.test/{endpoint}")
    FakeHTTPClient.response = httpx.Response(200, request=request, json=payload)
    monkeypatch.setattr(llm_router_module.httpx, "AsyncClient", FakeHTTPClient)
    usage_events = []

    async def record_usage(**event):
        usage_events.append(event)

    monkeypatch.setattr(llm_router_module, "log_ai_usage", record_usage)

    with pytest.raises(LLMOutputTruncatedError):
        asyncio.run(configured_router(model, 1024)._call_open_code("test", True))
    assert FakeHTTPClient.last_json["max_tokens"] == 1024
    assert len(usage_events) == 1
    assert usage_events[0]["error_code"] == "output_budget_exhausted"
