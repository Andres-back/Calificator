"""Safe boundaries shared by compatible API administration and runtime."""

from __future__ import annotations

import asyncio
import hashlib
import ipaddress
import json
import socket
import time
from uuid import uuid4
from typing import Any
from urllib.parse import urlsplit

import httpx


class APIConnectionError(ValueError):
    """A user-safe error; never include a URL, key or upstream body."""

    def __init__(self, message: str, *, field: str = "configuration") -> None:
        super().__init__(message)
        self.field = field


def _public_address(value: str) -> bool:
    address = ipaddress.ip_address(value)
    return address.is_global and not address.is_multicast and not address.is_reserved


def validate_api_base_url(url: str, *, addresses: list[str] | None = None) -> str:
    try:
        parsed = urlsplit(url)
        host = parsed.hostname or ""
        if (
            parsed.scheme != "https"
            or not host
            or parsed.username is not None
            or parsed.password is not None
        ):
            raise ValueError
        if (
            parsed.query
            or parsed.fragment
            or "\\" in url
            or "%" in url
            or any(c.isspace() for c in url)
        ):
            raise ValueError
        if host.lower() == "localhost" or host.lower().endswith(
            (".local", ".localhost", ".internal")
        ):
            raise ValueError
        if parsed.path and any(p in {".", ".."} for p in parsed.path.split("/")):
            raise ValueError
        try:
            literal = ipaddress.ip_address(host)
        except ValueError:
            literal = None
        if literal is not None and not _public_address(host):
            raise ValueError
        resolved = (
            addresses
            if addresses is not None
            else [
                i[4][0]
                for i in socket.getaddrinfo(
                    host, parsed.port or 443, type=socket.SOCK_STREAM
                )
            ]
        )
        if not resolved or not all(_public_address(address) for address in resolved):
            raise ValueError
    except (ValueError, OSError) as exc:
        raise APIConnectionError(
            "Usa una URL HTTPS pública y accesible, sin credenciales ni parámetros."
        ) from exc
    return url.rstrip("/")


def model_check_fingerprint(
    *,
    provider_id: str,
    base_url: str,
    model_id: str,
    profile: dict[str, Any],
    capabilities: list[str],
    credential_revision: str,
) -> str:
    payload = {
        "provider": provider_id,
        "url": base_url.rstrip("/"),
        "model": model_id,
        "profile": profile,
        "capabilities": sorted(set(capabilities)),
        "credential_revision": credential_revision,
    }
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


class _PublicNetworkBackend:
    """Pin TCP to a checked public address; retain original Host and TLS SNI.

    httpx 0.28.1 is pinned by the project. Its httpcore pool accepts a network
    backend. Checking DNS only before a request would permit DNS rebinding.
    """

    def __init__(self, delegate):
        self._delegate = delegate

    async def connect_tcp(
        self, host, port, timeout=None, local_address=None, socket_options=None
    ):
        host_text = host.decode() if isinstance(host, bytes) else host
        records = await asyncio.to_thread(
            socket.getaddrinfo, host_text, port, 0, socket.SOCK_STREAM
        )
        addresses = list(dict.fromkeys(row[4][0] for row in records))
        if not addresses or not all(_public_address(address) for address in addresses):
            raise APIConnectionError("El destino de la API no es público.")
        # An explicit IP prevents the delegate from resolving the hostname again.
        return await self._delegate.connect_tcp(
            addresses[0],
            port,
            timeout=timeout,
            local_address=local_address,
            socket_options=socket_options,
        )

    async def connect_unix_socket(self, *args, **kwargs):
        raise APIConnectionError("El destino de la API no es válido.")

    async def sleep(self, seconds):
        return await self._delegate.sleep(seconds)


def public_api_transport() -> httpx.AsyncHTTPTransport:
    transport = httpx.AsyncHTTPTransport(retries=0)
    transport._pool._network_backend = _PublicNetworkBackend(
        transport._pool._network_backend
    )
    return transport


