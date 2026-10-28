"""Per-sign synthetic references, independent of detection/scan implementation.

This adds annotations, not new/altered photographs, to the frozen bank. It checks
observed pixel structure/color in every sign's small patch. It is not OCR, a
human transcription, or a promise of legibility for an already damaged source.
Thresholds are fixed before running the retained bank: NCC >= .90, contrast
ratio >= .50, ink-chroma p95 error <= 15/255. Unobservable source patches stay
explicit in the denominator report and are never described as restored.
"""
from __future__ import annotations

from io import BytesIO
from dataclasses import replace
import math

import cv2
import numpy as np
from PIL import Image, ImageFont, ImageOps


def bind_reference_source(fixture, content: bytes):
    """Bind captured original bytes; platform PNG serialization may differ.

    Every EXIF-oriented RGB pixel must still equal the frozen generator. This
    does not let another document silently enter the reference experiment.
    """
    if content != fixture.content:
        with Image.open(BytesIO(content)) as a, Image.open(BytesIO(fixture.content)) as b:
            with ImageOps.exif_transpose(a) as oriented_a, ImageOps.exif_transpose(b) as oriented_b:
                with oriented_a.convert('RGB') as rgb_a, oriented_b.convert('RGB') as rgb_b:
                    if rgb_a.size != rgb_b.size or not np.array_equal(np.asarray(rgb_a), np.asarray(rgb_b)):
                        raise ValueError('The captured source differs from the frozen reference pixels')
    return replace(fixture, content=content)


def _paper_boxes(variant):
    width, height = (860, 620) if variant == "landscape" else (620, 220) if variant == "strip" else (620, 860)
    font = ImageFont.load_default(size=20)
    lines = [("header", 35, 18, "EVIDENCIA SINTETICA - SIN DATOS PERSONALES")]
    texts = ["1. 6 x 4 = 24", "2. -0.5 + 1.25 = 0.75", "3. Respuesta B (X)", "4. V (X)   F ( )", "5. Pasos: 1 -> 2 -> 3"]
    for index, value in enumerate(texts[:3] if variant == "strip" else texts):
        lines.append((f"answer-{index + 1}", 40, 60 + index * (42 if variant == "strip" else 95), value))
    boxes = []
    for name, x, y, value in lines:
        for index, char in enumerate(value):
            if char.isspace():
                continue
            advance = font.getlength(value[:index + 1]) - font.getlength(char)
            left, top, right, bottom = font.getbbox(char)
            boxes.append((f"{name}:{index}:{char}", (x + advance + left - 2, y + top - 2, x + advance + right + 2, y + bottom + 2)))
    if variant in {"margins", "math", "drawing", "crossout", "color"}:
        boxes.extend([("margin-circle", (2, height - 38, 22, height - 18)), ("margin-plus", (width - 48, 30, width - 1, 73))])
    if variant in {"drawing", "crossout"}:
        # Separate roof/walls: loss of one stroke is not hidden by the whole
        # house's large white area or by the other four intact strokes.
        boxes.extend([("roof-left", (102, 508, 203, 593)), ("roof-right", (198, 508, 298, 593)),
                      ("wall-left", (118, 588, 124, 733)), ("wall-right", (277, 588, 283, 733)),
                      ("wall-top", (118, 588, 283, 594)), ("wall-bottom", (118, 727, 283, 733))])
    if variant == "crossout":
        boxes.append(("crossout-stroke", (97, 57, 343, 83)))
    if variant == "table":
        boxes.extend([("table-left", (37, 137, 45, 774)), ("table-right", (576, 137, 584, 774))])
        for index, y in enumerate([140, *range(200, 770, 80), 770]):
            boxes.append((f"table-horizontal-{index}", (37, y - 4, 584, y + 5)))
    return width, height, boxes


