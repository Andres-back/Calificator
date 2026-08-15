from __future__ import annotations

from pathlib import Path

from scripts.build_system_inventory import build_inventory
from scripts.system_inventory.render import json_text


def test_inventory_is_byte_deterministic_and_platform_independent(inventory_repo: Path) -> None:
    first = json_text(build_inventory(inventory_repo))
    second = json_text(build_inventory(inventory_repo))
    assert first == second
    assert "\\\\" not in first
    assert str(inventory_repo) not in first
    assert first.endswith("\n")