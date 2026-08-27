from __future__ import annotations

import asyncio

import fitz

from app.modules.calificaciones.agents import (
    OpenCodeClient,
    _normalize_anthropic_response,
    _opencode_protocol,
    _parse_json_content,
    _prepare_multimodal_images,
    _to_anthropic_content,
)


class FakeResponse:
    status_code = 200
    headers: dict[str, str] = {}

    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def json(self) -> dict:
        return self.payload

    def raise_for_status(self) -> None:
        return None


class CapturingHTTPClient:
    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.calls: list[dict] = []

    async def post(self, url: str, **kwargs):
        self.calls.append({"url": url, **kwargs})
        return FakeResponse(self.payload)

    async def aclose(self) -> None:
        return None


async def _no_usage_log(**_kwargs) -> None:
    return None


def _run_chat(model: str, payload: dict):
    async def scenario():
        client = OpenCodeClient()
        await client._client.aclose()
        transport = CapturingHTTPClient(payload)
        client._client = transport
        client._log_call = _no_usage_log
        result = await client.chat(
            model=model,
            messages=[{"role": "user", "content": "Responde solo JSON"}],
        )
        await client.close()
        return result, transport.calls[0]

    return asyncio.run(scenario())


def test_qwen_uses_messages_and_normalizes_response() -> None:
    payload = {
        "id": "msg_1",
        "model": "qwen3.7-plus",
        "content": [{"type": "text", "text": '{"nota_sugerida": 4.5}'}],
        "stop_reason": "end_turn",
        "usage": {"input_tokens": 10, "output_tokens": 5},
    }

    result, call = _run_chat("qwen3.7-plus", payload)

    assert call["url"].endswith("/messages")
    assert call["headers"]["x-api-key"] is not None
    assert "response_format" not in call["json"]
    assert result["choices"][0]["message"]["content"] == '{"nota_sugerida": 4.5}'
    assert result["usage"]["output_tokens"] == 5


def test_deepseek_keeps_openai_chat_completions() -> None:
    payload = {
        "choices": [{"message": {"content": '{"nota_sugerida": 4}'}}],
        "usage": {"prompt_tokens": 8, "completion_tokens": 3},
    }

    result, call = _run_chat("deepseek-v4-flash", payload)

    assert call["url"].endswith("/chat/completions")
    assert call["headers"]["Authorization"].startswith("Bearer ")
    assert call["json"]["response_format"] == {"type": "json_object"}
    assert result is payload


def test_deepseek_vision_disables_hidden_reasoning() -> None:
    payload = {
        "choices": [{"message": {"content": '{"usable": true}'}}],
        "usage": {"prompt_tokens": 8, "completion_tokens": 3},
    }

    _result, call = _run_chat("deepseek-v4-flash-vision-exp", payload)

    assert call["json"]["thinking"] == {"type": "disabled"}


def test_regular_deepseek_does_not_receive_experimental_thinking_flag() -> None:
    payload = {
        "choices": [{"message": {"content": '{"nota_sugerida": 4}'}}],
        "usage": {},
    }

    _result, call = _run_chat("deepseek-v4-flash", payload)

    assert "thinking" not in call["json"]


def test_multimodal_content_is_converted_to_anthropic_image_source() -> None:
    converted = _to_anthropic_content([
        {"type": "text", "text": "Pagina 1"},
        {
            "type": "image_url",
            "image_url": {"url": "data:image/png;base64,YWJj"},
        },
    ])

    assert converted[0] == {"type": "text", "text": "Pagina 1"}
    assert converted[1] == {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/png",
            "data": "YWJj",
        },
    }


def test_pdf_renderer_keeps_every_page(monkeypatch) -> None:
    document = fitz.open()
    for _ in range(3):
        document.new_page()
    pdf_bytes = document.tobytes()
    document.close()

    pages = _prepare_multimodal_images(pdf_bytes, "application/pdf")

    assert [page_number for _, _, page_number in pages] == [1, 2, 3]
    assert all(mime == "image/jpeg" for _, mime, _ in pages)
    assert all(page_bytes.startswith(b"\xff\xd8") for page_bytes, _, _ in pages)


def test_protocol_mapping_matches_opencode_go_contract() -> None:
    assert _opencode_protocol("qwen3.6-plus") == "messages"
    assert _opencode_protocol("qwen3.7-plus") == "messages"
    assert _opencode_protocol("mimo-v2.5") == "chat_completions"
    assert _opencode_protocol("deepseek-v4-flash") == "chat_completions"


def test_normalizer_combines_text_blocks() -> None:
    result = _normalize_anthropic_response({
        "content": [
            {"type": "text", "text": "{\"a\":"},
            {"type": "text", "text": "1}"},
        ],
        "usage": {},
    })

    assert result["choices"][0]["message"]["content"] == '{"a":1}'



def test_json_parser_accepts_markdown_fence_from_messages_api() -> None:
    parsed = _parse_json_content("```json\n{\"nota_sugerida\": 4}\n```")

    assert parsed == {"nota_sugerida": 4}

class RetryableResponse(FakeResponse):
    status_code = 503

    def raise_for_status(self) -> None:
        raise RuntimeError("provider unavailable")


def test_max_attempts_one_does_not_retry_same_model() -> None:
    async def scenario() -> int:
        client = OpenCodeClient()
        await client._client.aclose()
        transport = CapturingHTTPClient({})

        async def unavailable_post(url: str, **kwargs):
            transport.calls.append({"url": url, **kwargs})
            return RetryableResponse({})

        transport.post = unavailable_post
        client._client = transport
        client._log_call = _no_usage_log
        try:
            await client.chat(
                model="deepseek-v4-flash",
                messages=[{"role": "user", "content": "JSON"}],
                max_attempts=1,
            )
        except RuntimeError:
            pass
        await client.close()
        return len(transport.calls)

    assert asyncio.run(scenario()) == 1


def test_multimodal_call_logs_only_one_vision_attempt() -> None:
    async def scenario() -> list[dict]:
        client = OpenCodeClient()
        await client._client.aclose()
        client._client = CapturingHTTPClient({
            "choices": [{"message": {"content": "{}"}}],
            "usage": {},
        })
        events: list[dict] = []

        async def capture(**kwargs) -> None:
            events.append(kwargs)

        client._log_call = capture
        await client.chat_multimodal(
            model="mimo-v2.5",
            text="Extrae",
            image_bytes=b"imagen",
            max_attempts=1,
        )
        await client.close()
        return events

    events = asyncio.run(scenario())
    assert len(events) == 1
    assert events[0]["stage"] == "extraction"
    assert events[0]["image_count"] == 1
