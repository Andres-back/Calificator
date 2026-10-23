"""Discover and normalize the model catalog exposed by configured AI providers."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.ai_credentials_service import EffectiveAICredentials
from app.services.ollama_provider import OllamaCloudProvider, OllamaProviderError
from app.services.opencode_request import new_opencode_session_id, opencode_headers


class AIModelDiscoveryError(RuntimeError):
    """Safe discovery error that never contains credentials or response bodies."""


@dataclass(frozen=True, slots=True)
class DiscoveredModel:
    model_id: str
    label: str
    capabilities: tuple[str, ...]
    max_context_tokens: int | None = None


DISCOVERABLE_PROVIDERS = frozenset({
    "openai", "openai_image", "open_code", "groq", "ollama", "cloudflare_image",
})
SUPPORTED_CAPABILITIES = frozenset({"text", "vision", "image", "embedding"})
KNOWN_MULTIMODAL_MODEL_PREFIXES = (
    "glm-5.3-flash",
    "qwen3.8-flash",
    "qwen3.7-plus",
    "qwen3.6-plus",
    "mimo-v2.5",
)


def model_supports_vision(model_id: str) -> bool:
    """Resuelve capacidad visual con la misma normalizacion del catalogo."""
    return "vision" in _capabilities(str(model_id or ""), {})


def _credential_for(provider: str, credentials: EffectiveAICredentials) -> str:
    if provider in {"openai", "openai_image"}:
        return credentials.openai_key
    if provider == "open_code":
        return credentials.open_code_key
    if provider == "groq":
        return credentials.groq_key
    if provider == "ollama":
        return credentials.ollama_key
    if provider == "cloudflare_image":
        return credentials.cloudflare_token
    return ""


def _capabilities(model_id: str, item: dict[str, Any], *, infer_name: bool = True) -> tuple[str, ...]:
    declared = item.get("capabilities") or item.get("capability") or []
    if isinstance(declared, str):
        declared = [declared]
    values = {str(value).strip().lower() for value in declared if value}
    modalities = item.get("modalities") or item.get("architecture", {}).get("input_modalities") or []
    if isinstance(modalities, str):
        modalities = [modalities]
    modality_values = {str(value).strip().lower() for value in modalities if value}
    task = str(item.get("task", {}).get("name") if isinstance(item.get("task"), dict) else item.get("task") or "").lower()
    normalized_task = task.replace("_", "-").replace(" ", "-")
    name = model_id.lower()

    result: set[str] = set()
    if values.intersection({"text", "chat", "completion", "tools", "thinking"}):
        result.add("text")
    if values.intersection({"vision", "image_input", "multimodal"}) or modality_values.intersection({"image", "vision"}):
        result.update({"text", "vision"})
    if values.intersection({"image", "image_generation", "text-to-image"}) or "text-to-image" in normalized_task:
        result.add("image")
    if values.intersection({"embedding", "embeddings", "embed"}) or "embedding" in task:
        result.add("embedding")

    # OpenCode may return only an id for some catalog entries.
    if infer_name and name.startswith(KNOWN_MULTIMODAL_MODEL_PREFIXES):
        result.update({"text", "vision"})

    if not result and infer_name:
        if "embed" in name:
            result.add("embedding")
        elif any(token in name for token in ("gpt-image", "dall-e", "flux", "stable-diffusion", "imagen")):
            result.add("image")
        elif any(token in name for token in ("vision", "pixtral", "llava", "-vl", "vl-", "qvq", "gpt-4o", "gpt-4.1", "gpt-5")):
            result.update({"text", "vision"})
        elif not any(token in name for token in ("whisper", "transcri", "tts", "speech", "audio")):
            result.add("text")
    return tuple(sorted(result.intersection(SUPPORTED_CAPABILITIES)))


def normalize_model_payload(provider: str, payload: Any, *, infer_names: bool = True, include_unknown: bool = False) -> list[DiscoveredModel]:
    if isinstance(payload, dict):
        raw_models = payload.get("data") or payload.get("models") or payload.get("result") or []
    elif isinstance(payload, list):
        raw_models = payload
    else:
        raw_models = []
    if isinstance(raw_models, dict):
        raw_models = raw_models.get("models") or raw_models.get("data") or []

    normalized: dict[str, DiscoveredModel] = {}
    for raw in raw_models if isinstance(raw_models, list) else []:
        item = raw if isinstance(raw, dict) else {"id": raw}
        if item.get("active") is False:
            continue
        model_id = str(item.get("id") or item.get("model") or item.get("name") or "").strip()
        if not model_id:
            continue
        capabilities = _capabilities(model_id, item, infer_name=infer_names)
        if provider in {"openai_image", "cloudflare_image"}:
            capabilities = tuple(value for value in capabilities if value == "image")
        if not capabilities and not include_unknown:
            continue
        context = item.get("context_window") or item.get("max_context_tokens")
        normalized[model_id] = DiscoveredModel(
            model_id=model_id,
            label=str(item.get("display_name") or item.get("label") or item.get("name") or model_id),
            capabilities=capabilities,
            max_context_tokens=int(context) if isinstance(context, (int, float)) and context > 0 else None,
        )
    return sorted(normalized.values(), key=lambda model: model.model_id.casefold())


async def discover_provider_models(
    provider: str,
    provider_config: dict[str, Any],
    credentials: EffectiveAICredentials,
    *,
    transport: httpx.AsyncBaseTransport | None = None,
) -> list[DiscoveredModel]:
    if provider not in DISCOVERABLE_PROVIDERS:
        raise AIModelDiscoveryError("Este proveedor no ofrece un catálogo actualizable.")
    credential = _credential_for(provider, credentials).strip()
    if not credential:
        raise AIModelDiscoveryError("Configura primero la credencial institucional del proveedor.")

    if provider == "ollama":
        try:
            client = OllamaCloudProvider(
                credential,
                base_url=str(provider_config.get("base_url") or settings.OLLAMA_CLOUD_BASE_URL),
                timeout_seconds=min(float(provider_config.get("timeout_seconds") or 15), 30),
                transport=transport,
            )
            return [
                DiscoveredModel(item.model_id, item.label, item.capabilities)
                for item in await client.discover_models(max_models=100)
            ]
        except (OllamaProviderError, ValueError) as exc:
            raise AIModelDiscoveryError(str(exc)) from exc

    if provider == "cloudflare_image":
        account_id = credentials.cloudflare_account_id.strip()
        if not account_id:
            raise AIModelDiscoveryError("Configura también el Account ID de Cloudflare.")
        url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/models/search"
    else:
        base_url = str(provider_config.get("base_url") or "").rstrip("/")
        if not base_url:
            raise AIModelDiscoveryError("El proveedor no tiene una URL base configurada.")
        url = f"{base_url}/models"

    try:
        headers = (
            opencode_headers(
                credential,
                session_id=new_opencode_session_id("model-discovery"),
            )
            if provider == "open_code"
            else {"Authorization": f"Bearer {credential}"}
        )
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(15, connect=5), transport=transport,
            headers=headers,
        ) as client:
            response = await client.get(url, params={"page": 1, "per_page": 1000} if provider == "cloudflare_image" else None)
            response.raise_for_status()
            models = normalize_model_payload(provider, response.json())
    except httpx.TimeoutException as exc:
        raise AIModelDiscoveryError("El proveedor no respondió a tiempo.") from exc
    except (httpx.HTTPError, ValueError) as exc:
        status = exc.response.status_code if isinstance(exc, httpx.HTTPStatusError) else None
        message = "La credencial fue rechazada por el proveedor." if status in {401, 403} else "No fue posible consultar el catálogo del proveedor."
        raise AIModelDiscoveryError(message) from exc
    if not models:
        raise AIModelDiscoveryError("El proveedor no devolvió modelos compatibles con XCalificator.")
    return models


async def persist_discovered_models(
    db: AsyncSession,
    *,
    provider: str,
    models: list[DiscoveredModel],
    actor_id: Any,
) -> list[dict[str, Any]]:
    """Replace availability only after a complete successful discovery."""
    if not models:
        raise AIModelDiscoveryError("No se recibió un catálogo válido para guardar.")
    existing = await db.execute(
        text(
            "SELECT model_id, capabilities, recommended FROM ai_provider_models "
            "WHERE provider_id=:provider"
        ),
        {"provider": provider},
    )
    existing_rows = existing.fetchall()
    recommended = {str(row.model_id): bool(row.recommended) for row in existing_rows}
    existing_capabilities = {
        str(row.model_id): {str(value) for value in (row.capabilities or [])}
        for row in existing_rows
    }
    await db.execute(
        text("UPDATE ai_provider_models SET active=false, updated_at=NOW() WHERE provider_id=:provider"),
        {"provider": provider},
    )
    for model in models:
        await db.execute(
            text(
                "INSERT INTO ai_provider_models "
                "(provider_id, model_id, label, capabilities, recommended, active, max_context_tokens, updated_at, updated_by) "
                "VALUES (:provider, :model, :label, :capabilities, :recommended, true, :context, NOW(), :actor) "
                "ON CONFLICT (provider_id, model_id) DO UPDATE SET label=EXCLUDED.label, "
                "capabilities=EXCLUDED.capabilities, active=true, max_context_tokens=COALESCE(EXCLUDED.max_context_tokens, ai_provider_models.max_context_tokens), "
                "updated_at=NOW(), updated_by=EXCLUDED.updated_by"
            ),
            {
                "provider": provider,
                "model": model.model_id,
                "label": model.label,
                "capabilities": sorted(set(model.capabilities).union(existing_capabilities.get(model.model_id, set()))),
                "recommended": recommended.get(model.model_id, False),
                "context": model.max_context_tokens,
                "actor": str(actor_id),
            },
        )
    result = await db.execute(
        text(
            "SELECT provider_id, model_id, label, capabilities, recommended, active, max_context_tokens, NULLIF(runtime_profile, '{}'::jsonb) AS runtime_profile, verification_id::text "
            "FROM ai_provider_models WHERE provider_id=:provider ORDER BY active DESC, recommended DESC, model_id"
        ),
        {"provider": provider},
    )
    return [dict(row._mapping) for row in result.fetchall()]


async def discover_compatible_models(db: AsyncSession, provider: dict[str, Any], *, transport=None) -> list[dict[str, Any]]:
    """Fetch a whole compatible catalog or keep the previous draft untouched."""
    import asyncio
    from urllib.parse import urljoin, urlsplit
    from app.services.ai_api_connections import APIConnectionError, public_api_transport, validate_api_base_url
    from app.services.ai_credentials_service import resolve_api_credential

    base = await asyncio.to_thread(validate_api_base_url, str(provider.get("base_url") or ""))
    if not provider.get("credential_revision"):
        from app.services.ai_config_service import AIConfigService
        saved = await AIConfigService(db=db).get_provider_config(str(provider["id"]))
        if str(saved.get("base_url") or "").rstrip("/") != base:
            raise APIConnectionError("Para consultar otro destino crea una conexión con su propia clave.")
    key = await resolve_api_credential(db, provider)
    if not key:
        raise APIConnectionError("Configura primero una clave para esta conexión.")
    headers = opencode_headers(key, session_id=new_opencode_session_id("catalog-check"))
    # Providing both standard auth forms also supports Messages-only catalogs;
    # headers never follow redirects and the key is bound to this exact origin.
    headers.update({"x-api-key": key, "anthropic-version": "2023-06-01"})
    found: dict[str, DiscoveredModel] = {}
    next_url, params = f"{base}/models", None
    seen: set[str] = set()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20, connect=5), headers=headers,
                                     transport=transport or public_api_transport(), follow_redirects=False, trust_env=False) as client:
            for _ in range(10):
                marker = next_url + str(params)
                if marker in seen:
                    raise AIModelDiscoveryError("El catálogo repitió una página; no se reemplazó la lista anterior.")
                seen.add(marker)
                response = await client.get(next_url, params=params)
                response.raise_for_status()
                payload = response.json()
                entries = normalize_model_payload(str(provider["id"]), payload, infer_names=False, include_unknown=True)
                if not entries or len(found) + len(entries) > 2000:
                    raise AIModelDiscoveryError("El catálogo está vacío o incompleto; se conserva la lista anterior.")
                found.update({m.model_id: m for m in entries})
                more = isinstance(payload, dict) and payload.get("has_more") is True
                following = (payload.get("next") or payload.get("next_cursor")) if isinstance(payload, dict) else None
                if not more and not following:
                    total = payload.get("total") if isinstance(payload, dict) else None
                    if isinstance(total, int) and total > len(found):
                        raise AIModelDiscoveryError("El proveedor devolvió un catálogo parcial; no se reemplazó la lista.")
                    return [{"provider_id": provider["id"], "model_id": m.model_id, "label": m.label,
                             "capabilities": list(m.capabilities), "max_context_tokens": m.max_context_tokens,
                             "active": True, "recommended": False, "runtime_profile": None, "verification_id": None} for m in found.values()]
                if following and (str(following).startswith(("https:", "/"))):
                    candidate = urljoin(next_url, str(following))
                    if (urlsplit(candidate).scheme, urlsplit(candidate).netloc, urlsplit(candidate).path) != (urlsplit(base).scheme, urlsplit(base).netloc, urlsplit(base).path + "/models"):
                        raise AIModelDiscoveryError("La siguiente página del catálogo no pertenece a la misma conexión.")
                    next_url, params = candidate, None
                else:
                    cursor = following or (payload.get("last_id") if isinstance(payload, dict) else None)
                    if not cursor:
                        raise AIModelDiscoveryError("Falta la siguiente página del catálogo; se conserva la lista anterior.")
                    params = {"after": str(cursor)}
            raise AIModelDiscoveryError("El catálogo supera el límite de páginas; se conserva la lista anterior.")
    except (httpx.HTTPError, ValueError) as exc:
        if isinstance(exc, (AIModelDiscoveryError, APIConnectionError)):
            raise
        raise AIModelDiscoveryError("No fue posible consultar el catálogo. Revisa acceso y disponibilidad; no se cambió la lista.") from exc
