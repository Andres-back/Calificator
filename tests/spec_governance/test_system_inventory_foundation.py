from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.system_inventory.config import load_config
from scripts.system_inventory.model import Surface, canonical_id
from scripts.system_inventory.sources import SourceReader


def test_canonical_keys_are_stable() -> None:
    assert canonical_id("endpoint", "get:/demo/{item_id}") == "backend:GET:/demo/{item_id}"
    assert canonical_id("frontend_route", "/app/demo/") == "frontend:/app/demo"
    call = canonical_id("frontend_call", "get:/demo/{id}", "frontend/src/api.ts")
    assert call == "frontend_call:GET:/demo/{id}:frontend/src/api.ts"


def test_surface_serialization_is_sorted() -> None:
    surface = Surface("endpoint", "GET:/demo", "backend/app/demo.py", 3, actors=["profesor", "admin"])
    assert surface.to_dict()["actors"] == ["admin", "profesor"]


def test_reader_is_deterministic_and_rejects_outside_paths(inventory_repo: Path) -> None:
    reader = SourceReader(inventory_repo)
    first = reader.source_digest()
    second = reader.source_digest()
    assert first == second
    with pytest.raises(ValueError, match="fuera"):
        reader.read_text(inventory_repo.parent / "secret.py")


def test_config_requires_auditable_permission_override(inventory_repo: Path) -> None:
    path = inventory_repo / "specs/system-inventory/permission-overrides.json"
    path.write_text(json.dumps({"permission_overrides": [{"surface_id": "backend:GET:/demo"}]}), encoding="utf-8")
    with pytest.raises(ValueError, match="incompleto"):
        load_config(inventory_repo)


def test_repository_configuration_is_valid() -> None:
    config = load_config(Path(__file__).resolve().parents[2])
    assert len(config.ownership) >= 11