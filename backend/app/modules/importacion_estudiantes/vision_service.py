from __future__ import annotations

import json
import re
from typing import Any
from uuid import UUID

from app.modules.calificaciones.agents import OpenCodeClient
from app.services.ai_api_transport import APIOutputError
from app.services.ai_credentials_service import get_effective_ai_credentials, get_teacher_ai_credential, resolve_api_credential
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


ERROR_MESSAGES = {
    "service_unavailable": "El servicio de lectura no está disponible en este momento. Intenta más tarde o avisa al administrador.",
    "invalid_response": "La lectura no se completó correctamente. Intenta de nuevo; si continúa, avisa al administrador.",
    "no_names": "No encontramos nombres en la foto. Prueba con buena luz y toda la lista visible.",
}


class RosterExtractionError(RuntimeError):
    def __init__(self, code: str):
        self.code = code if code in ERROR_MESSAGES else "service_unavailable"
        super().__init__(self.code)


def roster_error_result(exc: Exception) -> dict[str, str]:
    code = exc.code if isinstance(exc, RosterExtractionError) else "service_unavailable"
    return {"codigo": code, "mensaje": ERROR_MESSAGES[code]}


def _json_payload(response: dict[str, Any]) -> dict[str, Any]:
    content = (((response.get("choices") or [{}])[0].get("message") or {}).get("content"))
    if isinstance(content, list):
        content = "".join(str(item.get("text") or "") for item in content if isinstance(item, dict))
    raw = str(content or "").strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.IGNORECASE)
    parsed = json.loads(raw)
    if not isinstance(parsed, dict) or not isinstance(parsed.get("estudiantes"), list):
        raise ValueError("invalid_roster_response")
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
    model = str(selected.get("model") or "").strip()
    if not model or (selected.get("provider") != "open_code" and not selected.get("runtime_profile")):
        raise RosterExtractionError("service_unavailable")
    client = OpenCodeClient(tracking={"teacher_id": str(teacher_id), "_ai_config": snapshot})
    try:
        if selected.get("runtime_profile"):
            client._configured_secrets = {}
            for candidate in (selected, snapshot.get("fallback") or {}):
                if not candidate:
                    continue
                if not candidate.get("runtime_profile") or "vision" not in candidate.get("capabilities", []):
                    raise RosterExtractionError("service_unavailable")
                connection = candidate.get("connection") or {}
                if candidate.get("credential_source") == "teacher":
                    secret = await get_teacher_ai_credential(db, teacher_id=teacher_id, provider_id=str(candidate["provider"]))
                else:
                    secret = await resolve_api_credential(db, connection)
                binding = str(connection.get("credential_revision") or candidate.get("provider"))
                if not secret or (binding in client._configured_secrets and client._configured_secrets[binding] != secret):
                    raise RosterExtractionError("service_unavailable")
                client._configured_secrets[binding] = secret
        else:
            credentials = await get_effective_ai_credentials(db)
            client.api_key = credentials.open_code_key
            if selected.get("credential_source") == "teacher":
                personal = await get_teacher_ai_credential(db, teacher_id=teacher_id, provider_id="open_code")
                if not personal:
                    raise RosterExtractionError("service_unavailable")
                client.api_key = personal
                fallback = snapshot.get("fallback") or {}
                if fallback.get("provider") == "open_code" and fallback.get("credential_source") == "institutional":
                    client.fallback_api_key = credentials.open_code_key
        invalid_response = False
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
            except APIOutputError as exc:
                raise RosterExtractionError("invalid_response") from exc
            except Exception as exc:  # noqa: BLE001
                # Rotation cannot repair a rejected model, connection or credential.
                raise RosterExtractionError("service_unavailable") from exc
            try:
                candidates = normalize_candidates(_json_payload(response))
            except (ValueError, TypeError, AttributeError):
                invalid_response = True
                continue
            if candidates:
                return candidates
        raise RosterExtractionError("invalid_response" if invalid_response else "no_names")
    except RosterExtractionError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise RosterExtractionError("service_unavailable") from exc
    finally:
        await client.close()
