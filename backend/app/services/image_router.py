"""Image Router: OpenAI gpt-image-2 → Cloudflare SDXL Lightning → placeholder."""
from __future__ import annotations

import base64
import time
from dataclasses import dataclass
from typing import Any

import httpx
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
) -> GeneratedImage:
    """Generate an image. If admin_config is provided, it overrides defaults."""
    model = None
    quality = None
    if admin_config:
        model = admin_config.get("model")
        quality = admin_config.get("quality", settings.OPENAI_IMAGE_QUALITY)

    if provider is not None:
        chosen = ImageProvider(provider) if isinstance(provider, str) else provider
    else:
        chosen = decide_provider(image_type)

    if chosen == ImageProvider.OPENAI:
        try:
            if model or quality:
                return await _call_openai_custom(prompt, size, model=model, quality=quality)
            return await _call_openai(prompt, size)
        except Exception as exc:
            if strict_provider:
                logger.warning("OpenAI image failed (%s), using placeholder", exc)
                return _placeholder(prompt)
            logger.warning("OpenAI image failed (%s), trying Cloudflare", exc)

    try:
        return await _call_cloudflare(prompt)
    except Exception as exc:
        logger.warning("Cloudflare image failed (%s), using placeholder", exc)

    return _placeholder(prompt)


async def _call_openai_custom(prompt: str, size: str, *, model: str | None = None, quality: str | None = None) -> GeneratedImage:
    credentials = await get_effective_ai_credentials()
    if not credentials.openai_key:
        raise ValueError("OPENAI_API_KEY not set")
    client = _openai_client(credentials.openai_key)
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
    credentials = await get_effective_ai_credentials()
    if not credentials.openai_key:
        raise ValueError("OPENAI_API_KEY not set")

    client = _openai_client(credentials.openai_key)
    model = getattr(settings, "OPENAI_IMAGE_MODEL", "gpt-image-1")
    kwargs: dict[str, Any] = {"model": model, "prompt": prompt, "size": size, "n": 1}
    if str(model).startswith("gpt-image"):
        # gpt-image-1: 'quality' low|medium|high|auto; NO acepta response_format
        # (siempre devuelve b64_json). DALL-E sí lo necesita.
        kwargs["quality"] = getattr(settings, "OPENAI_IMAGE_QUALITY", "low")
    else:
        kwargs["response_format"] = "b64_json"
    resp = await client.images.generate(**kwargs)  # type: ignore[arg-type]
    b64 = resp.data[0].b64_json or ""
    return GeneratedImage(
        b64_data=b64,
        provider="openai",
        prompt_used=prompt,
    )


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
