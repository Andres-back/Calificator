from __future__ import annotations

import shutil
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
FIXTURE_ROOT = Path(__file__).parent / "fixtures" / "system_inventory"


@pytest.fixture
def inventory_repo(tmp_path: Path) -> Path:
    root = tmp_path / "repo"
    shutil.copytree(FIXTURE_ROOT, root)
    specs = root / "specs"
    for name in ("002-arquitectura-roles-seguridad", "012-ia-jobs-produccion"):
        (specs / name).mkdir(parents=True, exist_ok=True)
    config = specs / "system-inventory"
    config.mkdir(parents=True)
    (config / "ownership.json").write_text(
        '{"rules":[{"spec":"002-arquitectura-roles-seguridad","priority":10,"source_patterns":["backend/app/**","backend/alembic/**","frontend/src/**"]}]}',
        encoding="utf-8",
    )
    (config / "exceptions.json").write_text('{"exceptions":[]}', encoding="utf-8")
    (config / "permission-overrides.json").write_text('{"permission_overrides":[]}', encoding="utf-8")
    return root