def reference_marks(case, fixture, source_to_prepared):
    width, height, boxes = _paper_boxes(case["variant"])
    photo_width, photo_height = fixture.oriented_size
    mapping = cv2.getPerspectiveTransform(np.float32([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]]),
                                         np.float32(fixture.corners) * np.float32([photo_width, photo_height]))
    with Image.open(BytesIO(fixture.content)) as raw, ImageOps.exif_transpose(raw) as oriented, oriented.convert("RGB") as rgb:
        source = cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2GRAY)
    references = []
    for identity, (left, top, right, bottom) in boxes:
        # Edge samples also bound the known synthetic curved-page deformation;
        # this is annotation geometry, not a claimed dewarping implementation.
        points = np.float32([[left + (right - left) * t, y] for y in (top, bottom) for t in np.linspace(0, 1, 17)]
                            + [[x, top + (bottom - top) * t] for x in (left, right) for t in np.linspace(0, 1, 17)])
        copies = [cv2.perspectiveTransform(points[None], mapping)[0]]
        if case["variant"] == "curved":
            copies[0][:, 0] += np.trunc(30 * np.sin(copies[0][:, 1] / 85))
        if case["variant"] == "two_pages":
            resized = points * [(340 - 1) / (width - 1), (460 - 1) / (height - 1)]
            copies = [resized + [30, 60], resized + [420, 550]]
        for copy, photo in enumerate(copies):
            photo[:, 0] = np.clip(photo[:, 0], 0, photo_width - 1)
            photo[:, 1] = np.clip(photo[:, 1], 0, photo_height - 1)
            x1, y1 = np.floor(photo.min(axis=0)).astype(int)
            x2, y2 = np.ceil(photo.max(axis=0)).astype(int) + 1
            observed = x2 > x1 + 1 and y2 > y1 + 1 and float(source[y1:y2, x1:x2].std()) >= 3
            transformed = cv2.perspectiveTransform(photo.astype(np.float32)[None], np.asarray(source_to_prepared, dtype=float))[0]
            low, high = transformed.min(axis=0), transformed.max(axis=0)
            references.append({"id": f"copy-{copy}:{identity}", "observed": bool(observed),
                               "bounds": [math.floor(low[0]), math.floor(low[1]), math.ceil(high[0]) + 1, math.ceil(high[1]) + 1]})
    return references


def compare_reference_marks(reference, prepared, marks):
    if reference.shape != prepared.shape or reference.ndim != 3 or reference.shape[2] != 3:
        raise ValueError("The compared frames must match")
    gray_reference = cv2.cvtColor(reference, cv2.COLOR_RGB2GRAY).astype(float)
    gray_prepared = cv2.cvtColor(prepared, cv2.COLOR_RGB2GRAY).astype(float)
    height, width = reference.shape[:2]
    results = []
    for mark in marks:
        left, top, right, bottom = mark["bounds"]
        row = {"id": mark["id"]}
        if mark.get("observed") is False or right <= left + 1 or bottom <= top + 1:
            results.append({**row, "status": "unobservable_source"}); continue
        if left < 0 or top < 0 or right > width or bottom > height:
            results.append({**row, "status": "cropped"}); continue
        a, b = gray_reference[top:bottom, left:right], gray_prepared[top:bottom, left:right]
        source_std, prepared_std = float(a.std()), float(b.std())
        if source_std < 3:
            results.append({**row, "status": "unobservable_source"}); continue
        denom = source_std * prepared_std
        correlation = float(((a - a.mean()) * (b - b.mean())).mean() / denom) if denom > 0 else 0.
        contrast_ratio = prepared_std / source_std
        before, after = reference[top:bottom, left:right].astype(float), prepared[top:bottom, left:right].astype(float)
        ink = a < np.percentile(a, 95) - max(5, source_std * .25)
        chroma = np.abs((before - before.mean(axis=2, keepdims=True)) - (after - after.mean(axis=2, keepdims=True)))
        color_error = float(np.percentile(chroma[ink], 95)) if ink.any() else 0.
        retained = correlation >= .90 and contrast_ratio >= .50 and color_error <= 15
        results.append({**row, "status": "retained" if retained else "lost", "correlation": round(correlation, 4),
                        "contrast_ratio": round(contrast_ratio, 4), "ink_chroma_p95": round(color_error, 3)})
    return results
