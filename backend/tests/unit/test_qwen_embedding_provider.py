from __future__ import annotations

import httpx
import pytest

from app.services.embedding_service import EmbeddingUnavailableError, _validate_vectors
from app.services.ollama_provider import OllamaEmbeddingProvider, OllamaProviderError


@pytest.mark.asyncio
async def test_internal_ollama_embedding_provider_sends_batch() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/embed"
        payload = __import__("json").loads(request.content)
        assert payload["model"] == "qwen3-embedding:0.6b"
        assert payload["input"] == [
            "criterio de aprendizaje",
            "respuesta del estudiante",
        ]
        return httpx.Response(200, json={"embeddings": [[0.1, 0.2], [0.3, 0.4]]})

    provider = OllamaEmbeddingProvider(
        base_url="http://ollama:11434",
        transport=httpx.MockTransport(handler),
    )
    result = await provider.embed(
        model="qwen3-embedding:0.6b",
        inputs=["criterio de aprendizaje", "respuesta del estudiante"],
    )

    assert result == [[0.1, 0.2], [0.3, 0.4]]


@pytest.mark.asyncio
async def test_internal_ollama_embedding_provider_sanitizes_errors() -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="sensitive upstream body")

    provider = OllamaEmbeddingProvider(
        base_url="http://ollama:11434",
        transport=httpx.MockTransport(handler),
    )
    with pytest.raises(OllamaProviderError) as captured:
        await provider.embed(model="qwen3-embedding:0.6b", inputs=["dato privado"])

    assert "sensitive" not in str(captured.value)
    assert "dato privado" not in str(captured.value)


def test_embedding_dimensions_are_strict() -> None:
    _validate_vectors([[0.0, 1.0]], expected=1, dimensions=2)
    with pytest.raises(EmbeddingUnavailableError):
        _validate_vectors([[0.0]], expected=1, dimensions=2)
    with pytest.raises(EmbeddingUnavailableError):
        _validate_vectors([[float("nan"), 0.0]], expected=1, dimensions=2)
