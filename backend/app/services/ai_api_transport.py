"""Provider-neutral wire formats. Profiles contain no credentials or model names."""

from __future__ import annotations

from copy import deepcopy
import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class APIOutputError(RuntimeError):
    """Stable safe error code: never put provider output in exceptions/logs."""

    def __init__(self, code: str, *, usage: dict[str, Any] | None = None):
        self.code = code if code in {
            "output_budget_exhausted", "output_incomplete", "output_refused",
            "output_empty", "protocol_not_supported",
        } else "output_incomplete"
        usage = usage if isinstance(usage, dict) else {}
        def count(primary: str, alias: str) -> int | None:
            value = usage.get(primary, usage.get(alias))
            return value if type(value) is int and 0 <= value <= 10**9 else None
        self.input_tokens = count("input_tokens", "prompt_tokens")
        self.output_tokens = count("output_tokens", "completion_tokens")
        super().__init__(self.code)


class ModelRuntimeProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    protocol: Literal["chat_completions", "responses", "messages"] = "chat_completions"
    endpoint: str | None = None
    reasoning_effort: Literal["none", "minimal", "low", "medium", "high"] | None = None
    thinking: Literal["enabled", "disabled"] | None = None
    send_temperature: bool = False
    auth_style: Literal["auto", "bearer", "api_key"] = "auto"
    chat_token_field: Literal["max_tokens", "max_completion_tokens"] = "max_tokens"

    @model_validator(mode="after")
    def supported_controls(self):
        if self.protocol == "messages" and self.reasoning_effort:
            raise ValueError(
                "Messages no admite este parámetro de esfuerzo; usa las opciones soportadas por ese proveedor."
            )
        if self.protocol == "responses" and self.thinking:
            raise ValueError(
                "Responses usa esfuerzo de razonamiento, no el parámetro thinking."
            )
        return self

    @field_validator("endpoint")
    @classmethod
    def safe_relative_endpoint(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not re.fullmatch(r"[a-zA-Z0-9_-]+(?:/[a-zA-Z0-9_-]+)*", value):
            raise ValueError("La ruta debe ser relativa, sin dominio ni parámetros.")
        return value


def _image_url(block: dict[str, Any]) -> tuple[str, str]:
    image = block.get("image_url")
    url = image.get("url") if isinstance(image, dict) else image
    if not isinstance(url, str) or not url:
        raise ValueError("image_missing")
    detail = str(image.get("detail") or "high") if isinstance(image, dict) else "high"
    return url, detail


def _content(content: Any, *, protocol: str, role: str) -> Any:
    if isinstance(content, str):
        return content
    result = []
    for block in content if isinstance(content, list) else []:
        if not isinstance(block, dict):
            raise ValueError("content_block_invalid")
        kind = block.get("type")
        if kind == "text":
            result.append(
                {
                    "type": "output_text" if role == "assistant" else "input_text",
                    "text": str(block.get("text") or ""),
                }
                if protocol == "responses"
                else deepcopy(block)
            )
        elif kind == "image_url":
            if role == "assistant":
                raise ValueError("assistant_image_not_supported")
            url, detail = _image_url(block)
            if protocol == "responses":
                result.append(
                    {"type": "input_image", "image_url": url, "detail": detail}
                )
            elif protocol == "messages":
                if url.startswith("data:") and ";base64," in url:
                    header, encoded = url.split(",", 1)
                    source = {
                        "type": "base64",
                        "media_type": header[5:].split(";", 1)[0],
                        "data": encoded,
                    }
                else:
                    source = {"type": "url", "url": url}
                result.append({"type": "image", "source": source})
            else:
                result.append(deepcopy(block))
        elif protocol == "messages" and kind == "image":
            result.append(deepcopy(block))
        else:
            raise ValueError("content_type_not_supported")
    return result


def build_api_request(
    profile: ModelRuntimeProfile | dict[str, Any],
    model: str,
    messages: list[dict[str, Any]],
    *,
    max_tokens: int,
    json_mode: bool = False,
    temperature: float = 0.3,
) -> tuple[str, dict[str, Any]]:
    profile = (
        profile
        if isinstance(profile, ModelRuntimeProfile)
        else ModelRuntimeProfile.model_validate(profile)
    )
    protocol = profile.protocol
    endpoint = (
        profile.endpoint
        or {
            "responses": "responses",
            "messages": "messages",
            "chat_completions": "chat/completions",
        }[protocol]
    )
    body: dict[str, Any] = {"model": model}
    if protocol == "chat_completions":
        body.update(messages=deepcopy(messages))
        body[profile.chat_token_field] = max_tokens
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        if profile.reasoning_effort:
            body["reasoning_effort"] = profile.reasoning_effort
    else:
        normalized, system = [], []
        for message in messages:
            role = str(message.get("role") or "user")
            content = message.get("content", "")
            if protocol == "messages" and role in {"system", "developer"}:
                if not isinstance(content, str):
                    raise ValueError("system_content_invalid")
                system.append(content)
                continue
            if role not in {"user", "assistant", "system", "developer"}:
                raise ValueError("message_role_not_supported")
            normalized.append(
                {
                    "role": role,
                    "content": _content(content, protocol=protocol, role=role),
                }
            )
        if protocol == "responses":
            body.update(input=normalized, max_output_tokens=max_tokens, store=False)
            if json_mode:
                body["text"] = {"format": {"type": "json_object"}}
            if profile.reasoning_effort:
                body["reasoning"] = {"effort": profile.reasoning_effort}
        else:
            body.update(messages=normalized, max_tokens=max_tokens)
            if system:
                body["system"] = "\n\n".join(system)
    if profile.thinking and protocol != "responses":
        body["thinking"] = {"type": profile.thinking}
    if profile.send_temperature:
        body["temperature"] = temperature
    return endpoint, body


def normalize_api_response(protocol: str, data: dict[str, Any]) -> dict[str, Any]:
    """Normalize successful, complete final text into the application's contract."""
    usage = deepcopy(data.get("usage")) if isinstance(data.get("usage"), dict) else {}
    if protocol == "responses":
        if data.get("status") != "completed" or data.get("error"):
            reason = data.get("incomplete_details") or {}
            exhausted = (data.get("status") == "incomplete" and not data.get("error")
                         and isinstance(reason, dict) and reason.get("reason") == "max_output_tokens")
            raise APIOutputError("output_budget_exhausted" if exhausted else "output_incomplete", usage=usage)
        blocks = []
        for item in data.get("output") or []:
            if item.get("type") == "message":
                if item.get("status") not in (None, "completed"):
                    raise APIOutputError("output_incomplete", usage=usage)
                blocks.extend(item.get("content") or [])
        if any(b.get("type") == "refusal" for b in blocks):
            raise APIOutputError("output_refused", usage=usage)
        content = "".join(
            str(b.get("text") or "") for b in blocks if b.get("type") == "output_text"
        )
        finish = "stop"
    elif protocol == "messages":
        finish = str(data.get("stop_reason") or "")
        blocks = data.get("content") or []
        if data.get("type") == "error" or finish not in {"end_turn", "stop_sequence"}:
            exhausted = data.get("type") != "error" and finish == "max_tokens"
            raise APIOutputError("output_budget_exhausted" if exhausted else "output_incomplete", usage=usage)
        content = (
            blocks
            if isinstance(blocks, str)
            else "".join(
                str(b.get("text") or "") for b in blocks if b.get("type") == "text"
            )
        )
    elif protocol == "chat_completions":
        choices = data.get("choices") or []
        if not choices:
            raise APIOutputError("output_empty", usage=usage)
        choice = choices[0]
        finish = str(choice.get("finish_reason") or "")
        message = choice.get("message") or {}
        if message.get("refusal"):
            raise APIOutputError("output_refused", usage=usage)
        if finish != "stop":
            raise APIOutputError("output_budget_exhausted" if finish == "length" else "output_incomplete", usage=usage)
        content = message.get("content") or ""
    else:
        raise APIOutputError("protocol_not_supported")
    if not isinstance(content, str) or not content.strip():
        raise APIOutputError("output_empty", usage=usage)
    usage.setdefault("prompt_tokens", usage.get("input_tokens", 0))
    usage.setdefault("completion_tokens", usage.get("output_tokens", 0))
    usage.setdefault("input_tokens", usage.get("prompt_tokens", 0))
    usage.setdefault("output_tokens", usage.get("completion_tokens", 0))
    return {
        "id": data.get("id"),
        "model": data.get("model"),
        "choices": [
            {
                "message": {"role": "assistant", "content": content},
                "finish_reason": finish,
            }
        ],
        "usage": usage,
    }
