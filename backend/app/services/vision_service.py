"""Vision Router: multimodal principal → fallback → OCR auxiliar."""
from __future__ import annotations

import base64
import time
from pathlib import Path
from typing import Any

import httpx
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ai_credentials_service import get_effective_ai_credentials

logger = get_logger(__name__)

VISION_SYSTEM_PROMPT = (
    "Eres un asistente que interpreta imágenes de respuestas de estudiantes. "
    "Extrae el texto escrito, identifica preguntas y respuestas, y evalúa la calidad de imagen. "
    "Responde siempre en JSON válido con los campos indicados."
)

VISION_JSON_SCHEMA = """{
  "text_or_visual_content": "contenido interpretado",
  "detected_questions": [],
  "detected_answers": [],
  "image_quality": {
    "is_usable": true,
    "blur": "low|medium|high",
    "lighting": "good|poor",
    "cropping": "complete|partial|cut"
  },
  "warnings": [],
  "confidence": 0.0
}"""


def _openai_client(api_key: str) -> AsyncOpenAI:
    return AsyncOpenAI(api_key=api_key)


def _image_to_b64(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode()


async def interpret_image(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    context_hint: str = "",
) -> dict[str, Any]:
    """
    Interpreta una imagen con cascada:
      1. OpenAI GPT-4o-mini vision
      2. Groq llama-4-scout (vision)
      3. Fallback con aviso de revisión docente
    """
    prompt = (
        f"Analiza esta imagen de una respuesta de estudiante.\n"
        f"{f'Contexto: {context_hint}' if context_hint else ''}\n"
        f"Devuelve JSON con este esquema:\n{VISION_JSON_SCHEMA}"
    )

    providers = [
        ("openai_vision", _call_openai_vision),
        ("groq_vision", _call_groq_vision),
    ]

    for provider_name, fn in providers:
        try:
            start = time.monotonic()
            result = await fn(image_bytes, mime_type, prompt)
            ms = int((time.monotonic() - start) * 1000)
            logger.info("Vision ok via %s (%dms)", provider_name, ms)
            return result
        except Exception as exc:  # noqa: BLE001
            logger.warning("Vision provider %s failed: %s", provider_name, exc)

    return _fallback_vision_result()


async def _call_openai_vision(
    image_bytes: bytes,
    mime_type: str,
    prompt: str,
) -> dict[str, Any]:
    credentials = await get_effective_ai_credentials()
    if not credentials.openai_key:
        raise ValueError("OPENAI_API_KEY not set")

    b64 = _image_to_b64(image_bytes)
    client = _openai_client(credentials.openai_key)
    resp = await client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": VISION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{b64}"},
                    },
                ],
            },
        ],
        max_tokens=1500,
        timeout=45,
    )
    import json
    return json.loads(resp.choices[0].message.content or "{}")


async def _call_groq_vision(
    image_bytes: bytes,
    mime_type: str,
    prompt: str,
) -> dict[str, Any]:
    credentials = await get_effective_ai_credentials()
    if not credentials.groq_key:
        raise ValueError("GROQ_API_KEY not set")

    b64 = _image_to_b64(image_bytes)
    model = getattr(settings, "OCR_GROQ_FALLBACK_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

    import json
    from groq import AsyncGroq
    client = AsyncGroq(api_key=credentials.groq_key)
    resp = await client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{b64}"},
                    },
                ],
            }
        ],
        response_format={"type": "json_object"},
        max_tokens=1500,
        timeout=30,
    )
    return json.loads(resp.choices[0].message.content or "{}")


def _fallback_vision_result() -> dict[str, Any]:
    return {
        "text_or_visual_content": "",
        "detected_questions": [],
        "detected_answers": [],
        "image_quality": {
            "is_usable": False,
            "blur": "unknown",
            "lighting": "unknown",
            "cropping": "unknown",
        },
        "warnings": ["No se pudo interpretar la imagen con ningún proveedor de visión."],
        "confidence": 0.0,
        "requiere_revision_docente": True,
    }
