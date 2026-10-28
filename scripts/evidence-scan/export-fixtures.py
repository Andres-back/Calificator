"""Render only the frozen synthetic evidence bank; never reads uploads or credentials."""
from __future__ import annotations

import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    parser.add_argument("--case", default=None)
    args = parser.parse_args()
    cases = [case for case in bank_cases() if args.case is None or case["id"] == args.case]
    if not cases:
        parser.error("Caso sintético no encontrado")
    args.output.mkdir(parents=True, exist_ok=True)
    for case in cases:
        fixture = make_scan_fixture(case)
        target = args.output / f"{fixture.identity}.png"
        if target.exists() and target.read_bytes() != fixture.content:
            raise ValueError(f"No se sobrescribe un archivo distinto: {target.name}")
        if not target.exists():
            target.write_bytes(fixture.content)
    print(f"Fotos sintéticas exportadas: {len(cases)}")


if __name__ == "__main__":
    main()
