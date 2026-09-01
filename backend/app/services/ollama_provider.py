"""Cliente nativo para Ollama Cloud; no acepta direcciones arbitrarias del usuario."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

import httpx


OLLAMA_CLOUD_BASE_URL = "https://ollama.com/api"


class OllamaProviderError(RuntimeError):
    """Error seguro del proveedor, sin incluir credenciales ni cuerpos sensibles."""


@dataclass(frozen=True, slots=True)
class OllamaModelInfo:
    model_id: str
    label: str
    capabilities: tuple[str, ...]


def normalize_ollama_capabilities(payload: dict[str, Any]) -> tuple[str, ...]:
    raw = {str(item).strip().lower() for item in payload.get("capabilities", []) if item}
    capabilities: set[str] = set()
    if raw.intersection({"completion", "chat", "tools", "thinking"}):
        capabilities.add("text")
    if "vision" in raw:
        capabilities.update({"text", "vision"})
    if raw.intersection({"embedding", "embeddings", "embed"}):
        capabilities.add("embedding")
    return tuple(sorted(capabilities or {"text"}))


class OllamaCloudProvider:
    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = OLLAMA_CLOUD_BASE_URL,
        timeout_seconds: float = 30,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if not api_key.strip():
            raise ValueError("Ollama Cloud no tiene una credencial configurada")
        normalized_url = base_url.rstrip("/")
        if normalized_url != OLLAMA_CLOUD_BASE_URL:
            raise ValueError("La dirección de Ollama Cloud no está autorizada")
        self._api_key = api_key.strip()
        self._base_url = normalized_url
        self._timeout = timeout_seconds
        self._transport = transport

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            timeout=self._timeout,
            transport=self._transport,
            headers={"Authorization": "Bearer " + self._api_key},
        )

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        try:
            async with self._client() as client:
                response = await client.request(method, self._base_url + path, **kwargs)
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, dict):
                    raise OllamaProviderError("Ollama Cloud devolvió una respuesta no válida")
                return payload
        except httpx.TimeoutException as exc:
            raise OllamaProviderError("Ollama Cloud no respondió a tiempo") from exc
        except httpx.HTTPStatusError as exc:
            code = exc.response.status_code
            message = "La credencial de Ollama Cloud no es válida" if code in {401, 403} else "Ollama Cloud rechazó la solicitud"
            raise OllamaProviderError(message) from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise OllamaProviderError("No fue posible conectar con Ollama Cloud") from exc

    async def list_models(self) -> list[str]:
        payload = await self._request("GET", "/tags")
        models = payload.get("models") or []
        result: list[str] = []
        for item in models:
            if not isinstance(item, dict):
                continue
            model_id = str(item.get("model") or item.get("name") or "").strip()
            if model_id and model_id not in result:
                result.append(model_id)
        return result

    async def show_model(self, model_id: str) -> OllamaModelInfo:
        normalized = model_id.strip()
        if not normalized:
            raise ValueError("Selecciona un modelo de Ollama")
        payload = await self._request("POST", "/show", json={"model": normalized})
        return OllamaModelInfo(
            model_id=normalized,
            label=str(payload.get("details", {}).get("family") or normalized),
            capabilities=normalize_ollama_capabilities(payload),
        )

    async def discover_models(self, *, max_models: int = 50) -> list[OllamaModelInfo]:
        model_ids = (await self.list_models())[:max_models]
        semaphore = asyncio.Semaphore(6)

        async def inspect(model_id: str) -> OllamaModelInfo:
            async with semaphore:
                return await self.show_model(model_id)

        return list(await asyncio.gather(*(inspect(model_id) for model_id in model_ids)))

    async def chat(
        self,
        *,
        model: str,
        messages: list[dict[str, Any]],
        options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/chat",
            json={"model": model, "messages": messages, "stream": False, "options": options or {}},
        )
