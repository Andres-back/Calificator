"""Audit every annotated synthetic sign, not a whole-page average or OCR claim."""
from __future__ import annotations

import argparse
from collections import Counter
from io import BytesIO
import hashlib
import json
from pathlib import Path
import platform
import sys

import cv2
import numpy as np
import PIL
from PIL import Image, ImageOps

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
from app.services.evidence_scan import ScanRecipe, prepare_evidence_scan  # noqa: E402
from tests.helpers.evidence_scan_fidelity import bind_reference_source, compare_reference_marks, reference_marks  # noqa: E402
from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture  # noqa: E402


def decode(content):
    with Image.open(BytesIO(content)) as image, image.convert("RGB") as rgb:
        return np.asarray(rgb)


def audit(directory: Path, source_directory: Path | None = None):
    report = json.loads((directory / "report.json").read_text(encoding="utf-8"))
    if report.get("syntheticOnly") is not True:
        raise ValueError("Frozen synthetic evidence only")
    cases = {case["id"]: case for case in bank_cases()}
    fixtures = {identity: make_scan_fixture(case) for identity, case in cases.items()}
    if source_directory is not None:
        fixtures = {identity: bind_reference_source(fixture, (source_directory / f'{identity}.png').read_bytes()) for identity, fixture in fixtures.items()}
    expected = {(browser, identity, profile) for browser in ("chromium", "webkit") for identity in fixtures for profile in ("natural", "lectura_suave")}
    actual = {(row.get("browser"), row.get("case"), (row.get("recipe") or {}).get("profile")) for row in report["results"]}
    if len(report["results"]) != len(expected) or expected != actual:
        raise ValueError("Incomplete/duplicated captured reference bank")
    results, counts, failures = [], Counter(), []
    for row in report["results"]:
        fixture = fixtures[row["case"]]
        recipe = ScanRecipe.model_validate(row["recipe"])
        mime = row.get('previewMime', 'image/jpeg')
        if mime not in {'image/jpeg', 'image/png'}:
            raise ValueError('Unexpected preview encoding')
        name = f"{row['browser']}-{fixture.identity}-{recipe.profile}.{'png' if mime == 'image/png' else 'jpg'}"
        if row.get("preview") != name:
            raise ValueError("Unexpected preview file name")
        if row.get('sourceSha256') is not None and row['sourceSha256'] != hashlib.sha256(fixture.content).hexdigest():
            raise ValueError('Captured source hash does not match the audited original')
        prepared = prepare_evidence_scan(fixture.content, recipe)
        matrix = np.asarray(prepared.source_to_prepared)
        with Image.open(BytesIO(fixture.content)) as raw, ImageOps.exif_transpose(raw) as oriented, oriented.convert("RGB") as rgb:
            source = np.asarray(rgb)
        reference = cv2.warpPerspective(source, matrix, (prepared.width, prepared.height), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        marks = reference_marks(cases[fixture.identity], fixture, matrix)
        for kind, candidate in (("canonical", decode(prepared.content)), ("preview", decode((directory / name).read_bytes()))):
            compared = compare_reference_marks(reference, candidate, marks)
            summary = dict(Counter(item["status"] for item in compared))
            for status, amount in summary.items():
                counts[f"{row['browser']}:{recipe.profile}:{kind}:{status}"] += amount
            lost = [item for item in compared if item["status"] in {"lost", "cropped"}]
            failures.extend({"case": fixture.identity, "browser": row["browser"], "profile": recipe.profile, "kind": kind, **item} for item in lost)
            results.append({"case": fixture.identity, "browser": row["browser"], "profile": recipe.profile, "kind": kind, "counts": summary, "marks": compared})
    return {"synthetic_only": True, "real_ai_calls": 0, "frozen_cases": 30, "preparations": len(report["results"]),
            "runtime": {"platform": sys.platform, "python": platform.python_version(), "opencv": cv2.__version__, "pillow": PIL.__version__, "numpy": np.__version__},
            "source_binding_verified": all(row.get('sourceSha256') for row in report['results']),
            "thresholds": {"minimum_patch_ncc": .90, "minimum_contrast_ratio": .50, "maximum_ink_chroma_p95": 15, "source_std_below_3": "unobservable_not_restored"},
            "human_transcription_or_ocr_certified": False, "counts": dict(counts), "failures": failures, "results": results}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument('--sources', type=Path)
    parser.add_argument("--run-id", type=int, choices=range(1, 11), default=1)
    args = parser.parse_args()
    report = audit(args.directory, args.sources)
    with (args.directory / f"mark-retention-{sys.platform}-{args.run_id}.json").open("x", encoding="utf-8") as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2)
    print(json.dumps({"preparations": report["preparations"], "counts": report["counts"], "failures": report["failures"][:15], "total_failures": len(report["failures"])}))
    if report["failures"]:
        raise SystemExit(1)
