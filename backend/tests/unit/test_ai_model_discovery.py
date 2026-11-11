import httpx
import pytest

from app.services.ai_credentials_service import EffectiveAICredentials
from app.services.ai_model_discovery import (
    AIModelDiscoveryError,
    discover_provider_models,
    model_supports_vision,
    normalize_model_payload,
    persist_discovered_models,
    discover_compatible_models,
)


def test_known_grading_models_expose_their_visual_capability() -> None:
    assert model_supports_vision("deepseek-v4-flash-vision-exp") is True
    assert model_supports_vision("glm-5.3-flash") is True
    assert model_supports_vision("qwen3.7-plus") is True
    assert model_supports_vision("qwen3.8-flash") is True
    assert model_supports_vision("text-only-model") is False


def test_qwen_flash_catalog_without_modalities_still_exposes_vision() -> None:
    models = normalize_model_payload("open_code", {"data": [{"id": "qwen3.8-flash"}]})

    assert len(models) == 1
    assert models[0].capabilities == ("text", "vision")


def test_normalize_model_payload_deduplicates_and_infers_capabilities() -> None:
    models = normalize_model_payload(
        "open_code",
        {
            "data": [
                {"id": "qwen-vl-plus", "context_window": 131072},
                {"id": "qwen-vl-plus", "display_name": "Qwen VL Plus"},
                {"id": "embed-small"},
                {"id": "glm-5.3-flash"},
                {"id": "retired", "active": False},
                {"object": "model"},
            ]
        },
    )

    assert [model.model_id for model in models] == [
        "embed-small",
        "glm-5.3-flash",
        "qwen-vl-plus",
    ]
    assert models[0].capabilities == ("embedding",)
    assert models[1].capabilities == ("text", "vision")
    assert models[2].capabilities == ("text", "vision")


@pytest.mark.parametrize("vision_supported", [True, False])
def test_native_capabilities_respect_supported_and_input_context(vision_supported):
    models = normalize_model_payload("api_direct", {"data": [{
        "id": "configured-model", "type": "model", "max_input_tokens": 1000000,
        "capabilities": {"thinking": {"supported": True}, "image_input": {"supported": vision_supported}},
    }]}, infer_names=False)

    assert models[0].capabilities == (("text", "vision") if vision_supported else ("text",))
    assert models[0].max_context_tokens == 1000000


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("base_url", "cursor_field"),
    [("https://api.anthropic.com/v1", "after_id"), ("https://gateway.example/v1", "after")],
)
async def test_catalog_uses_origin_cursor_and_preserves_generic_gateways(monkeypatch, base_url, cursor_field):
    from unittest.mock import AsyncMock
    import app.services.ai_api_connections as connections
    import app.services.ai_credentials_service as credentials

    monkeypatch.setattr(connections, "validate_api_base_url", lambda url, **_: url)
    monkeypatch.setattr(credentials, "resolve_api_credential", AsyncMock(return_value="synthetic"))
    cursors = []

    def handler(request):
        assert ("after" if cursor_field == "after_id" else "after_id") not in request.url.params
        cursor = request.url.params.get(cursor_field)
        cursors.append(cursor)
        assert cursor in {None, "first"}
        item = {"id": "first" if cursor is None else "second", "type": "model"}
        return httpx.Response(200, json={
            "data": [item], "has_more": cursor is None, "last_id": item["id"],
        })

    models = await discover_compatible_models(None, {
        "id": "api_direct", "base_url": base_url, "credential_revision": "synthetic",
    }, transport=httpx.MockTransport(handler))

    assert [model["model_id"] for model in models] == ["first", "second"]
    assert cursors == [None, "first"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("status", "expected_detail"),
    [(401, "clave"), (403, "permisos"), (404, "ruta o el modelo"), (429, "cuota"), (503, "temporalmente")],
)
async def test_compatible_catalog_errors_are_safe_and_distinguishable(monkeypatch, status, expected_detail):
    from unittest.mock import AsyncMock
    import app.services.ai_api_connections as connections
    import app.services.ai_credentials_service as credentials

    monkeypatch.setattr(connections, "validate_api_base_url", lambda url, **_: url)
    monkeypatch.setattr(credentials, "resolve_api_credential", AsyncMock(return_value="synthetic-secret"))

    with pytest.raises(AIModelDiscoveryError) as error:
        await discover_compatible_models(None, {
            "id": "api_direct", "base_url": "https://api.anthropic.com/v1", "credential_revision": "synthetic",
        }, transport=httpx.MockTransport(lambda _: httpx.Response(status, json={"error": "upstream-body synthetic-secret"})))

    assert expected_detail in str(error.value)
    assert "No se cambió la lista" in str(error.value)
    assert "synthetic-secret" not in str(error.value) and "upstream-body" not in str(error.value)


@pytest.mark.asyncio
async def test_discover_provider_models_uses_effective_key_and_returns_all_models() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer synthetic-groq-key"
        return httpx.Response(
            200,
            json={
                "data": [
                    {"id": "model-a", "context_window": 8192},
                    {"id": "vision-model", "context_window": 16384},
                ]
            },
        )

    models = await discover_provider_models(
        "groq",
        {"base_url": "https://api.groq.test/openai/v1"},
        EffectiveAICredentials(groq_key="synthetic-groq-key"),
        transport=httpx.MockTransport(handler),
    )

    assert [model.model_id for model in models] == ["model-a", "vision-model"]
    assert models[1].capabilities == ("text", "vision")


@pytest.mark.asyncio
async def test_discovery_error_does_not_expose_provider_body_or_key() -> None:
    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "synthetic-secret rejected"})

    with pytest.raises(AIModelDiscoveryError) as exc_info:
        await discover_provider_models(
            "openai",
            {"base_url": "https://api.openai.test/v1"},
            EffectiveAICredentials(openai_key="synthetic-secret"),
            transport=httpx.MockTransport(handler),
        )

    assert "synthetic-secret" not in str(exc_info.value)
    assert "credencial" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_empty_catalog_is_rejected_before_any_database_write() -> None:
    class UnexpectedSession:
        async def execute(self, *_args, **_kwargs):
            raise AssertionError("The database must not be touched for an empty catalog")

    with pytest.raises(AIModelDiscoveryError):
        await persist_discovered_models(
            UnexpectedSession(),  # type: ignore[arg-type]
            provider="groq",
            models=[],
            actor_id="actor",
        )
