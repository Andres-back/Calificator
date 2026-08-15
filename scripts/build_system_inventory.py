from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path
from typing import Any

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    from scripts.system_inventory.backend import extract_backend
    from scripts.system_inventory.config import load_config
    from scripts.system_inventory.data_jobs import extract_data_jobs
    from scripts.system_inventory.frontend import extract_frontend, link_frontend_contracts
    from scripts.system_inventory.findings import build_findings, validate_exceptions, validate_findings
    from scripts.system_inventory.ownership import apply_permission_overrides, assign_ownership, attach_test_evidence
    from scripts.system_inventory.render import output_contents, write_atomic
    from scripts.system_inventory.sources import SourceReader
    from scripts.system_inventory.validate import load_inventory, structural_diff, validate_inventory
except ModuleNotFoundError:
    from system_inventory.backend import extract_backend
    from system_inventory.config import load_config
    from system_inventory.data_jobs import extract_data_jobs
    from system_inventory.frontend import extract_frontend, link_frontend_contracts
    from system_inventory.findings import build_findings, validate_exceptions, validate_findings
    from system_inventory.ownership import apply_permission_overrides, assign_ownership, attach_test_evidence
    from system_inventory.render import output_contents, write_atomic
    from system_inventory.sources import SourceReader
    from system_inventory.validate import load_inventory, structural_diff, validate_inventory


def build_inventory(root: Path) -> dict[str, Any]:
    root = root.resolve()
    reader = SourceReader(root)
    config = load_config(root)
    backend_surfaces = extract_backend(reader)
    frontend_surfaces = extract_frontend(reader)
    link_frontend_contracts(frontend_surfaces, backend_surfaces)
    surfaces = backend_surfaces + frontend_surfaces + extract_data_jobs(reader)
    by_id = {}
    for surface in surfaces:
        if surface.id in by_id:
            raise ValueError(f"Superficie duplicada: {surface.id}")
        by_id[surface.id] = surface
    surfaces = [by_id[key] for key in sorted(by_id)]
    assign_ownership(surfaces, config)
    apply_permission_overrides(surfaces, config)
    attach_test_evidence(surfaces, reader)
    validate_exceptions(surfaces, config.exceptions)
    findings = build_findings(surfaces)
    validate_findings(findings)
    kind_counts = Counter(surface.kind for surface in surfaces)
    coverage_counts = Counter(surface.coverage for surface in surfaces)
    return {
        "schema_version": 1,
        "source_digest": reader.source_digest(),
        "counts": {
            "total": len(surfaces),
            "by_kind": dict(sorted(kind_counts.items())),
            "by_coverage": dict(sorted(coverage_counts.items())),
        },
        "surfaces": [surface.to_dict() for surface in surfaces],
        "findings": [finding.to_dict() for finding in findings],
        "exceptions": list(config.exceptions),
        "permission_overrides": list(config.permission_overrides),
    }
    validate_inventory(inventory)
    return inventory


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Genera o valida el inventario técnico de XCalificator")
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--write", action="store_true", help="regenera artefactos versionados")
    modes.add_argument("--check", action="store_true", help="valida que no exista deriva (predeterminado)")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        inventory = build_inventory(args.root)
        outputs = output_contents(args.root.resolve(), inventory)
        if args.write:
            write_atomic(outputs)
            print(f"Inventario actualizado: {inventory['counts']['total']} superficies")
            return 0
        missing = [path for path in outputs if not path.exists()]
        changed = [path for path, content in outputs.items() if path.exists() and path.read_text(encoding="utf-8") != content]
        if missing or changed:
            current_path = args.root.resolve() / "specs/system-inventory/current.json"
            if current_path.exists():
                diff = structural_diff(load_inventory(current_path), inventory)
                if not diff.clean:
                    print(diff.message(), file=sys.stderr)
            for path in missing:
                print(f"FALTA {path.relative_to(args.root.resolve()).as_posix()}", file=sys.stderr)
            for path in changed:
                print(f"DERIVA {path.relative_to(args.root.resolve()).as_posix()}", file=sys.stderr)
            print("Ejecute: python scripts/build_system_inventory.py --write", file=sys.stderr)
            return 1
        print(f"Inventario vigente: {inventory['counts']['total']} superficies")
        return 0
    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())