"""Check frozen synthetic margin geometry; not OCR accuracy or glyph preservation."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    report = json.loads(args.report.read_text(encoding="utf-8"))
    if report.get("syntheticOnly") is not True:
        raise ValueError("Only the frozen synthetic report is allowed")
    fixtures = {case["id"]: make_scan_fixture(case) for case in bank_cases()}
    summary = []
    for browser in ("chromium", "webkit"):
        results = [row for row in report["results"] if row["browser"] == browser]
        if len(results) != 30 or {row["case"] for row in results} != set(fixtures):
            raise ValueError("Missing or repeated synthetic cases")
        subset, successful, missing_marks = 0, 0, []
        for row in results:
            fixture = fixtures[row["case"]]
            if not fixture.automatic_subset:
                continue
            subset += 1
            if not row.get("quad") or row.get("error"):
                continue
            transform = cv2.getPerspectiveTransform(np.float32([[0, 0], [1, 0], [1, 1], [0, 1]]), np.float32(fixture.corners))
            contour = np.float32(row["quad"]) * 10000
            contained = True
            for mark_index, (x, y, width, height) in enumerate(fixture.marks):
                corners = np.float32([[[x, y], [x + width, y], [x + width, y + height], [x, y + height]]])
                points = cv2.perspectiveTransform(corners, transform)[0]
                if any(cv2.pointPolygonTest(contour, tuple(float(n) for n in point * 10000), False) < 0 for point in points):
                    contained = False
                    missing_marks.append({"case": fixture.identity, "mark": mark_index + 1})
            successful += int(contained)
        summary.append({"browser": browser, "predeclared_subset": subset, "all_annotated_margins_inside": successful, "outside_marks": missing_marks, "scope": "geometry_only_not_ocr_or_pixel_fidelity"})
    print(json.dumps(summary, ensure_ascii=False))
    if any(item["predeclared_subset"] != 20 or item["all_annotated_margins_inside"] < 18 for item in summary):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
