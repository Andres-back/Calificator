from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REQUIRED_TOP_LEVEL = {"schema_version", "source_digest", "counts", "surfaces", "findings", "exceptions", "permission_overrides"}


@dataclass(frozen=True, slots=True)
class InventoryDiff:
    added: list[str]
    removed: list[str]
    modified: list[str]

    @property
    def clean(self) -> bool:
        return not (self.added or self.removed or self.modified)

    def message(self) -> str:
        lines: list[str] = []
        if self.added:
            lines.append("Superficies añadidas: " + ", ".join(self.added))
        if self.removed:
            lines.append("Superficies eliminadas: " + ", ".join(self.removed))
        if self.modified:
            lines.append("Superficies modificadas: " + ", ".join(self.modified))
        if lines:
            lines.append("Ejecute: python scripts/build_system_inventory.py --write")
        return "\n".join(lines)


def validate_inventory(inventory: dict[str, Any]) -> None:
    missing = REQUIRED_TOP_LEVEL - set(inventory)
    if missing:
        raise ValueError(f"Inventario incompleto; faltan: {', '.join(sorted(missing))}")
    ids = [item.get("id", "") for item in inventory["surfaces"]]
    if ids != sorted(ids) or len(ids) != len(set(ids)):
        raise ValueError("Las superficies deben tener ids únicos y ordenados")
    for item in inventory["surfaces"]:
        if not item.get("owner_spec"):
            raise ValueError(f"Superficie sin propietario: {item.get('id')}")
        if item["owner_spec"].startswith("013-"):
            raise ValueError(f"La spec de inventario no puede poseer superficies: {item['id']}")


def structural_diff(current: dict[str, Any], expected: dict[str, Any]) -> InventoryDiff:
    current_map = {item["id"]: item for item in current.get("surfaces", [])}
    expected_map = {item["id"]: item for item in expected.get("surfaces", [])}
    return InventoryDiff(
        added=sorted(expected_map.keys() - current_map.keys()),
        removed=sorted(current_map.keys() - expected_map.keys()),
        modified=sorted(key for key in current_map.keys() & expected_map.keys() if current_map[key] != expected_map[key]),
    )


def load_inventory(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"No se pudo leer el inventario vigente {path}: {exc}") from exc
    validate_inventory(payload)
    return payload