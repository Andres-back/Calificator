from __future__ import annotations

from dataclasses import replace

import pytest

from scripts.system_inventory.findings import build_findings, validate_exceptions, validate_findings
from scripts.system_inventory.model import Finding, Surface


def test_invalid_exception_cannot_hide_unknown_surface() -> None:
    surfaces = [Surface("table", "users", "backend/app/users.py", 1, owner_spec="003-usuarios-materias-matriculas", actors=["system"])]
    exception = {"id":"EX-1","surface_id":"table:missing","reason":"temporal","owner":"equipo","issue_url":"https://github.com/org/repo/issues/1","closure_criteria":"retirar"}
    with pytest.raises(ValueError, match="no coincide"):
        validate_exceptions(surfaces, [exception])


def test_missing_coverage_and_permission_mismatch_are_visible() -> None:
    backend = Surface("endpoint", "GET:/demo", "backend/app/demo.py", 1, owner_spec="002-arquitectura-roles-seguridad", actors=["profesor"])
    frontend = Surface("frontend_call", "GET:/demo", "frontend/src/demo.ts", 1, owner_spec="002-arquitectura-roles-seguridad", actors=["estudiante"])
    findings = build_findings([backend, frontend])
    categories = {finding.category for finding in findings}
    assert "missing_coverage" in categories
    assert "authorization_mismatch" in categories


def test_high_or_critical_findings_require_issue() -> None:
    finding = Finding("F-1", "high", "authorization_mismatch", ["backend:GET:/demo"], "riesgo")
    with pytest.raises(ValueError, match="issue"):
        validate_findings([finding])

def test_unreachable_surface_is_preserved_as_orphan_candidate() -> None:
    surface = Surface("table", "legacy", "backend/alembic/versions/001.py", 1, owner_spec="002-arquitectura-roles-seguridad", actors=["system"], details={"active": False})
    findings = build_findings([surface])
    assert any(finding.category == "orphan_candidate" and surface.id in finding.surface_ids for finding in findings)


def test_feature_014_resolves_ten_permission_findings_and_detects_regression() -> None:
    from pathlib import Path

    from scripts.build_system_inventory import build_inventory

    inventory = build_inventory(Path(__file__).resolve().parents[2])
    overrides = inventory["permission_overrides"]
    override_ids = {item["surface_id"] for item in overrides}
    authorization_findings = [
        finding
        for finding in inventory["findings"]
        if finding["category"] == "authorization_mismatch"
    ]

    assert len(overrides) == 10
    assert len(override_ids) == 10
    assert authorization_findings == []
    overridden_surfaces = {
        surface["id"]: surface
        for surface in inventory["surfaces"]
        if surface["id"] in override_ids
    }
    assert set(overridden_surfaces) == override_ids
    assert all(
        surface["details"].get("permission_override_evidence")
        for surface in overridden_surfaces.values()
    )

    server = Surface(
        "endpoint",
        "GET:/regresion-permisos",
        "backend/app/regression.py",
        1,
        owner_spec="002-arquitectura-roles-seguridad",
        actors=["authenticated"],
    )
    client = Surface(
        "frontend_call",
        "GET:/regresion-permisos",
        "frontend/src/regression.ts",
        1,
        owner_spec="002-arquitectura-roles-seguridad",
        actors=["estudiante"],
    )
    simulated = build_findings([server, client])

    assert any(finding.category == "authorization_mismatch" for finding in simulated)
