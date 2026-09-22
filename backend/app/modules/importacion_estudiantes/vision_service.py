from __future__ import annotations

import json
import re
from typing import Any
from uuid import UUID

from app.modules.calificaciones.agents import OpenCodeClient
from app.services.ai_credentials_service import get_effective_ai_credentials, get_teacher_ai_credential
from app.services.image_preprocessing import prepare_orientation_variants

ROSTER_PROMPT = """Eres un extractor de listas escolares. Analiza la fotografía y devuelve SOLO JSON.
No inventes estudiantes. Ignora títulos, fecha, grado, docente, asignatura, números de documento,
columnas de asistencia, firmas, marcas X, presente/ausente y filas vacías. Conserva tildes y apellidos.
Si una fila es dudosa, inclúyela con confianza baja y requiere_revision=true para que el docente la corrija.
Formato exacto:
{
  "estudiantes": [
    {"nombre": "Nombre y apellidos", "confianza": 0.0, "requiere_revision": true, "advertencias": []}
  ],
  "advertencias": []
}
Máximo 100 estudiantes. No devuelvas correos, documentos, contraseñas ni explicaciones fuera del JSON."""


def _json_payload(response: dict[str, Any]) -> dict[str, Any]:
    content = (((response.get("choices") or [{}])[0].get("message") or {}).get("content"))
    if isinstance(content, list):
        content = "".join(str(item.get("text") or "") for item in content if isinstance(item, dict))
    raw = str(content or "").strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.IGNORECASE)
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError("La respuesta visual no contiene un objeto JSON")
    return parsed


def normalize_candidates(payload: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for item in payload.get("estudiantes") or []:
        if not isinstance(item, dict):
            continue
        name = " ".join(str(item.get("nombre") or "").split()).strip(" -.,;:")
        if len(name) < 2 or len(name) > 160 or not any(char.isalpha() for char in name):
            continue
        try:
            confidence = max(0.0, min(1.0, float(item.get("confianza", 0))))
        except (TypeError, ValueError):
            confidence = 0.0
        warnings = [str(value)[:160] for value in (item.get("advertencias") or []) if str(value).strip()]
        result.append({
            "nombre": name,
            "confianza": confidence,
            "requiere_revision": bool(item.get("requiere_revision")) or confidence < 0.78,
            "advertencias": warnings,
        })
        if len(result) >= 100:
            break
    return result


async def extract_student_names(
    *, image_bytes: bytes, mime: str, teacher_id: UUID, ai_config: dict[str, Any], db
) -> list[dict[str, Any]]:
    snapshot = dict(ai_config or {})
    selected = snapshot.get("primary") or {}
    if str(selected.get("provider") or "open_code") != "open_code":
        raise ValueError("La importación de listas requiere la ruta visual OpenCode")
    model = str(selected.get("model") or "deepseek-v4-flash-vision-exp")
    client = OpenCodeClient(tracking={"teacher_id": str(teacher_id), "_ai_config": snapshot})
    credentials = await get_effective_ai_credentials(db)
    client.api_key = credentials.open_code_key
    if selected.get("credential_source") == "teacher":
        personal = await get_teacher_ai_credential(db, teacher_id=teacher_id, provider_id="open_code")
        if personal:
            client.api_key = personal
            fallback = snapshot.get("fallback") or {}
            if fallback.get("provider") == "open_code" and fallback.get("credential_source") == "institutional":
                client.fallback_api_key = credentials.open_code_key
    try:
        last_error: Exception | None = None
        for variant in prepare_orientation_variants(image_bytes, mime)[:2]:
            try:
                response = await client.chat_multimodal(
                    model=model,
                    text=ROSTER_PROMPT,
                    image_bytes=variant.data,
                    image_mime=variant.mime,
                    max_tokens=1800,
                    temperature=0,
                    max_attempts=2,
                    stage="roster_extraction",
                )
                candidates = normalize_candidates(_json_payload(response))
                if candidates:
                    return candidates
            except Exception as exc:  # noqa: BLE001
                last_error = exc
        if last_error:
            raise last_error
        raise ValueError("No se detectaron nombres en la fotografía")
    finally:
        await client.close()
