"""Image Router: OpenAI gpt-image-2 → Cloudflare SDXL Lightning → placeholder."""
from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ai_credentials_service import get_effective_ai_credentials
from app.shared.enums import ImageProvider

logger = get_logger(__name__)

# Tipos de imagen que van a OpenAI (calidad premium)
OPENAI_IMAGE_TYPES = {"para_colorear", "portada_premium", "diagrama", "educativa_profesional"}
# Tipos que van a Cloudflare (volumen, borradores)
CLOUDFLARE_IMAGE_TYPES = {"fondo", "borrador", "simple", "anatomia"}


@dataclass
class GeneratedImage:
    url: str | None = None
    b64_data: str | None = None
    provider: str = ""
    prompt_used: str = ""
    is_placeholder: bool = False


def _openai_client(api_key: str) -> AsyncOpenAI:
    return AsyncOpenAI(api_key=api_key)


# Palabras que sugieren contenido apto para gpt-image LOW (precisión: texto,
# diagramas, esquemas, portadas) vs Cloudflare SDXL (ilustraciones/escenas).
# OJO: "ciclo"/"proceso" quedan fuera a propósito — son parte frecuente del
# NOMBRE del tema (p. ej. "el ciclo del agua") y casi siempre aparecen en el
# prompt de imagen sin importar si la imagen es un diagrama o una escena;
# incluirlos sesgaba casi todo a OpenAI. Solo términos que describen ESTILO
# visual explícito de diagrama/esquema cuentan aquí.
_OPENAI_HINT_TERMS = (
    "diagrama", "esquema", "mapa conceptual", "grafico", "gráfico", "tabla",
    "linea de tiempo", "línea de tiempo", "portada", "concepto",
    "infografia", "infografía", "estructura", "partes de", "rotulado", "etiquetado",
)
_CLOUDFLARE_HINT_TERMS = (
    "paisaje", "escena", "ilustracion", "ilustración", "dibujo", "animal", "naturaleza",
    "personaje", "fondo", "ambiente", "realista", "fotografia", "fotografía", "cuento",
)


def decide_provider(image_type: str) -> ImageProvider:
    if image_type in OPENAI_IMAGE_TYPES:
        return ImageProvider.OPENAI
    if image_type in CLOUDFLARE_IMAGE_TYPES:
        return ImageProvider.CLOUDFLARE
    return ImageProvider.CLOUDFLARE  # default


def classify_image_provider(text: str, *, strategy: str = "mixto") -> ImageProvider:
    """Elige proveedor por contenido y estrategia global.

    strategy: 'economico' (todo Cloudflare), 'premium' (todo OpenAI low),
    'mixto' (por contenido: diagramas/texto/portadas -> OpenAI low; escenas -> Cloudflare).
    """
    if strategy == "economico":
        return ImageProvider.CLOUDFLARE
    if strategy == "premium":
        return ImageProvider.OPENAI
    low = (text or "").lower()
    if any(term in low for term in _CLOUDFLARE_HINT_TERMS):
        return ImageProvider.CLOUDFLARE
    if any(term in low for term in _OPENAI_HINT_TERMS):
        return ImageProvider.OPENAI
    return ImageProvider.CLOUDFLARE  # default barato


