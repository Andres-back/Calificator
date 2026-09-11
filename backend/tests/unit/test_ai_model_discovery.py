import httpx
import pytest

from app.services.ai_credentials_service import EffectiveAICredentials
from app.services.ai_model_discovery import (
    AIModelDiscoveryError,
    discover_provider_models,
    normalize_model_payload,
    persist_discovered_models,
)


def test_normalize_model_payload_deduplicates_and_infers_capabilities() -> None:
    models = normalize_model_payload(
        "open_code",
        {
            "data": [
                {"id": "qwen-vl-plus", "context_window": 131072},
                {"id": "qwen-vl-plus", "display_name": "Qwen VL Plus"},
                {"id": "embed-small"},
                {"id": "retired", "active": False},
                {"object": "model"},
            ]
        },
    )

    assert [model.model_id for model in models] == ["embed-small", "qwen-vl-plus"]
    assert models[0].capabilities == ("embedding",)
    assert models[1].capabilities == ("text", "vision")


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
