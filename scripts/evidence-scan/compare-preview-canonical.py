"""Compare frozen synthetic previews with server reproduction.

Metrics flag geometric/pixel divergence and complete loss of local contrast.
They do NOT prove that each glyph/sign retained its meaning or that OCR/grades
improve. Blank glare/blur areas cannot be restored by this comparison.
"""
from __future__ import annotations

import argparse
import hashlib
from io import BytesIO
import json
from pathlib import Path
import sys

import cv2
import numpy as np
from PIL import Image, ImageOps

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
from app.services.evidence_scan import ScanRecipe, prepare_evidence_scan  # noqa: E402
from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture  # noqa: E402
from tests.helpers.evidence_scan_fidelity import bind_reference_source  # noqa: E402


def decoded(content):
    with Image.open(BytesIO(content)) as image:
        with image.convert("RGB") as rgb:
            return np.asarray(rgb)


def compare(directory: Path, source_directory: Path | None = None) -> dict:
    report = json.loads((directory / "report.json").read_text(encoding="utf-8"))
    if report.get("syntheticOnly") is not True:
        raise ValueError("Only frozen synthetic evidence is accepted")
    fixtures = {case["id"]: make_scan_fixture(case) for case in bank_cases()}
    if source_directory is not None:
        fixtures = {identity: bind_reference_source(fixture, (source_directory / f'{identity}.png').read_bytes()) for identity, fixture in fixtures.items()}
    expected = {(browser, key, profile) for browser in ("chromium", "webkit") for key in fixtures for profile in ("natural", "lectura_suave")}
    actual = {(row.get("browser"), row.get("case"), (row.get("recipe") or {}).get("profile")) for row in report["results"]}
    if len(report["results"]) != 120 or expected != actual:
        raise ValueError("Incomplete/duplicated benchmark, or browser preparation failed")
    results, warnings = [], []
    for row in report["results"]:
        source = fixtures[row["case"]]
        recipe = ScanRecipe.model_validate(row["recipe"])
        # Only a generated file name, never allow report-controlled paths.
        mime = row.get('previewMime', 'image/jpeg')
        if mime not in {'image/jpeg', 'image/png'}:
            raise ValueError('Unexpected preview encoding')
        expected_name = f"{row['browser']}-{source.identity}-{recipe.profile}.{'png' if mime == 'image/png' else 'jpg'}"
        if row["preview"] != expected_name:
            raise ValueError("Unexpected preview reference")
        if row.get('sourceSha256') is not None and row['sourceSha256'] != hashlib.sha256(source.content).hexdigest():
            raise ValueError('Captured source hash does not match the audited original')
        prepared = prepare_evidence_scan(source.content, recipe)
        canonical = decoded(prepared.content)
        preview = decoded((directory / expected_name).read_bytes())
        if canonical.shape != preview.shape:
            warnings.append({"case": source.identity, "browser": row["browser"], "profile": recipe.profile, "reason": "dimensions_differ"})
            continue
        errors = np.abs(canonical.astype(np.int16) - preview.astype(np.int16))
        # Inverse reference is the source photograph, not a clean invented page.
        with Image.open(BytesIO(source.content)) as raw, ImageOps.exif_transpose(raw) as oriented:
            rgb = np.asarray(oriented.convert("RGB"))
        reference = cv2.warpPerspective(rgb, np.asarray(prepared.source_to_prepared), (prepared.width, prepared.height),
                                        flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        contrasts = []
        # Flat-paper annotations are not meaningful for the two-page/curved
        # composites; still compare their entire outputs, not exclude the cases.
        if source.identity not in {"25-curved-page", "26-two-pages"}:
            photo = cv2.getPerspectiveTransform(np.float32([[0, 0], [1, 0], [1, 1], [0, 1]]), np.float32(source.corners))
            scale = np.diag([source.oriented_size[0] - 1, source.oriented_size[1] - 1, 1.])
            mapping = np.asarray(prepared.source_to_prepared) @ scale @ photo
            for mark in source.marks:
                x, y, width, height = mark
                corners = cv2.perspectiveTransform(np.float32([[[x, y], [x + width, y], [x + width, y + height], [x, y + height]]]), mapping)[0]
                left, top = np.floor(corners.min(axis=0)).astype(int)
                right, bottom = np.ceil(corners.max(axis=0)).astype(int)
                left, top = max(0, left), max(0, top)
                right, bottom = min(prepared.width, right), min(prepared.height, bottom)
                if right <= left or bottom <= top:
                    contrasts.append({"reference_std": 0., "canonical_std": 0., "preview_std": 0.})
                    continue
                def contrast(image):
                    roi = image[top:bottom, left:right]
                    return round(float(cv2.cvtColor(roi, cv2.COLOR_RGB2GRAY).std()), 3)
                contrasts.append({"reference_std": contrast(reference), "canonical_std": contrast(canonical), "preview_std": contrast(preview)})
        lost = sum(item["reference_std"] > 5 and min(item["canonical_std"], item["preview_std"]) < 1 for item in contrasts)
        mae, p99 = float(errors.mean()), float(np.percentile(errors, 99))
        if mae > 10 or lost:
            warnings.append({"case": source.identity, "browser": row["browser"], "profile": recipe.profile,
                             "reason": "pixel_divergence_or_contrast_loss", "mean_abs_error": round(mae, 3), "flat_regions": lost})
        results.append({"case": source.identity, "browser": row["browser"], "profile": recipe.profile, "proposal": row["proposal"],
                        "dimensions": [prepared.width, prepared.height], "mean_abs_error": round(mae, 3), "p99_channel_error": p99,
                        "reference_mark_regions": len(contrasts), "flat_regions": lost})
    return {"synthetic_only": True, "real_ai_calls": 0, "glyph_retention_certified": False,
            "results": results, "warnings": warnings,
            "summary": [{"browser": browser, "profile": profile, "cases": len(items),
                "max_mean_abs_error": max((row["mean_abs_error"] for row in items), default=None),
                "max_p99_channel_error": max((row["p99_channel_error"] for row in items), default=None),
                "reference_mark_regions": sum(row["reference_mark_regions"] for row in items),
                "flat_regions": sum(row["flat_regions"] for row in items)}
                for browser in ("chromium", "webkit") for profile in ("natural", "lectura_suave")
                for items in [[row for row in results if row["browser"] == browser and row["profile"] == profile]]],
            "limits": "Pixel agreement/local contrast only; no independent human glyph/OCR reference. Complete benchmark retained, including glare/blur/abstentions."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument('--sources', type=Path)
    args = parser.parse_args()
    report = compare(args.directory, args.sources)
    output = args.directory / "comparison.json"
    with output.open("x", encoding="utf-8") as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2)
    print(json.dumps({"summary": report["summary"], "warnings": report["warnings"], "glyph_retention_certified": False}))
    if report["warnings"]:
        raise SystemExit(1)
