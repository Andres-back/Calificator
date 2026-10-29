"""Frozen synthetic page fixtures with source marks and known photo geometry."""
from __future__ import annotations

import json
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

BANK_PATH = Path(__file__).resolve().parents[1] / "fixtures" / "evidence_scan" / "cases.json"


@dataclass(frozen=True)
class ScanFixture:
    identity: str
    content: bytes
    oriented_size: tuple[int, int]
    corners: tuple[tuple[float, float], ...]
    # Region of every reference mark in the flat paper, normalized x/y/w/h.
    marks: tuple[tuple[float, float, float, float], ...]
    automatic_subset: bool


def bank_cases() -> list[dict]:
    return json.loads(BANK_PATH.read_text(encoding="utf-8"))["cases"]


def make_scan_fixture(case: dict) -> ScanFixture:
    variant = case["variant"]
    width, height = (860, 620) if variant == "landscape" else (620, 220) if variant == "strip" else (620, 860)
    paper = Image.new("RGB", (width, height), (255, 251, 225) if variant == "cream" else "white")
    draw = ImageDraw.Draw(paper)
    font = ImageFont.load_default(size=20)
    if variant == "notebook":
        for row in range(15, height, 24):
            draw.line((0, row, width, row), fill=(190, 210, 235))
        for column in range(15, width, 24):
            draw.line((column, 0, column, height), fill=(190, 210, 235))
    draw.text((35, 18), "EVIDENCIA SINTETICA - SIN DATOS PERSONALES", fill="black", font=font)
    marks = []
    colors = [(140, 140, 140)] * 5 if variant == "pencil" else [(20, 20, 20), (130, 20, 20), (20, 60, 130), (20, 20, 20), (80, 80, 80)]
    texts = ["1. 6 x 4 = 24", "2. -0.5 + 1.25 = 0.75", "3. Respuesta B (X)", "4. V (X)   F ( )", "5. Pasos: 1 -> 2 -> 3"]
    for index, text in enumerate(texts[:3] if variant == "strip" else texts):
        x, y = 40, 60 + index * (42 if variant == "strip" else 95)
        draw.text((x, y), text, fill=colors[index], font=font)
        marks.append((x / width, y / height, 320 / width, 28 / height))
    if variant in {"margins", "math", "drawing", "crossout", "color"}:
        draw.ellipse((4, height - 36, 20, height - 20), fill=(100, 20, 80))
        draw.line((width - 45, 50, width - 4, 50), fill="black", width=2)
        draw.line((width - 24, 32, width - 24, 70), fill="black", width=2)
        marks += [(2 / width, (height - 38) / height, 22 / width, 22 / height), ((width - 48) / width, 30 / height, 46 / width, 43 / height)]
    if variant in {"drawing", "crossout"}:
        draw.rectangle((120, 590, 280, 730), outline="black", width=2)
        draw.line((105, 590, 200, 510, 295, 590), fill="black", width=2)
        if variant == "crossout":
            draw.line((100, 60, 340, 80), fill=(60, 60, 60), width=2)
        marks.append((100 / width, 500 / height, 200 / width, 240 / height))
    if variant == "table":
        draw.rectangle((40, 140, 580, 770), outline="black", width=5)
        for y in range(200, 770, 80):
            draw.line((40, y, 580, y), fill="black", width=3)
    photo_width, photo_height = (1100, 800) if variant == "landscape" else (800, 420) if variant == "strip" else (800, 1100)
    corners = np.float32([[80, 100], [photo_width - 80, 100], [photo_width - 80, photo_height - 100], [80, photo_height - 100]])
    if variant == "strip":
        corners[:, 1] = [90, 90, 330, 330]
    if variant == "perspective_left":
        corners = np.float32([[145, 75], [720, 165], [690, 1030], [45, 940]])
    if variant == "perspective_right":
        corners = np.float32([[60, 160], [650, 65], [750, 980], [120, 1030]])
    if variant == "clipped":
        corners = np.float32([[-35, 50], [730, 80], [735, 1040], [-25, 1010]])
    source = np.float32([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]])
    transform = cv2.getPerspectiveTransform(source, corners)
    image_array = cv2.warpPerspective(np.asarray(paper), transform, (photo_width, photo_height), flags=cv2.INTER_LINEAR, borderValue=(70, 83, 94))
    photo = Image.fromarray(image_array)
    if variant == "shadow":
        shade = np.linspace(0.55, 1.0, photo_width)[None, :, None]
        photo = Image.fromarray((image_array * shade).clip(0, 255).astype("uint8"))
    if variant == "dark":
        photo = ImageEnhance.Brightness(photo).enhance(0.22)
    if variant == "glare":
        ImageDraw.Draw(photo).ellipse((170, 160, 700, 640), fill="white")
    if variant == "blur":
        photo = photo.filter(ImageFilter.GaussianBlur(9))
    if variant == "curved":
        result = np.asarray(photo).copy()
        for y in range(photo_height):
            result[y] = np.roll(result[y], int(30 * np.sin(y / 85)), axis=0)
        photo = Image.fromarray(result)
    if variant == "two_pages":
        photo = Image.new("RGB", (800, 1100), (70, 83, 94))
        photo.paste(paper.resize((340, 460)), (30, 60))
        photo.paste(paper.resize((340, 460)), (420, 550))
    if variant == "rectangles":
        ImageDraw.Draw(photo).rectangle((20, 20, 780, 1080), outline="black", width=8)
    orientation = case.get("exif", 1)
    inverse = {2: Image.Transpose.FLIP_LEFT_RIGHT, 3: Image.Transpose.ROTATE_180, 4: Image.Transpose.FLIP_TOP_BOTTOM, 5: Image.Transpose.TRANSPOSE, 6: Image.Transpose.ROTATE_90, 7: Image.Transpose.TRANSVERSE, 8: Image.Transpose.ROTATE_270}
    exif = Image.Exif()
    exif[274] = orientation
    if orientation in inverse:
        photo = photo.transpose(inverse[orientation])
    output = BytesIO()
    photo.save(output, format="PNG", exif=exif)
    normalized = tuple((float(x / photo_width), float(y / photo_height)) for x, y in corners)
    return ScanFixture(case["id"], output.getvalue(), (photo_width, photo_height), normalized, tuple(marks), bool(case["automatic_subset"]))
