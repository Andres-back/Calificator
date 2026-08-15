from __future__ import annotations

import fnmatch
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .model import VALID_ACTORS

CONFIG_NAMES = ("ownership.json", "exceptions.json", "permission-overrides.json")


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


def load_config(root: Path) -> InventoryConfig:
    base = root.resolve() / "specs" / "system-inventory"
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
    overrides = overrides_doc.get("permission_overrides", [])
    for item in overrides:
        _required(item, {"surface_id", "actors", "reason", "issue_url"}, "override de permiso")
        unknown = set(item["actors"]) - VALID_ACTORS
        if unknown or "ambiguous" in item["actors"]:
            raise ValueError(f"Override {item['surface_id']} contiene actores inválidos: {sorted(unknown)}")
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