async def call_configured_api(
    selection: dict[str, Any],
    secret: str,
    messages: list[dict[str, Any]],
    *,
    max_tokens: int,
    json_mode: bool,
    temperature: float = 0.3,
    timeout: float | httpx.Timeout = 120,
    session_id: str | None = None,
    transport: httpx.AsyncBaseTransport | None = None,
) -> dict[str, Any]:
    from app.services.ai_api_transport import (
        ModelRuntimeProfile,
        build_api_request,
        normalize_api_response,
    )
    from app.services.opencode_request import new_opencode_session_id, opencode_headers

    if not secret:
        raise APIConnectionError("La conexión no tiene una credencial disponible.")
    connection = selection.get("connection") or {}
    base_url = await asyncio.to_thread(
        validate_api_base_url, str(connection.get("base_url") or "")
    )
    profile = ModelRuntimeProfile.model_validate(selection.get("runtime_profile") or {})
    endpoint, body = build_api_request(
        profile,
        str(selection["model"]),
        messages,
        max_tokens=max_tokens,
        json_mode=json_mode,
        temperature=temperature,
    )
    api_key_style = profile.auth_style == "api_key" or (
        profile.auth_style == "auto" and profile.protocol == "messages"
    )
    headers = opencode_headers(
        secret,
        session_id=session_id or new_opencode_session_id(),
        messages_api=api_key_style,
    )
    async with httpx.AsyncClient(
        timeout=timeout,
        transport=transport or public_api_transport(),
        follow_redirects=False,
        trust_env=False,
    ) as client:
        response = await client.post(
            f"{base_url}/{endpoint}", headers=headers, json=body
        )
        response.raise_for_status()
        if response.is_redirect:
            raise APIConnectionError(
                "La API intentó redirigir la solicitud; no se envió la clave a otro destino."
            )
        return normalize_api_response(profile.protocol, response.json())


async def create_compatible_connection(
    db,
    *,
    label: str,
    base_url: str,
    secret: str,
    actor_id,
    provider_id: str | None = None,
) -> dict[str, Any]:
    from app.services.ai_credentials_service import create_api_credential_revision

    base_url = await asyncio.to_thread(validate_api_base_url, base_url)
    identifier = provider_id or "api_" + uuid4().hex[:20]
    revision = await create_api_credential_revision(
        db, provider_id=identifier, base_url=base_url, secret=secret, actor_id=actor_id
    )
    await db.commit()
    return {
        "id": identifier,
        "name": identifier,
        "label": label.strip(),
        "tipo": "texto",
        "active": True,
        "base_url": base_url,
        "credential_revision": revision,
        "auth_configured": True,
        "model": None,
        "priority": 5,
        "timeout_seconds": 120,
        "max_retries": 1,
        "allow_teacher_credentials": False,
        "allow_institutional_fallback": True,
    }


def _probe_messages(vision: bool) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    if not vision:
        return [
            {
                "role": "user",
                "content": 'Prueba técnica. Devuelve solo JSON: {"ok":true}.',
            }
        ], {"ok": True}
    import base64
    from io import BytesIO
    import secrets
    from PIL import Image, ImageDraw, ImageFont

    number = str(100 + secrets.randbelow(900))
    canvas = Image.new("RGB", (280, 100), "white")
    ImageDraw.Draw(canvas).text(
        (25, 20), number, font=ImageFont.load_default(size=56), fill="black"
    )
    buffer = BytesIO()
    canvas.save(buffer, format="PNG")
    return [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": 'Lee el número de la imagen. Devuelve solo JSON con el número como texto: {"numero":"..."}.',
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "data:image/png;base64,"
                        + base64.b64encode(buffer.getvalue()).decode(),
                        "detail": "high",
                    },
                },
            ],
        }
    ], {"numero": number}


