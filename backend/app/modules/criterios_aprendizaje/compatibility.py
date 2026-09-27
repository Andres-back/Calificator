"""Snapshots y adaptadores compatibles con criterios/DBA heredados."""
from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from typing import Any

from app.modules.criterios_aprendizaje.models import LearningCriterion, LearningCriterionVersion


def _json_default(value: object) -> str:
    if isinstance(value, Decimal):
        return format(value, "f")
    return str(value)


def canonical_hash(payload: dict[str, Any]) -> str:
    serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=_json_default)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def criterion_snapshot(criterion: LearningCriterion) -> dict[str, Any]:
    return {
        "id": str(criterion.id),
        "stable_key": criterion.stable_key,
        "orden": criterion.orden,
        "nombre": criterion.nombre,
        "descripcion": criterion.descripcion,
        "evidencia_esperada": criterion.evidencia_esperada,
        "peso_porcentaje": float(criterion.peso_porcentaje),
        "puntaje_maximo": float(criterion.puntaje_maximo) if criterion.puntaje_maximo is not None else None,
        "niveles": list(criterion.niveles_json or []),
        "source_refs": list(criterion.source_refs_json or []),
        "official_standard_refs": list(criterion.official_standard_refs_json or []),
    }


def version_snapshot(version: LearningCriterionVersion, criteria: list[LearningCriterion]) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "set_id": str(version.set_id),
        "version_id": str(version.id),
        "version_number": version.version_number,
        "intencion_docente": dict(version.teacher_intent_json or {}),
        "criterios": [criterion_snapshot(item) for item in sorted(criteria, key=lambda item: item.orden)],
        "cobertura": dict(version.coverage_json or {}),
    }


def to_legacy_criteria(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for raw in snapshot.get("criterios") or []:
        if not isinstance(raw, dict):
            continue
        result.append({
            "nombre": str(raw.get("nombre") or "Criterio"),
            "descripcion": str(raw.get("descripcion") or ""),
            "evidencia_esperada": str(raw.get("evidencia_esperada") or ""),
            "peso_porcentaje": raw.get("peso_porcentaje"),
            "puntaje_maximo": raw.get("puntaje_maximo"),
            "niveles": raw.get("niveles") or [],
            "dba_ids": [str(item.get("id")) for item in raw.get("official_standard_refs") or [] if isinstance(item, dict) and item.get("id")],
            "learning_criterion_key": str(raw.get("stable_key") or ""),
            "learning_criteria_version_id": str(snapshot.get("version_id") or ""),
        })
    return result
