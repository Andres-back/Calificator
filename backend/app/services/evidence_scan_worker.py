"""One bounded page process. No application settings, credentials, DB or network."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import sys


def main() -> int:
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_CPU, (5, 6))
        resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
        raw = sys.stdin.buffer.read(32769)
        if len(raw) > 32768:
            raise ValueError("invalid_request")
        payload = json.loads(raw)
        if set(payload) != {"uploads_root", "source_key", "source_sha256", "recipe", "rotation"}:
            raise ValueError("invalid_request")
        key = payload["source_key"]
        if not isinstance(key, str) or not re.fullmatch(r"\.private/evidence-scan/sources/[a-f0-9]{32}\.(jpg|png|webp)", key):
            raise ValueError("invalid_source")
        root = Path(payload["uploads_root"]).resolve(strict=True)
        source = (root / key).resolve(strict=True)
        if root / ".private" / "evidence-scan" / "sources" not in source.parents:
            raise ValueError("invalid_source")
        with source.open("rb") as stream:
            content = stream.read(10 * 1024 * 1024 + 1)
        if len(content) > 10 * 1024 * 1024 or hashlib.sha256(content).hexdigest() != payload["source_sha256"]:
            raise ValueError("source_changed")
        from app.services.evidence_scan import ScanRecipe, prepare_evidence_original, prepare_evidence_scan
        recipe = ScanRecipe.model_validate(payload["recipe"]) if payload["recipe"] is not None else None
        result = prepare_evidence_scan(content, recipe) if recipe is not None else prepare_evidence_original(content, rotation=payload["rotation"])
        header = {"ok": True, "mime": result.mime, "width": result.width, "height": result.height,
                  "size_bytes": len(result.content), "source_sha256": result.source_sha256,
                  "source_to_prepared": result.source_to_prepared, "algorithm": result.algorithm}
        sys.stdout.buffer.write(json.dumps(header, separators=(",", ":"), allow_nan=False).encode() + b"\n")
        sys.stdout.buffer.write(result.content)
        sys.stdout.buffer.flush()
        return 0
    except Exception as error:
        allowed = {"source_changed", "pixel_budget", "prepared_size_budget", "invalid_source", "source_dimensions_changed", "unsupported_format"}
        code = str(error) if isinstance(error, ValueError) and str(error) in allowed else "preparation_failed"
        # No traceback, paths, EXIF or image bytes in diagnostic output.
        sys.stdout.buffer.write(json.dumps({"ok": False, "code": code}).encode() + b"\n")
        sys.stdout.buffer.flush()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
