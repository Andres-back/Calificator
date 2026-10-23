"""The wire format is a profile, not a condition on a purchased model name."""

import pytest

from app.services.ai_api_transport import (
    APIOutputError,
    ModelRuntimeProfile,
    build_api_request,
    normalize_api_response,
)

MESSAGES = [
    {"role": "system", "content": "Devuelve JSON."},
    {
        "role": "user",
        "content": [
            {"type": "text", "text": "Lee la evidencia."},
            {
                "type": "image_url",
                "image_url": {"url": "data:image/png;base64,YWJj", "detail": "high"},
            },
        ],
    },
]


@pytest.mark.parametrize(
    "protocol,endpoint",
    [
        ("responses", "responses"),
        ("chat_completions", "chat/completions"),
        ("messages", "messages"),
    ],
)
def test_arbitrary_model_supports_each_protocol_without_name_heuristics(
    protocol, endpoint
):
    profile = ModelRuntimeProfile(
        protocol=protocol, reasoning_effort="low" if protocol != "messages" else None
    )
    path, body = build_api_request(
        profile, "new-model-2099", MESSAGES, max_tokens=4096, json_mode=True
    )
    assert path == endpoint
    assert body["model"] == "new-model-2099"
    assert "YWJj" in str(body)
    assert MESSAGES[1]["content"][1]["type"] == "image_url"  # no input mutation
    if protocol == "responses":
        assert body["input"][1]["content"][1]["type"] == "input_image"
        assert body["max_output_tokens"] == 4096
        assert body["store"] is False
        assert body["reasoning"] == {"effort": "low"}
        assert "temperature" not in body
        assert body["text"]["format"] == {"type": "json_object"}
    elif protocol == "messages":
        assert body["system"] == "Devuelve JSON."
        assert body["messages"][0]["content"][1]["source"]["data"] == "YWJj"
        assert "response_format" not in body
    else:
        assert body["reasoning_effort"] == "low"


def test_response_normalization_reads_only_final_messages_and_keeps_usage():
    result = normalize_api_response(
        "responses",
        {
            "status": "completed",
            "model": "new-model",
            "output": [
                {"type": "reasoning", "summary": [{"text": "not an answer"}]},
                {
                    "type": "message",
                    "role": "assistant",
                    "content": [{"type": "output_text", "text": '{"score":0.7}'}],
                },
            ],
            "usage": {"input_tokens": 20, "output_tokens": 30},
        },
    )
    assert result["choices"][0]["message"]["content"] == '{"score":0.7}'
    assert result["usage"]["prompt_tokens"] == 20
    assert result["model"] == "new-model"


@pytest.mark.parametrize(
    "payload,code",
    [
        ({"status": "incomplete", "output": []}, "output_incomplete"),
        ({"status": "completed", "output": []}, "output_empty"),
        (
            {
                "status": "completed",
                "output": [
                    {
                        "type": "message",
                        "content": [{"type": "refusal", "refusal": "no"}],
                    }
                ],
            },
            "output_refused",
        ),
    ],
)
def test_incomplete_empty_or_refused_responses_are_never_grades(payload, code):
    with pytest.raises(APIOutputError, match=code):
        normalize_api_response("responses", payload)


@pytest.mark.parametrize(
    "protocol,payload",
    [
        (
            "chat_completions",
            {
                "choices": [
                    {"finish_reason": "length", "message": {"content": '{"score":5}'}}
                ]
            },
        ),
        (
            "messages",
            {
                "stop_reason": "max_tokens",
                "content": [{"type": "text", "text": '{"score":5}'}],
            },
        ),
    ],
)
def test_truncated_other_protocols_are_not_accepted(protocol, payload):
    with pytest.raises(APIOutputError, match="output_incomplete"):
        normalize_api_response(protocol, payload)


@pytest.mark.parametrize(
    "endpoint",
    [
        "https://evil.example/chat",
        "//evil.example",
        "../chat",
        "chat?key=x",
        "chat#x",
        "chat%2f..%2f",
        "chat\\other",
    ],
)
def test_endpoint_cannot_change_origin_or_include_credentials(endpoint):
    with pytest.raises(ValueError):
        ModelRuntimeProfile(endpoint=endpoint)


def test_profiles_reject_unsupported_settings_instead_of_silently_dropping_them():
    with pytest.raises(ValueError):
        ModelRuntimeProfile(protocol="proprietary_unknown")
    with pytest.raises(ValueError):
        ModelRuntimeProfile.model_validate(
            {"protocol": "responses", "api_key": "not-allowed"}
        )


def test_messages_normalization_preserves_contract_and_omits_thinking():
    result = normalize_api_response(
        "messages",
        {
            "model": "arbitrary-model",
            "stop_reason": "end_turn",
            "content": [
                {"type": "thinking", "thinking": "private reasoning"},
                {"type": "text", "text": '{"ok":true}'},
            ],
            "usage": {"input_tokens": 2, "output_tokens": 3},
        },
    )
    assert result["choices"][0]["message"]["content"] == '{"ok":true}'
    assert "private reasoning" not in str(result)


def test_chat_completion_token_field_is_configurable_without_model_names():
    _, body = build_api_request(
        ModelRuntimeProfile(chat_token_field="max_completion_tokens"),
        "unseen",
        MESSAGES,
        max_tokens=777,
    )
    assert body["max_completion_tokens"] == 777 and "max_tokens" not in body


@pytest.mark.parametrize("protocol", ["responses", "messages", "chat_completions"])
def test_complete_synthetic_document_preserves_reading_gaps_and_safe_answer_key(
    protocol,
):
    import json
    from decimal import Decimal
    from app.modules.evaluaciones.digitalize_service import normalize_detected_structure

    document = {
        "lectura": "El río nace en la montaña y llega al mar.",
        "preguntas": [
            {
                "numero": 1,
                "enunciado": "¿Dónde nace el río?",
                "tipo": "opcion_multiple",
                "opciones": ["A) En la montaña", "B) En el mar"],
            },
            {
                "numero": 17,
                "enunciado": "Explica cómo continúa su recorrido.",
                "tipo": "abierta",
            },
            {"numero": 20, "enunciado": "Dibuja su recorrido.", "tipo": "abierta"},
        ],
        "respuestas_esperadas": [
            {"numero": 1, "respuesta": "A"},
            {"numero": 17, "respuesta": "B"},
        ],
    }
    content = json.dumps(document)
    payload = {
        "responses": {
            "status": "completed",
            "output": [
                {
                    "type": "message",
                    "content": [{"type": "output_text", "text": content}],
                }
            ],
        },
        "messages": {
            "stop_reason": "end_turn",
            "content": [{"type": "text", "text": content}],
        },
        "chat_completions": {
            "choices": [{"finish_reason": "stop", "message": {"content": content}}]
        },
    }[protocol]
    normalized = normalize_api_response(protocol, payload)
    result = normalize_detected_structure(
        json.loads(normalized["choices"][0]["message"]["content"]),
        nota_maxima=Decimal("5"),
    )
    assert [question["numero"] for question in result["preguntas"]] == [1, 17, 20]
    assert result["reglas_feedback"]["lectura"] == document["lectura"]
    assert result["respuestas_esperadas"] == [
        {"numero": 1, "respuesta": "A) En la montaña"}
    ]
    assert result["claves_pendientes"] == [17, 20]
