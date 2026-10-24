"""Package reviewed assets. No AI, network, private files or runtime dependencies.

FFmpeg only makes mechanical size/format derivatives; Pillow is read-only QA.
Partial catalogues are for local development only. --check-complete gates delivery.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "backend/app/assets/motif_library"
PROMPTS = ROOT / "specs/123-motivos-por-area/generated-prompts.json"
ORIGINALS = ROOT / "output/imagegen/spec123/originals"
GENERAL_NAMES = [("libro", "Libro"), ("lapices", "Lápices"), ("idea", "Idea"), ("cohete", "Cohete"), ("planeta", "Planeta"), ("microscopio", "Microscopio"), ("atomo", "Átomo"), ("calculadora", "Calculadora"), ("geometria", "Geometría"), ("globo", "Globo terráqueo"), ("brote", "Brote"), ("origami", "Origami"), ("montana", "Montaña"), ("olas", "Olas"), ("brujula", "Brújula"), ("cometa", "Cometa"), ("musica", "Música"), ("piezas", "Piezas"), ("telescopio", "Telescopio"), ("arte", "Arte")]


def inspect(path: Path, *, thumbnail: bool = False) -> dict:
    with Image.open(path) as image:
        if image.mode != "RGBA":
            raise ValueError(f"Missing alpha: {path.name}")
        alpha = image.getchannel("A")
        if alpha.getextrema() != (0, 255) or any(alpha.getpixel(point) for point in ((0, 0), (image.width - 1, 0), (0, image.height - 1), (image.width - 1, image.height - 1))):
            raise ValueError(f"Transparent corners required: {path.name}")
        width, height = image.size
    size = path.stat().st_size
    if size > (61_440 if thumbnail else 307_200):
        raise ValueError(f"Asset over transfer budget: {path.name}")
    return {"filename": path.relative_to(ASSETS).as_posix(), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "size_bytes": size, "width": width, "height": height, "mime": "image/png" if path.suffix == ".png" else "image/webp"}


def derivative(source: Path, target: Path, size: int, quality: int) -> Path:
    budget = 61_440 if size <= 240 else 307_200
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("FFmpeg is required to prepare assets locally")
    target.parent.mkdir(parents=True, exist_ok=True)
    def convert(destination: Path, setting: int, *, padding: bool = False) -> None:
        filters = f"scale={size}:{size}:force_original_aspect_ratio=decrease"
        if padding:
            filters += ",pad=iw+4:ih+4:2:2:color=black@0"
        subprocess.run([ffmpeg, "-loglevel", "error", "-n", "-i", str(source), "-vf", filters, "-c:v", "libwebp", "-quality", str(setting), "-compression_level", "6", str(destination)], check=True)

    def finish(candidate: Path, setting: int) -> Path:
        with Image.open(candidate) as picture:
            if picture.mode != "RGBA":
                return candidate  # inspect() rejects missing transparency.
            alpha = picture.getchannel("A")
            corners = ((0, 0), (picture.width - 1, 0), (0, picture.height - 1), (picture.width - 1, picture.height - 1))
            if not any(alpha.getpixel(point) for point in corners):
                return candidate
        # Mechanical transparent margin only: never remove/repaint a background.
        padded = candidate.with_stem(candidate.stem + "-padded")
        if not padded.exists():
            convert(padded, setting, padding=True)
        return padded

    if not target.exists():
        convert(target, quality)
    if target.stat().st_size <= budget:
        return finish(target, quality)
    # One bounded mechanical compression pass, never another AI request.
    compact = target.with_stem(target.stem + "-compact")
    if not compact.exists():
        convert(compact, 60)
    if compact.stat().st_size > budget:
        raise ValueError(f"Asset still over budget after compact pass: {source.name}")
    return finish(compact, 60)


def prepare(reviewed: set[str]) -> dict:
    prompts = json.loads(PROMPTS.read_text(encoding="utf-8"))
    known = {item["id"] for item in prompts["motifs"]}
    if reviewed - known:
        raise ValueError("Unknown reviewed motif ID")
    motifs = []
    for motif_id, label in GENERAL_NAMES:
        source = ROOT / "frontend/public/assets/feedback-motifs" / f"{motif_id}.png"
        full = ASSETS / "general" / f"{motif_id}-full.png"
        thumbnail = ASSETS / "general" / f"{motif_id}-thumbnail.webp"
        full.parent.mkdir(parents=True, exist_ok=True)
        if not full.exists():
            shutil.copy2(source, full)
        if full.read_bytes() != source.read_bytes():
            raise ValueError(f"General motif must be unchanged: {motif_id}")
        thumbnail = derivative(source, thumbnail, 240, 78)
        motifs.append({"id": motif_id, "collection_id": "general", "label": label, "description": label + ": motivo decorativo general", "full": inspect(full), "thumbnail": inspect(thumbnail, thumbnail=True)})
    for item in prompts["motifs"]:
        if item["id"] not in reviewed:
            continue
        original_path = item.get("source", {}).get("original_path")
        source = (ROOT / original_path).resolve() if original_path else ORIGINALS / f"{item['id']}.png"
        if not source.resolve().is_relative_to(ORIGINALS.resolve()):
            raise ValueError("Source must remain inside the reviewed originals directory")
        with Image.open(source) as image:
            if min(image.size) < 1024:
                raise ValueError(f"Original too small: {item['id']}")
        full = ASSETS / item["collection_id"] / f"{item['id']}-full.webp"
        thumbnail = ASSETS / item["collection_id"] / f"{item['id']}-thumbnail.webp"
        full = derivative(source, full, 1024, 82)
        thumbnail = derivative(source, thumbnail, 240, 78)
        motifs.append({"id": item["id"], "collection_id": item["collection_id"], "label": item["label"], "description": item["subject"], "full": inspect(full), "thumbnail": inspect(thumbnail, thumbnail=True)})
    used = {item["collection_id"] for item in motifs}
    collections = [{"id": "general", "label": "Generales", "aliases": []}] + [{"id": item["id"], "label": item["label"], "aliases": []} for item in prompts["collections"] if item["id"] in used]
    fingerprint = hashlib.sha256(json.dumps(motifs, sort_keys=True).encode()).hexdigest()[:16]
    return {"version": "123-" + fingerprint, "collections": collections, "motifs": motifs}


def check_complete(catalog: dict) -> None:
    counts = {area["id"]: sum(item["collection_id"] == area["id"] for item in catalog["motifs"]) for area in catalog["collections"]}
    if len(counts) != 11 or counts.get("general") != 20 or any(value != 30 for key, value in counts.items() if key != "general"):
        raise ValueError(f"Catalogue not ready for delivery: {counts}")
    hashes = [item["full"]["sha256"] for item in catalog["motifs"]]
    if len(hashes) != len(set(hashes)):
        raise ValueError("Duplicate images are not new motifs")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reviewed", nargs="*", default=[])
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--check-complete", action="store_true")
    args = parser.parse_args()
    if args.write:
        catalog = prepare(set(args.reviewed))
        if args.check_complete:
            check_complete(catalog)
        (ASSETS / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    else:
        catalog = json.loads((ASSETS / "catalog.json").read_text(encoding="utf-8"))
        if args.check_complete:
            check_complete(catalog)
    print(json.dumps({"catalog_version": catalog["version"], "reviewed_new": len(catalog["motifs"]) - 20, "general": 20, "ready_for_delivery": len(catalog["motifs"]) == 320}))


if __name__ == "__main__":
    main()
