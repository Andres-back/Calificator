from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from app.shared.enums import UserRole

MAX_METADATA_KEYS = 10
MAX_METADATA_BYTES = 4096
MAX_STRING_LENGTH = 256

SURFACES = {
    "inicio",
    "materias",
    "actividades",
    "resultados",
    "xali",
    "calificaciones",
    "presentaciones",
}
FORBIDDEN_METADATA_KEYS = {
    "actor",
    "actor_id",
    "user",
    "user_id",
    "usuario",
    "usuario_id",
    "role",
    "rol",
    "email",
    "correo",
    "password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "respuesta",
    "respuestas",
    "retroalimentacion",
    "evidencia",
}


@dataclass(frozen=True, slots=True)
class EventPolicy:
    roles: frozenset[str]
    references: frozenset[str] = frozenset()
    metadata_keys: frozenset[str] = frozenset()
    required_metadata: frozenset[str] = frozenset()


@dataclass(frozen=True, slots=True)
class ValidatedAnalyticsEvent:
    tipo: str
    evaluacion_id: UUID | None
    calificacion_id: UUID | None
    metadata_json: dict[str, str | int | float | bool | None]


class AnalyticsValidationError(ValueError):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


ALL_ROLES = frozenset(role.value for role in UserRole)
TEACHER_ROLES = frozenset({UserRole.PROFESOR.value, UserRole.ADMIN.value})

EVENT_POLICIES: dict[str, EventPolicy] = {
    "session_view_opened": EventPolicy(
        roles=ALL_ROLES,
        metadata_keys=frozenset({"surface"}),
        required_metadata=frozenset({"surface"}),
    ),
    "workspace_opened": EventPolicy(
        roles=TEACHER_ROLES,
        references=frozenset({"evaluacion_id"}),
        metadata_keys=frozenset({"materia_id"}),
        required_metadata=frozenset({"materia_id"}),
    ),
    "calificacion_opened": EventPolicy(
        roles=TEACHER_ROLES,
        references=frozenset({"evaluacion_id", "calificacion_id"}),
    ),
    "calificacion_confirmed": EventPolicy(roles=TEACHER_ROLES, references=frozenset({"evaluacion_id"})),
    "grade_adjusted": EventPolicy(roles=TEACHER_ROLES, references=frozenset({"evaluacion_id"})),
    "grade_marked_manual_review": EventPolicy(roles=TEACHER_ROLES, references=frozenset({"evaluacion_id"})),
    "calificacion_published": EventPolicy(roles=TEACHER_ROLES, references=frozenset({"evaluacion_id"})),
    "batch_confirmed": EventPolicy(
        roles=TEACHER_ROLES,
        references=frozenset({"evaluacion_id"}),
        metadata_keys=frozenset({"batch_size"}),
        required_metadata=frozenset({"batch_size"}),
    ),
    "batch_adjusted": EventPolicy(
        roles=TEACHER_ROLES,
        references=frozenset({"evaluacion_id"}),
        metadata_keys=frozenset({"batch_size"}),
        required_metadata=frozenset({"batch_size"}),
    ),
    "batch_published": EventPolicy(
        roles=TEACHER_ROLES,
        references=frozenset({"evaluacion_id"}),
        metadata_keys=frozenset({"batch_size"}),
        required_metadata=frozenset({"batch_size"}),
    ),
}


def _validate_references(
    policy: EventPolicy,
    evaluacion_id: UUID | None,
    calificacion_id: UUID | None,
) -> None:
    supplied = {
        key
        for key, value in {
            "evaluacion_id": evaluacion_id,
            "calificacion_id": calificacion_id,
        }.items()
        if value is not None
    }
    missing = policy.references - supplied
    unexpected = supplied - policy.references
    if missing:
        raise AnalyticsValidationError(422, f"Faltan referencias requeridas: {', '.join(sorted(missing))}")
    if unexpected:
        raise AnalyticsValidationError(422, f"Referencias no permitidas: {', '.join(sorted(unexpected))}")


def _validate_metadata(
    policy: EventPolicy,
    metadata_json: object,
) -> dict[str, str | int | float | bool | None]:
    if not isinstance(metadata_json, dict):
        raise AnalyticsValidationError(422, "metadata_json debe ser un objeto")
    if len(metadata_json) > MAX_METADATA_KEYS:
        raise AnalyticsValidationError(422, "metadata_json admite máximo 10 claves")
    if any(not isinstance(key, str) for key in metadata_json):
        raise AnalyticsValidationError(422, "Las claves de metadata_json deben ser texto")

    keys = set(metadata_json)
    forbidden = {key for key in keys if key.lower() in FORBIDDEN_METADATA_KEYS}
    if forbidden:
        raise AnalyticsValidationError(422, "metadata_json contiene claves sensibles no permitidas")
    unexpected = keys - policy.metadata_keys
    if unexpected:
        raise AnalyticsValidationError(422, f"Claves de metadata no permitidas: {', '.join(sorted(unexpected))}")
    missing = policy.required_metadata - keys
    if missing:
        raise AnalyticsValidationError(422, f"Faltan metadatos requeridos: {', '.join(sorted(missing))}")

    normalized: dict[str, str | int | float | bool | None] = {}
    for key, value in metadata_json.items():
        if not isinstance(value, (str, int, float, bool)) and value is not None:
            raise AnalyticsValidationError(422, "metadata_json solo admite valores escalares")
        if isinstance(value, str) and len(value) > MAX_STRING_LENGTH:
            raise AnalyticsValidationError(422, "Las cadenas de metadata_json admiten máximo 256 caracteres")
        normalized[key] = value

    if "surface" in normalized and normalized["surface"] not in SURFACES:
        raise AnalyticsValidationError(422, "surface no pertenece al catálogo permitido")
    if "batch_size" in normalized:
        batch_size = normalized["batch_size"]
        if isinstance(batch_size, bool) or not isinstance(batch_size, int) or not 1 <= batch_size <= 500:
            raise AnalyticsValidationError(422, "batch_size debe ser un entero entre 1 y 500")
    if "materia_id" in normalized:
        try:
            normalized["materia_id"] = str(UUID(str(normalized["materia_id"])))
        except (TypeError, ValueError, AttributeError) as exc:
            raise AnalyticsValidationError(422, "materia_id debe ser un UUID válido") from exc

    encoded = json.dumps(normalized, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if len(encoded) > MAX_METADATA_BYTES:
        raise AnalyticsValidationError(422, "metadata_json no puede exceder 4096 bytes")
    return normalized


def validate_event_payload(
    *,
    tipo: str,
    role: str,
    evaluacion_id: UUID | None,
    calificacion_id: UUID | None,
    metadata_json: object,
) -> ValidatedAnalyticsEvent:
    policy = EVENT_POLICIES.get(tipo)
    if policy is None:
        raise AnalyticsValidationError(422, "Evento analítico desconocido")
    if role not in policy.roles:
        raise AnalyticsValidationError(403, "Evento no permitido para este rol")
    _validate_references(policy, evaluacion_id, calificacion_id)
    metadata = _validate_metadata(policy, metadata_json)
    return ValidatedAnalyticsEvent(
        tipo=tipo,
        evaluacion_id=evaluacion_id,
        calificacion_id=calificacion_id,
        metadata_json=metadata,
    )