async def probe_compatible_model(
    db, *, provider: dict[str, Any], model: dict[str, Any], actor_id
) -> dict[str, Any]:
    from sqlalchemy import text
    from app.services.ai_api_transport import ModelRuntimeProfile
    from app.services.ai_config_service import AIConfigService
    from app.services.ai_credentials_service import (
        create_api_credential_revision,
        resolve_api_credential,
    )

    started = time.monotonic()
    try:
        if model.get("provider_id") != provider.get("id"):
            raise APIConnectionError("El modelo debe pertenecer a esta conexión.")
        capabilities = set(model.get("capabilities") or [])
        if not capabilities or not capabilities <= {"text", "vision"}:
            raise APIConnectionError(
                "Esta conexión admite modelos de texto o visión; imágenes y embeddings conservan sus adaptadores."
            )
        profile = ModelRuntimeProfile.model_validate(
            model.get("runtime_profile") or {}
        ).model_dump()
        url = await asyncio.to_thread(
            validate_api_base_url, str(provider.get("base_url") or "")
        )
        connection = {**provider, "base_url": url}
        if not provider.get("credential_revision"):
            saved = await AIConfigService(db=db).get_provider_config(
                str(provider["id"])
            )
            if str(saved.get("base_url") or "").rstrip("/") != url:
                raise APIConnectionError(
                    "Para cambiar el destino, crea una conexión y aporta su propia clave."
                )
        key = await resolve_api_credential(db, connection)
        if not key:
            raise APIConnectionError("Configura primero la clave de esta conexión.")
        if not connection.get("credential_revision"):
            connection["credential_revision"] = await create_api_credential_revision(
                db,
                provider_id=provider["id"],
                base_url=url,
                secret=key,
                actor_id=actor_id,
            )
        messages, expected = _probe_messages("vision" in capabilities)
        data = await call_configured_api(
            {
                "provider": provider["id"],
                "model": model["model_id"],
                "connection": connection,
                "runtime_profile": profile,
            },
            key,
            messages,
            max_tokens=512,
            json_mode=True,
            timeout=120,
        )
        content = json.loads(data["choices"][0]["message"]["content"])
        if content != expected:
            raise APIConnectionError(
                "La respuesta no superó la prueba solicitada; revisa el formato y las capacidades."
            )
        identifier = str(uuid4())
        fingerprint = model_check_fingerprint(
            provider_id=provider["id"],
            base_url=url,
            model_id=model["model_id"],
            profile=profile,
            capabilities=sorted(capabilities),
            credential_revision=str(connection["credential_revision"]),
        )
        await db.execute(
            text(
                "INSERT INTO ai_api_model_checks (id, provider_id, profile_hash, credential_revision, created_by) VALUES (:id, :provider, :hash, :revision, :actor)"
            ),
            {
                "id": identifier,
                "provider": provider["id"],
                "hash": fingerprint,
                "revision": connection["credential_revision"],
                "actor": str(actor_id),
            },
        )
        await db.commit()
        return {
            "status": "ok",
            "latency_ms": int((time.monotonic() - started) * 1000),
            "detail": "El modelo completó la prueba técnica. No es una validación de calidad de calificación.",
            "provider": {
                **provider,
                "credential_revision": str(connection["credential_revision"]),
                "auth_configured": True,
            },
            "model": {
                **model,
                "runtime_profile": profile,
                "verification_id": identifier,
            },
        }
    except Exception as exc:
        await db.rollback()
        return {
            "status": "error",
            "latency_ms": int((time.monotonic() - started) * 1000),
            "http_code": exc.response.status_code
            if isinstance(exc, httpx.HTTPStatusError)
            else None,
            "detail": str(exc)
            if isinstance(exc, APIConnectionError)
            else "El modelo no completó la prueba. Revisa clave, modelo, formato y disponibilidad; no se cambió la ruta publicada.",
        }


