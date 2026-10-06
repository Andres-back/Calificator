from unittest.mock import AsyncMock, Mock

import httpx
import pytest

from app.modules.admin_ai_config import router as routes
from app.services.ai_credentials_service import EffectiveAICredentials
from app.services.ollama_provider import OllamaProviderError
from app.shared.enums import UserRole
from authorization_helpers import authenticated_client, make_user, unauthenticated_client


@pytest.fixture
def embedding_probe(monkeypatch):
    calls = []
    embed = AsyncMock(return_value=[[0.1, 0.2, 0.3]])

    class Client:
        def __init__(self, **kwargs):
            calls.append(kwargs)

        async def embed(self, **kwargs):
            return await embed(**kwargs)

    monkeypatch.setattr(routes, "OllamaEmbeddingProvider", Client, raising=False)
    monkeypatch.setattr(routes.settings, "EMBEDDING_DIMENSIONS", 3)
    return calls, embed


@pytest.mark.anyio
async def test_internal_probe_validates_real_vector_without_cloud_key(embedding_probe):
    calls, embed = embedding_probe
    result = await routes._test_provider_connection(
        "ollama_internal", EffectiveAICredentials(),
        {"model": "qwen3-embedding:0.6b", "base_url": "https://untrusted.example"},
    )
    assert result["status"] == "ok"
    assert result["http_code"] == 200
    assert result["latency_ms"] >= 0
    assert calls == [{"base_url": routes.settings.OLLAMA_ENDPOINT,
                      "timeout_seconds": routes.settings.EMBEDDING_TIMEOUT_SECONDS}]
    assert embed.await_args.kwargs["model"] == "qwen3-embedding:0.6b"
    assert len(embed.await_args.kwargs["inputs"]) == 1
    assert "estudiante" not in embed.await_args.kwargs["inputs"][0].lower()
    assert "embedding" not in result  # Never return vectors.


@pytest.mark.anyio
@pytest.mark.parametrize("vectors", [[], [[1.0]], [[1.0, 2.0, float("nan")]],
                                         [[1.0, 2.0, float("inf")]], [["secret", 2.0, 3.0]], [None]])
async def test_internal_probe_rejects_incompatible_response(embedding_probe, vectors):
    _, embed = embedding_probe
    embed.return_value = vectors
    result = await routes._test_provider_connection("ollama_internal", EffectiveAICredentials())
    assert result["status"] == "error"
    assert result["error"]
    assert result["latency_ms"] >= 0
    assert "secret" not in result["error"]


@pytest.mark.anyio
async def test_internal_probe_reports_safe_connection_failure(embedding_probe):
    _, embed = embedding_probe
    embed.side_effect = OllamaProviderError("El servicio institucional de embeddings no respondió a tiempo", temporary=True)
    result = await routes._test_provider_connection("ollama_internal", EffectiveAICredentials())
    assert result["status"] == "error"
    assert "no respondió a tiempo" in result["error"]


@pytest.mark.anyio
async def test_cloud_ollama_still_requires_cloud_key(monkeypatch):
    client = Mock(side_effect=OllamaProviderError("Ollama Cloud requiere una clave"))
    monkeypatch.setattr(routes, "OllamaCloudProvider", client)
    result = await routes._test_provider_connection("ollama", EffectiveAICredentials())
    assert result["status"] == "error"
    assert "requiere una clave" in result["error"]


@pytest.mark.anyio
async def test_openai_probe_retains_model_listing(monkeypatch):
    request = httpx.Request("GET", "https://api.openai.com/v1/models")
    get_request = AsyncMock(return_value=httpx.Response(200, request=request))

    class Client:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def get(self, *args, **kwargs):
            return await get_request(*args, **kwargs)

    monkeypatch.setattr(routes.httpx, "AsyncClient", Client)
    result = await routes._test_provider_connection("openai", EffectiveAICredentials(openai_key="test-only"))
    assert result["status"] == "ok"
    assert get_request.await_args.args == ("https://api.openai.com/v1/models",)


@pytest.fixture
def admin_probe(monkeypatch):
    class Service:
        def __init__(self, *, db):
            pass

        async def get_all_providers(self):
            return [{"id": "ollama_internal", "active": True, "model": "qwen3-embedding:0.6b"}]

        async def get_all_models(self):
            return [{"provider_id": "ollama_internal", "model_id": "qwen3-embedding:0.6b", "active": True, "capabilities": ["embedding"]}]

    monkeypatch.setattr(routes, "AIConfigService", Service)
    monkeypatch.setattr(routes, "get_effective_ai_credentials", AsyncMock(return_value=EffectiveAICredentials()))
    probe = AsyncMock(return_value={"status": "ok", "latency_ms": 15, "http_code": 200, "error": None})
    monkeypatch.setattr(routes, "_test_provider_connection", probe)
    return probe


def test_admin_endpoint_recognizes_persisted_internal_provider(admin_probe):
    client = authenticated_client(make_user(UserRole.ADMIN))
    response = client.post("/api/admin/ai-providers/ollama_internal/test", json={"model": "qwen3-embedding:0.6b", "capability": "embedding"})
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["latency_ms"] == 15
    admin_probe.assert_awaited_once()


def test_unknown_provider_has_complete_error_contract(admin_probe):
    response = authenticated_client(make_user(UserRole.ADMIN)).post("/api/admin/ai-providers/unknown/test")
    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert response.json()["error"]
    admin_probe.assert_not_awaited()


def test_incompatible_requested_model_never_calls_service(admin_probe):
    response = authenticated_client(make_user(UserRole.ADMIN)).post(
        "/api/admin/ai-providers/ollama_internal/test", json={"model": "wrong-model", "capability": "embedding"},
    )
    assert response.status_code == 422
    admin_probe.assert_not_awaited()


@pytest.mark.parametrize("role", [UserRole.PROFESOR, UserRole.ESTUDIANTE])
def test_non_admin_cannot_probe_internal_service(admin_probe, role):
    response = authenticated_client(make_user(role)).post("/api/admin/ai-providers/ollama_internal/test")
    assert response.status_code == 403
    admin_probe.assert_not_awaited()


def test_probe_requires_session(admin_probe):
    response = unauthenticated_client().post("/api/admin/ai-providers/ollama_internal/test")
    assert response.status_code == 401
    admin_probe.assert_not_awaited()
