"""Reglas puras de autorización, activación, digest y exportación del estudio."""
from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException, status

from app.modules.impacto_tesis.models import ImpactStudy
from app.modules.impacto_tesis.kappa_service import cohen_kappa
from app.modules.impacto_tesis.schemas import ObservationWrite, StudyProtocol
from app.modules.users.models import User
from app.shared.enums import UserRole

ACTIONS = frozenset({"read", "manage", "export"})
MAX_IMPORT_BYTES = 5 * 1024 * 1024


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def pseudonym() -> str:
    return f"doc-{secrets.token_hex(6)}"


def create_owner_grants(owner_id: UUID) -> list[dict]:
    return [{
        "kind": "grant",
        "grant_id": str(uuid4()),
        "user_id": str(owner_id),
        "actions": sorted(ACTIONS),
        "scope": "synthetic",
        "granted_by": str(owner_id),
        "granted_at": now_utc().isoformat(),
        "valid_until": None,
    }]


def batch_size_bytes(payload: Any) -> int:
    """Mide el contrato serializado sin registrar su contenido."""
    serializable = payload.model_dump(mode="json") if hasattr(payload, "model_dump") else payload
    return len(json.dumps(serializable, ensure_ascii=False).encode("utf-8"))


def require_batch_size(payload: Any) -> None:
    if batch_size_bytes(payload) > MAX_IMPORT_BYTES:
        raise HTTPException(status_code=413, detail="El lote supera 5 MiB")


def valid_grant_target(user: User | None) -> bool:
    return bool(
        user is not None
        and user.rol == UserRole.ADMIN.value
        and user.estado == "activo"
    )


def participant_pseudonym(study: ImpactStudy, user_id: UUID) -> str | None:
    for participant in study.participants_json or []:
        if str(participant.get("user_id")) == str(user_id):
            value = participant.get("pseudonym")
            return str(value) if value else None
    return None


def has_grant(study: ImpactStudy, user_id: UUID, action: str, *, real_data: bool | None = None) -> bool:
    if action not in ACTIONS:
        return False
    entries = list(study.access_grants_json or [])
    revoked = {str(item.get("grant_id")) for item in entries if item.get("kind") == "revocation"}
    now = now_utc()
    for item in entries:
        if item.get("kind") != "grant" or str(item.get("grant_id")) in revoked:
            continue
        if str(item.get("user_id")) != str(user_id) or action not in set(item.get("actions") or []):
            continue
        if real_data is True and item.get("scope") != "real":
            continue
        valid_until = item.get("valid_until")
        if valid_until:
            try:
                if datetime.fromisoformat(str(valid_until)).replace(tzinfo=None) <= now:
                    continue
            except ValueError:
                continue
        return True
    return False


def require_study_grant(study: ImpactStudy, user: User, action: str) -> None:
    if user.rol != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El estudio requiere perfil administrador")
    real = not bool(study.synthetic_only)
    if not has_grant(study, user.id, action, real_data=real):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes una concesión vigente para esta acción")


def activation_missing(study: ImpactStudy, *, real_data: bool, authorization_reference: str | None, retention_days: int | None) -> list[str]:
    protocol = StudyProtocol.model_validate(study.protocol_json or {})
    missing: list[str] = []
    required = {
        "unidad_analisis": protocol.unidad_analisis,
        "materias": protocol.materias,
        "grados": protocol.grados,
        "condiciones": protocol.condiciones,
        "orden": protocol.orden,
        "escala_maxima": protocol.escala_maxima,
        "categorias_kappa": protocol.categorias_kappa,
        "instrumentos": protocol.instrumentos,
        "criterios_inclusion": protocol.criterios_inclusion,
        "criterios_exclusion": protocol.criterios_exclusion,
    }
    if real_data:
        missing.extend(key for key, value in required.items() if not value)
        if not authorization_reference:
            missing.append("authorization_reference")
        if retention_days is None:
            missing.append("retention_policy")
    return missing


def canonical_rows(rows: list[ObservationWrite]) -> list[dict]:
    return [row.model_dump(mode="json", exclude_none=True) for row in rows]