async def generate_image(
    prompt: str,
    image_type: str = "simple",
    size: str = "1024x1024",
    *,
    provider: ImageProvider | str | None = None,
    strict_provider: bool = False,
    admin_config: dict | None = None,
    db: AsyncSession | None = None,
    teacher_id: UUID | None = None,
    ai_config: dict[str, Any] | None = None,
) -> GeneratedImage:
    """Generate an image using the captured route when rollout is enabled."""
    model = (admin_config or {}).get("model")
    quality = (admin_config or {}).get(
        "quality", settings.OPENAI_IMAGE_QUALITY
    )
    snapshot = dict(ai_config) if ai_config else None
    personal_api_key: str | None = None
    captured_fallback: dict[str, Any] | None = None
    personal_without_fallback = False

    if db is not None and (teacher_id is not None or snapshot):
        try:
            from app.services.ai_configuration_resolver import (
                resolve_ai_configuration,
            )
            from app.services.ai_credentials_service import (
                get_teacher_ai_credential,
            )

            if snapshot is None:
                snapshot = await resolve_ai_configuration(
                    db,
                    feature="generacion_imagenes",
                    teacher_id=teacher_id,
                )
            if snapshot.get("rollout_enabled"):
                selected = snapshot.get("primary") or {}
                selected_provider = str(selected.get("provider") or "")
                if selected_provider == "openai_image":
                    provider = ImageProvider.OPENAI
                elif selected_provider == "cloudflare_image":
                    provider = ImageProvider.CLOUDFLARE
                model = selected.get("model") or model
                captured_fallback = snapshot.get("fallback") or None
                if (
                    selected.get("credential_source") == "teacher"
                    and selected_provider == "openai_image"
                ):
                    personal_api_key = (
                        await get_teacher_ai_credential(
                            db,
                            teacher_id=teacher_id,
                            provider_id="openai_image",
                        )
                        if teacher_id is not None
                        else ""
                    )
                    personal_without_fallback = not bool(captured_fallback)
        except Exception as exc:
            logger.warning(
                "Image AI configuration unavailable; using existing route: %s",
                type(exc).__name__,
            )

    if provider is not None:
        chosen = ImageProvider(provider) if isinstance(provider, str) else provider
    else:
        chosen = decide_provider(image_type)

    async def captured_fallback_image() -> GeneratedImage | None:
        if not captured_fallback:
            return None
        fallback_provider = str(captured_fallback.get("provider") or "")
        fallback_model = captured_fallback.get("model")
        if fallback_provider == "openai_image":
            return await _call_openai_custom(
                prompt,
                size,
                model=fallback_model,
                quality=quality,
            )
        if fallback_provider == "cloudflare_image":
            return await _call_cloudflare(prompt)
        return None

    if chosen == ImageProvider.OPENAI:
        try:
            return await _call_openai_custom(
                prompt,
                size,
                model=model,
                quality=quality,
                api_key=personal_api_key,
            )
        except Exception as exc:
            if personal_without_fallback:
                raise RuntimeError(
                    "La API personal de imágenes falló y no hay fallback autorizado"
                ) from exc
            try:
                fallback_result = await captured_fallback_image()
                if fallback_result is not None:
                    return fallback_result
            except Exception as fallback_exc:
                logger.warning("Captured image fallback failed: %s", fallback_exc)
            if strict_provider:
                logger.warning("OpenAI image failed (%s), using placeholder", exc)
                return _placeholder(prompt)
            logger.warning("OpenAI image failed (%s), trying Cloudflare", exc)

    try:
        return await _call_cloudflare(prompt)
    except Exception as exc:
        try:
            fallback_result = await captured_fallback_image()
            if fallback_result is not None:
                return fallback_result
        except Exception as fallback_exc:
            logger.warning("Captured image fallback failed: %s", fallback_exc)
        logger.warning("Cloudflare image failed (%s), using placeholder", exc)

    return _placeholder(prompt)

async def _call_openai_custom(
    prompt: str,
    size: str,
    *,
    model: str | None = None,
    quality: str | None = None,
    api_key: str | None = None,
) -> GeneratedImage:
    credentials = await get_effective_ai_credentials()
    resolved_key = api_key if api_key is not None else credentials.openai_key
    if not resolved_key:
        raise ValueError("OPENAI_API_KEY not set")
    client = _openai_client(resolved_key)
    model_name = model or getattr(settings, "OPENAI_IMAGE_MODEL", "gpt-image-1")
    kwargs: dict[str, Any] = {"model": model_name, "prompt": prompt, "size": size, "n": 1}
    if str(model_name).startswith("gpt-image"):
        kwargs["quality"] = quality or getattr(settings, "OPENAI_IMAGE_QUALITY", "low")
    else:
        kwargs["response_format"] = "b64_json"
    resp = await client.images.generate(**kwargs)  # type: ignore[arg-type]
    b64 = resp.data[0].b64_json or ""
    return GeneratedImage(b64_data=b64, provider="openai", prompt_used=prompt)


async def _call_openai(prompt: str, size: str) -> GeneratedImage:
    return await _call_openai_custom(prompt, size)


async def _call_cloudflare(prompt: str) -> GeneratedImage:
    credentials = await get_effective_ai_credentials()
    account_id = credentials.cloudflare_account_id
    api_token = credentials.cloudflare_token
    model = getattr(settings, "CLOUDFLARE_IMAGE_MODEL", "@cf/bytedance/stable-diffusion-xl-lightning")

    if not account_id or not api_token:
        raise ValueError("Cloudflare credentials not set")

    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"
    headers = {"Authorization": f"Bearer {api_token}"}
    payload = {"prompt": prompt}

    timeout = getattr(settings, "CLOUDFLARE_TIMEOUT_SECONDS", 45)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        # Response is raw image bytes
        b64 = base64.b64encode(resp.content).decode()
        return GeneratedImage(
            b64_data=b64,
            provider="cloudflare",
            prompt_used=prompt,
        )


def _placeholder(prompt: str) -> GeneratedImage:
    return GeneratedImage(
        url="/static/placeholder_educational.svg",
        provider="placeholder",
        prompt_used=prompt,
        is_placeholder=True,
    )