async def validate_compatible_publication(
    db, providers, models, features
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Verify server-owned proofs for affected routes, not browser status flags."""
    from sqlalchemy import text
    from app.services.ai_api_transport import ModelRuntimeProfile
    from app.services.ai_config_service import AIConfigService
    from app.services.ai_credentials_service import (
        get_effective_ai_credentials,
        resolve_api_credential,
    )

    service = AIConfigService(db=db)
    old_providers = {p["id"]: p for p in await service.get_all_providers()}
    old_models = {
        (m["provider_id"], m["model_id"]): m for m in await service.get_all_models()
    }
    old_features = {f["feature"]: f for f in await service.get_all_features()}
    feature_ids = [feature["feature"] for feature in features]
    if len(set(feature_ids)) != len(feature_ids):
        raise APIConnectionError(
            "Hay funciones duplicadas en el borrador; recarga la configuración."
        )
    removed_core = set(old_features) - set(feature_ids)
    if any(not feature.startswith("herramienta.") for feature in removed_core):
        raise APIConnectionError(
            "Conserva las funciones existentes; puedes cambiar su selección sin borrar sus rutas."
        )
    credentials = await get_effective_ai_credentials(db)
    actual = []
    for provider in providers:
        item = dict(provider)
        revision = provider.get("credential_revision")
        if revision:
            try:
                item["auth_configured"] = bool(
                    await resolve_api_credential(db, provider)
                )
            except ValueError:
                item["auth_configured"] = False
        else:
            item["auth_configured"] = (
                credentials.configured_for(provider["id"])
                or provider["id"] == "ollama_internal"
            )
        if provider["id"].startswith("api_") and (
            not revision
            or provider.get("tipo") != "texto"
            or provider.get("allow_teacher_credentials")
        ):
            raise APIConnectionError(
                "La conexión compatible requiere su propia clave institucional y solo admite texto o visión."
            )
        old = old_providers.get(provider["id"], {})
        if provider.get("base_url") != old.get("base_url"):
            await asyncio.to_thread(
                validate_api_base_url, str(provider.get("base_url") or "")
            )
            if not revision:
                raise APIConnectionError(
                    "Un destino nuevo necesita una conexión con su propia clave."
                )
        if old.get("credential_revision") and not revision:
            raise APIConnectionError(
                "No se puede quitar la revisión de una credencial publicada; prepara una nueva conexión o clave."
            )
        actual.append(item)
    provider_map = {p["id"]: p for p in actual}
    model_map = {(m["provider_id"], m["model_id"]): m for m in models}
    changed = []
    route_fields = (
        "primary_provider",
        "primary_model",
        "fallback_provider",
        "fallback_model",
        "capability",
        "active",
        "rollout_enabled",
    )
    provider_fields = ("base_url", "active", "model")
    for feature in features:
        if (feature.get("feature") == "calificacion.bordes" and feature.get("active") is False
                and not feature.get("primary_provider") and not feature.get("primary_model")
                and not feature.get("fallback_provider")):
            continue  # Unconfigured opt-in; cannot execute or bypass a proof.
        old = old_features.get(feature["feature"], {})
        affected = any(feature.get(k) != old.get(k) for k in route_fields)
        pairs = [
            (feature.get("primary_provider"), feature.get("primary_model")),
            (feature.get("fallback_provider"), feature.get("fallback_model")),
        ]
        for provider_id, model_id in pairs:
            provider = provider_map.get(provider_id, {})
            entry = model_map.get((provider_id, model_id or provider.get("model")), {})
            previous = old_models.get(
                (provider_id, model_id or provider.get("model")), {}
            )
            affected |= any(
                provider.get(k) != old_providers.get(provider_id, {}).get(k)
                for k in provider_fields
            )
            if entry.get("runtime_profile") or previous.get("runtime_profile"):
                affected |= provider.get("credential_revision") != old_providers.get(
                    provider_id, {}
                ).get("credential_revision")
            affected |= any(
                entry.get(k) != previous.get(k)
                for k in (
                    "runtime_profile",
                    "capabilities",
                    "active",
                    "verification_id",
                )
            )
        if not affected:
            continue
        changed.append(feature)
        profiled_route = any(
            model_map.get(
                (
                    provider_id,
                    model_id or provider_map.get(provider_id, {}).get("model"),
                ),
                {},
            ).get("runtime_profile")
            for provider_id, model_id in pairs
        )
        for slot, (provider_id, model_id) in zip(("primary", "fallback"), pairs):
            provider = provider_map.get(provider_id, {})
            entry = model_map.get((provider_id, model_id or provider.get("model")), {})
            profile = entry.get("runtime_profile")
            selection_label = "principal" if slot == "primary" else "de respaldo"
            field = f"features.{feature_ids.index(feature['feature'])}.{slot}_model"
            selection_changed = (provider_id, model_id) not in {
                (old.get("primary_provider"), old.get("primary_model")),
                (old.get("fallback_provider"), old.get("fallback_model")),
            }
            if (
                selection_changed
                and provider_id
                and provider_id not in {"ollama", "template"}
                and feature.get("capability") in {"text", "vision"}
                and not profile
            ):
                raise APIConnectionError(
                    f"Comprueba el modelo {selection_label} «{entry.get('label') or model_id}» de «{feature.get('label') or feature['feature']}» desde Comprobar modelo antes de guardar.", field=field,
                )
            if (
                profiled_route
                and provider_id
                and provider_id != "template"
                and not profile
            ):
                raise APIConnectionError(
                    f"El modelo {selection_label} «{entry.get('label') or model_id}» de «{feature.get('label') or feature['feature']}» aún no es compatible con esta selección. Compruébalo desde la función, elige un respaldo comprobado o selecciona Sin respaldo.", field=field,
                )
            if provider_id and str(provider_id).startswith("api_") and not profile:
                raise APIConnectionError(
                    "Configura y prueba el formato del modelo de la conexión nueva."
                )
            prior_model = old_models.get(
                (provider_id, model_id or provider.get("model")), {}
            )
            if prior_model.get("runtime_profile") and not profile:
                raise APIConnectionError(
                    "No se puede quitar el formato comprobado de un modelo en uso."
                )
            if not profile:
                continue
            normalized_profile = ModelRuntimeProfile.model_validate(
                profile
            ).model_dump()
            fingerprint = model_check_fingerprint(
                provider_id=provider_id,
                base_url=str(provider.get("base_url") or ""),
                model_id=str(entry.get("model_id") or ""),
                profile=normalized_profile,
                capabilities=list(entry.get("capabilities") or []),
                credential_revision=str(provider.get("credential_revision") or ""),
            )
            check = await db.scalar(
                text(
                    "SELECT EXISTS(SELECT 1 FROM ai_api_model_checks WHERE id=:id AND provider_id=:provider AND profile_hash=:hash)"
                ),
                {
                    "id": entry.get("verification_id"),
                    "provider": provider_id,
                    "hash": fingerprint,
                },
            )
            if not check:
                raise APIConnectionError(
                    f"Vuelve a comprobar el modelo {selection_label} «{entry.get('label') or model_id}» de «{feature.get('label') or feature['feature']}» antes de guardar.", field=field,
                )
    return actual, changed
