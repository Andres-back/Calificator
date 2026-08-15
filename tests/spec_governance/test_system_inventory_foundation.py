from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.system_inventory.config import load_config
from scripts.system_inventory.model import Surface, canonical_id
from scripts.system_inventory.ownership import apply_permission_overrides
from scripts.system_inventory.sources import SourceReader


def _install_override_case(inventory_repo: Path, name: str) -> None:
    source = inventory_repo / "override-cases" / name
    target = inventory_repo / "specs/system-inventory/permission-overrides.json"
    target.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")


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


def test_permission_override_accepts_existing_test_evidence(inventory_repo: Path) -> None:
    _install_override_case(inventory_repo, "valid.json")

    override = load_config(inventory_repo).permission_overrides[0]

    assert override["evidence"] == ["backend/tests/test_demo.py"]
    assert override["actors"] == ["profesor"]


@pytest.mark.parametrize(
    ("case", "message"),
    [
        ("missing-evidence.json", "evidence"),
        ("empty-evidence.json", "evidence"),
        ("non-test-evidence.json", "prueba"),
        ("missing-file.json", "inexistente"),
        ("duplicate.json", "duplicado"),
    ],
)
def test_permission_override_rejects_invalid_evidence(
    inventory_repo: Path,
    case: str,
    message: str,
) -> None:
    _install_override_case(inventory_repo, case)

    with pytest.raises(ValueError, match=message):
        load_config(inventory_repo)


def test_permission_override_exposes_reason_issue_and_evidence(inventory_repo: Path) -> None:
    _install_override_case(inventory_repo, "valid.json")
    config = load_config(inventory_repo)
    surface = Surface(
        "endpoint",
        "GET:/demo",
        "backend/app/modules/demo/router.py",
        1,
        actors=["authenticated"],
    )

    apply_permission_overrides([surface], config)

    assert surface.actors == ["profesor"]
    assert surface.details["permission_override_issue"].endswith("/issues/17")
    assert surface.details["permission_override_reason"].startswith("El permiso")
    assert surface.details["permission_override_evidence"] == ["backend/tests/test_demo.py"]


def test_repository_configuration_is_valid() -> None:
    config = load_config(Path(__file__).resolve().parents[2])
    assert len(config.ownership) >= 11


def test_domain_render_exposes_override_reason_issue_and_evidence() -> None:
    from scripts.system_inventory.render import domain_markdown

    surface = Surface(
        "endpoint",
        "GET:/demo",
        "backend/app/modules/demo/router.py",
        1,
        owner_spec="002-arquitectura-roles-seguridad",
        actors=["profesor"],
        details={
            "permission_override_issue": "https://github.com/example/project/issues/17",
            "permission_override_reason": "Control delegado y probado.",
            "permission_override_evidence": ["backend/tests/test_demo.py"],
        },
    )
    markdown = domain_markdown(
        "002-arquitectura-roles-seguridad",
        {"surfaces": [surface.to_dict()], "findings": []},
    )

    assert "Control delegado y probado." in markdown
    assert "https://github.com/example/project/issues/17" in markdown
    assert "backend/tests/test_demo.py" in markdown
