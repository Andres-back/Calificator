from __future__ import annotations

import fnmatch
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .model import VALID_ACTORS

CONFIG_NAMES = ("ownership.json", "exceptions.json", "permission-overrides.json")
EVIDENCE_SUFFIXES = {".py", ".ts", ".tsx"}
ISSUE_URL_PATTERN = re.compile(r"https://[^\s]+/issues/\d+$")


@dataclass(frozen=True, slots=True)
class InventoryConfig:
    ownership: tuple[dict[str, Any], ...]
    exceptions: tuple[dict[str, Any], ...]
    permission_overrides: tuple[dict[str, Any], ...]


def _read_json(path: Path) -> Any:
    if path.is_symlink():
        raise ValueError(f"No se permiten enlaces simbólicos en configuración: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Configuración inválida {path}: {exc}") from exc


def _required(item: dict[str, Any], fields: set[str], label: str) -> None:
    missing = sorted(field for field in fields if not item.get(field))
    if missing:
        raise ValueError(f"{label} incompleto; faltan: {', '.join(missing)}")


def _is_test_evidence(relative: str) -> bool:
    path = Path(relative)
    name = path.name.lower()
    if relative.startswith("backend/tests/"):
        return path.suffix == ".py" and (name.startswith("test_") or name.endswith("_test.py"))
    if relative.startswith("frontend/e2e/"):
        return path.suffix in {".ts", ".tsx"} and (".spec." in name or ".test." in name)
    if relative.startswith("frontend/src/"):
        return path.suffix in {".ts", ".tsx"} and (".spec." in name or ".test." in name)
    return False


def _validated_evidence(root: Path, item: dict[str, Any]) -> list[str]:
    evidence = item.get("evidence")
    surface_id = str(item.get("surface_id") or "desconocido")
    if not isinstance(evidence, list) or not evidence:
        raise ValueError(f"Override {surface_id} requiere evidence no vacía")
    if any(not isinstance(value, str) or not value.strip() for value in evidence):
        raise ValueError(f"Override {surface_id} contiene evidence inválida")

    normalized: list[str] = []
    resolved_root = root.resolve()
    for raw in evidence:
        portable = raw.strip().replace("\\", "/")
        relative_path = Path(portable)
        if relative_path.is_absolute() or ".." in relative_path.parts:
            raise ValueError(f"Override {surface_id} contiene evidence fuera del repositorio: {raw}")
        candidate = resolved_root / relative_path
        current = resolved_root
        for part in relative_path.parts:
            current = current / part
            if current.is_symlink():
                raise ValueError(f"Override {surface_id} no puede usar evidence simbólica: {raw}")
        if not candidate.is_file():
            raise ValueError(f"Override {surface_id} referencia evidence inexistente: {portable}")
        if candidate.suffix not in EVIDENCE_SUFFIXES or not _is_test_evidence(portable):
            raise ValueError(f"Override {surface_id} requiere una ruta de prueba versionada: {portable}")
        normalized.append(portable)

    if len(normalized) != len(set(normalized)):
        raise ValueError(f"Override {surface_id} contiene evidence duplicada")
    return normalized


def _validated_permission_overrides(root: Path, overrides: object) -> list[dict[str, Any]]:
    if not isinstance(overrides, list):
        raise ValueError("permission_overrides debe ser una lista")
    normalized: list[dict[str, Any]] = []
    seen_surfaces: set[str] = set()
    for item in overrides:
        if not isinstance(item, dict):
            raise ValueError("override de permiso debe ser un objeto")
        _required(item, {"surface_id", "actors", "reason", "issue_url", "evidence"}, "override de permiso")
        surface_id = str(item["surface_id"])
        if surface_id in seen_surfaces:
            raise ValueError(f"Override de permiso duplicado: {surface_id}")
        seen_surfaces.add(surface_id)
        actors = item["actors"]
        if not isinstance(actors, list) or not actors or any(not isinstance(actor, str) for actor in actors):
            raise ValueError(f"Override {surface_id} contiene actores inválidos")
        unknown = set(actors) - VALID_ACTORS
        if unknown or "ambiguous" in actors:
            raise ValueError(f"Override {surface_id} contiene actores inválidos: {sorted(unknown)}")
        if not isinstance(item["reason"], str) or not item["reason"].strip():
            raise ValueError(f"Override {surface_id} requiere una razón")
        if not isinstance(item["issue_url"], str) or not ISSUE_URL_PATTERN.fullmatch(item["issue_url"]):
            raise ValueError(f"Override {surface_id} requiere issue_url HTTPS de un issue")
        normalized.append(
            {
                "surface_id": surface_id,
                "actors": sorted(set(actors)),
                "reason": item["reason"].strip(),
                "issue_url": item["issue_url"],
                "evidence": _validated_evidence(root, item),
            }
        )
    return normalized


def load_config(root: Path) -> InventoryConfig:
    root = root.resolve()
    base = root / "specs" / "system-inventory"
    ownership_doc = _read_json(base / "ownership.json")
    exceptions_doc = _read_json(base / "exceptions.json")
    overrides_doc = _read_json(base / "permission-overrides.json")
    rules = ownership_doc.get("rules", [])
    if not rules:
        raise ValueError("ownership.json debe declarar al menos una regla")
    known_specs = {path.name for path in (root / "specs").iterdir() if path.is_dir() and path.name[:3].isdigit()}
    for index, rule in enumerate(rules, 1):
        _required(rule, {"spec", "priority"}, f"regla {index}")
        if rule["spec"] not in known_specs:
            raise ValueError(f"Regla {index} apunta a spec inexistente: {rule['spec']}")
        if not rule.get("source_patterns") and not rule.get("signature_patterns"):
            raise ValueError(f"Regla {index} no tiene patrones")
    exceptions = exceptions_doc.get("exceptions", [])
    for item in exceptions:
        _required(item, {"id", "reason", "owner", "issue_url", "closure_criteria"}, "excepción")
        if not item.get("surface_id") and not item.get("pattern"):
            raise ValueError(f"Excepción {item['id']} requiere surface_id o pattern")
    overrides = _validated_permission_overrides(root, overrides_doc.get("permission_overrides", []))
    return InventoryConfig(tuple(rules), tuple(exceptions), tuple(overrides))


def matches_rule(rule: dict[str, Any], *, kind: str, source_path: str, signature: str) -> bool:
    kinds = rule.get("kinds", [])
    if kinds and kind not in kinds:
        return False
    source_patterns = rule.get("source_patterns", [])
    if source_patterns and not any(fnmatch.fnmatch(source_path, pattern) for pattern in source_patterns):
        return False
    signature_patterns = rule.get("signature_patterns", [])
    if signature_patterns and not any(fnmatch.fnmatch(signature, pattern) for pattern in signature_patterns):
        return False
    return True
