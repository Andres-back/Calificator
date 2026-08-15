from __future__ import annotations

import re
from pathlib import Path

from .config import InventoryConfig, matches_rule
from .model import Surface
from .sources import SourceReader


def assign_ownership(surfaces: list[Surface], config: InventoryConfig) -> None:
    for surface in surfaces:
        matches = [rule for rule in config.ownership if matches_rule(
            rule, kind=surface.kind, source_path=surface.source_path, signature=surface.signature
        )]
        if not matches:
            raise ValueError(f"Superficie sin propietario: {surface.id}")
        highest = max(int(rule["priority"]) for rule in matches)
        finalists = [rule for rule in matches if int(rule["priority"]) == highest]
        owners = {rule["spec"] for rule in finalists}
        if len(owners) != 1:
            raise ValueError(f"Superficie con propietarios múltiples: {surface.id}: {sorted(owners)}")
        surface.owner_spec = next(iter(owners))
        surface.consumers = sorted({consumer for rule in finalists for consumer in rule.get("consumers", [])})


def apply_permission_overrides(surfaces: list[Surface], config: InventoryConfig) -> None:
    by_id = {surface.id: surface for surface in surfaces}
    for override in config.permission_overrides:
        surface_id = override["surface_id"]
        if surface_id not in by_id:
            raise ValueError(f"Override de permiso referencia superficie inexistente: {surface_id}")
        surface = by_id[surface_id]
        surface.actors = sorted(set(override["actors"]))
        surface.authorization = sorted(set(surface.authorization + ["explicit_permission_override"]))
        surface.details.update(
            {
                "permission_override_issue": override["issue_url"],
                "permission_override_reason": override["reason"],
                "permission_override_evidence": list(override["evidence"]),
            }
        )
        surface.details = dict(sorted(surface.details.items()))


def attach_test_evidence(surfaces: list[Surface], reader: SourceReader) -> None:
    test_paths = reader.files(("backend/tests", "frontend/src", "frontend/e2e"), {".py", ".ts", ".tsx"})
    tests: list[tuple[str, str]] = []
    for path in test_paths:
        relative = reader.relative(path)
        if "/test" not in relative and ".test." not in relative and ".spec." not in relative:
            continue
        tests.append((relative, reader.read_text(path).lower()))
    for surface in surfaces:
        signature = surface.signature.lower()
        path_token = signature.split(":", 1)[-1]
        plain_path = re.sub(r"\{[^}]+\}", "", path_token).rstrip("/")
        module_token = Path(surface.source_path).parent.name.lower()
        evidence: list[dict[str, str]] = []
        for test_path, content in tests:
            direct = signature in content or path_token in content or (plain_path and plain_path in content)
            domain = len(module_token) >= 4 and module_token in Path(test_path).name.lower()
            table_match = surface.kind == "table" and surface.signature.lower() in content
            if direct or domain or table_match:
                evidence.append({
                    "test_path": test_path,
                    "reference": surface.signature,
                    "level": "e2e" if test_path.startswith("frontend/e2e/") else "unit",
                    "status": "direct" if direct or table_match else "domain",
                })
        surface.tests = sorted(evidence, key=lambda item: (item["test_path"], item["reference"]))
        surface.coverage = "covered" if evidence else "missing"
