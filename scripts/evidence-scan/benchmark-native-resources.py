"""Synthetic-only resource check through the unchanged bounded page process.

Run inside the local QA image with backend on PYTHONPATH; no DB, API keys,
network, real evidence or runtime configuration changes. Output is a JSON
measurement, not an OCR/mark-retention or physical-device certification.
"""
from __future__ import annotations

import asyncio
import hashlib
from io import BytesIO
import json
import resource
import statistics
import tempfile
import time
from uuid import uuid4

from PIL import Image, ImageDraw

from app.core.config import settings
from app.modules.calificaciones.evidence_manifest import EvidenceAsset
from app.services.evidence_scan import ScanRecipe
from app.services.evidence_scan_process import run_page_preparation
from app.services.storage_service import resolve_private_upload_path, save_private_evidence_asset


def photo(format: str, mode: str) -> bytes:
    output = BytesIO()
    with Image.new(mode, (4000, 4000), "white") as image:
        draw = ImageDraw.Draw(image)
        for row in range(80, 3900, 90):
            draw.text((80, row), "SYNTHETIC -0.5 + 1.25 = 0.75 | A B (X) D", fill=(70, 70, 70), font_size=48)
            draw.line((80, row + 68, 3900, row + 68), fill=(155, 155, 155), width=2)
        if mode == "RGBA":
            draw.rectangle((20, 20, 60, 60), fill=(20, 70, 120, 128))
        image.save(output, format=format, **({"quality": 92} if format == "JPEG" else {}))
    return output.getvalue()


async def measure() -> dict:
    results = []
    with tempfile.TemporaryDirectory(prefix="spec131-resources-") as root:
        settings.UPLOADS_DIR = root
        for format, mode in [("JPEG", "RGB"), ("PNG", "RGB"), ("PNG", "RGBA")]:
            content = photo(format, mode)
            mime = "image/jpeg" if format == "JPEG" else "image/png"
            key = await save_private_evidence_asset(content, mime, category="sources", asset_id=uuid4())
            digest = hashlib.sha256(content).hexdigest()
            asset = EvidenceAsset(key=key, sha256=digest, mime=mime, size_bytes=len(content), width=4000, height=4000)
            for profile in ["original", "natural", "lectura_suave"]:
                recipe = None if profile == "original" else ScanRecipe(width=4000, height=4000,
                    corners=((0., 0.), (1., 0.), (1., 1.), (0., 1.)), profile=profile)
                durations, errors, sizes = [], [], []
                for _attempt in range(3):
                    started = time.monotonic()
                    try:
                        result = await run_page_preparation(asset, recipe=recipe, rotation=0)
                        assert result.source_sha256 == digest
                        assert max(result.width, result.height) <= 2200
                        sizes.append(len(result.content))
                    except Exception as error:
                        errors.append({"type": type(error).__name__, "message": str(error)})
                    durations.append(round((time.monotonic() - started) * 1000))
                assert resolve_private_upload_path(key).read_bytes() == content
                results.append({"format": format, "mode": mode, "pixels": 16_000_000, "profile": profile,
                    "attempts": 3, "success": len(sizes), "failures": errors, "durations_ms": durations,
                    "median_ms": round(statistics.median(durations)), "max_ms": max(durations),
                    "max_output_bytes": max(sizes, default=0), "source_unchanged": True})
    return {"synthetic_only": True, "real_ai_calls": 0, "page_process_as_limit_mib": 512,
        "page_process_wall_limit_s": 8, "peak_child_rss_kib": resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss,
        "results": results}


if __name__ == "__main__":
    print(json.dumps(asyncio.run(measure()), separators=(",", ":")))