def batch_digest(instrument_version: str, rows: list[ObservationWrite]) -> str:
    payload = {"instrument_version": instrument_version, "rows": canonical_rows(rows)}
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def validate_batch_scope(study: ImpactStudy, instrument_version: str, rows: list[ObservationWrite]) -> None:
    protocol = StudyProtocol.model_validate(study.protocol_json or {})
    versions = set(protocol.instrumentos.values())
    if versions and instrument_version not in versions:
        raise HTTPException(status_code=422, detail="La versión del instrumento no pertenece al protocolo")
    allowed = {str(item.get("pseudonym")) for item in (study.participants_json or [])}
    unknown = sorted({row.teacher_pseudonym for row in rows if row.teacher_pseudonym not in allowed})
    if unknown:
        raise HTTPException(status_code=422, detail={"code": "unknown_participant", "rows": unknown[:20]})
    for index, row in enumerate(rows):
        payload_version = getattr(row.payload, "instrument_version", None)
        if payload_version is not None and payload_version != instrument_version:
            raise HTTPException(status_code=422, detail={"code": "instrument_version_mismatch", "row": index})


def public_study(study: ImpactStudy, *, detail: bool = False) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": str(study.id),
        "nombre": study.nombre,
        "estado": study.estado,
        "synthetic_only": bool(study.synthetic_only),
        "version": study.version,
        "participant_count": len(study.participants_json or []),
        "created_at": study.created_at,
        "closed_at": study.closed_at,
    }
    if detail:
        data.update({
            "protocol": study.protocol_json or {},
            "participant_pseudonyms": [item.get("pseudonym") for item in (study.participants_json or [])],
            "authorization_configured": bool(study.authorization_reference),
            "retention_policy": study.retention_policy_json or {},
        })
    return data


def minimized_observation(row: Any) -> dict[str, Any]:
    return {
        "external_id": row.external_id,
        "revision": row.revision,
        "teacher_pseudonym": row.teacher_pseudonym,
        "work_key": row.work_key,
        "response_key": row.response_key,
        "condition": row.condition,
        "observed_at": row.observed_at.isoformat(),
        "payload": row.payload_json,
        "missing_reason": row.missing_reason,
        "exclusion_reason": row.exclusion_reason,
    }


def study_indicators(rows: list[Any], protocol_json: dict) -> dict[str, Any]:
    latest: dict[str, Any] = {}
    for row in rows:
        if row.exclusion_reason:
            continue
        previous = latest.get(row.external_id)
        if previous is None or row.revision > previous.revision:
            latest[row.external_id] = row
    observations = list(latest.values())

    timing: dict[tuple[str, str, str], dict[str, int]] = {}
    grade_pairs: list[tuple[float, float]] = []
    exposed_pairs = 0
    feedback_scores: list[float] = []
    missing = 0
    for row in observations:
        if row.missing_reason:
            missing += 1
            continue
        payload = row.payload_json or {}
        if payload.get("type") == "timing":
            key = (row.teacher_pseudonym, row.work_key, str(payload.get("phase")))
            timing.setdefault(key, {})[row.condition] = int(payload.get("duration_ms") or 0)
        elif payload.get("type") == "grade_comparison":
            if payload.get("independent_reference") is not None and payload.get("reviewer_saw_ai") is False:
                grade_pairs.append((float(payload["suggested_initial"]), float(payload["independent_reference"])))
            if payload.get("reviewer_saw_ai") is True:
                exposed_pairs += 1
        elif payload.get("type") == "feedback_quality":
            feedback_scores.append(sum(float(payload[key]) for key in ("correccion", "especificidad", "claridad", "utilidad", "adecuacion")) / 5)

    savings: list[float] = []
    for pair in timing.values():
        manual, assisted = pair.get("manual"), pair.get("asistida")
        if manual is not None and assisted is not None and manual > 0:
            savings.append(100 * (manual - assisted) / manual)
    boundaries = list((protocol_json or {}).get("categorias_kappa") or [])
    kappa = cohen_kappa(
        [pair[0] for pair in grade_pairs], [pair[1] for pair in grade_pairs],
        boundaries=boundaries,
    )
    return {
        "observations_current": len(observations),
        "missing_count": missing,
        "time_savings": {
            "available": bool(savings),
            "paired_units": len(savings),
            "mean_percent": sum(savings) / len(savings) if savings else None,
            "values": savings,
            "reason": None if savings else "no_comparable_pairs",
        },
        "kappa_independent": kappa,
        "exposed_grade_pairs": exposed_pairs,
        "feedback_quality": {
            "available": bool(feedback_scores),
            "n": len(feedback_scores),
            "mean": sum(feedback_scores) / len(feedback_scores) if feedback_scores else None,
        },
    }
