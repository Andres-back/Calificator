"""Operator-only, reference-aware recovery; audit by default, no hard deletion.

Only abandoned *initial* admissions can be retired. Any surviving delivery,
history, publication or job protects the complete intention, even a terminal job
or a derivative not checkpointed yet. Unknown/old receipts remain untouched.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import os
from pathlib import Path
import re
from typing import Literal
from uuid import UUID, uuid5

from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import text

from app.modules.calificaciones.evidence_manifest import EvidenceManifest, ManifestPage, manifest_fingerprint, scan_request_lock_key
from app.services.evidence_scan import ALGORITHM
from app.services.storage_service import MIME_EXTENSIONS, get_upload_dir, resolve_private_upload_path


class ScanReceipt(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    schema_version: Literal[2]
    request_id: UUID
    actor_id: UUID
    delivery_id: UUID
    evaluacion_id: UUID
    estudiante_id: UUID
    materia_id: UUID
    algorithm: Literal[ALGORITHM]
    fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")
    pages: tuple[ManifestPage, ...] = Field(min_length=1, max_length=10)

    @model_validator(mode="after")
    def known_sources(self):
        if manifest_fingerprint(self.model_dump(mode="json")) != self.fingerprint:
            raise ValueError("Invalid admission receipt")
        if len({page.page_id for page in self.pages}) != len(self.pages) or sum(page.source.size_bytes for page in self.pages) > 40 * 1024 * 1024:
            raise ValueError("Invalid admission pages")
        for page in self.pages:
            identity = uuid5(self.request_id, f"source:{self.actor_id}:{page.page_id}:{page.source.sha256}")
            expected = f".private/evidence-scan/sources/{identity.hex}{MIME_EXTENSIONS[page.source.mime]}"
            if page.source.key != expected or page.prepared is not None or page.source_to_prepared is not None:
                raise ValueError("Unverified receipt asset")
        return self

    @classmethod
    def from_manifest(cls, manifest: EvidenceManifest):
        names = cls.model_fields.keys() - {"schema_version"}
        return cls.model_validate({"schema_version": 2, **{key: value for key, value in manifest.model_dump(mode="json").items() if key in names}})

    @property
    def identity(self) -> UUID:
        return uuid5(self.request_id, f"receipt:{self.actor_id}")

    def asset_keys(self) -> tuple[str, ...]:
        keys = [page.source.key for page in self.pages]
        for page in self.pages:
            identity = uuid5(self.request_id, f"prepared:{self.actor_id}:{page.page_id}:{self.fingerprint}:{self.algorithm}")
            keys.append(f".private/evidence-scan/prepared/{identity.hex}.jpg")
        consultation = uuid5(self.request_id, f"consultation:{self.fingerprint}")
        keys.append(f".private/evidence-scan/consultations/{consultation.hex}.{'pdf' if len(self.pages) > 1 else 'jpg'}")
        return tuple(keys)


@dataclass(frozen=True)
class ScanRecoveryResult:
    status: Literal["young", "busy", "referenced", "candidate", "quarantined", "unknown"]
    assets: int = 0


def _safe_path(key: str) -> Path:
    expected = get_upload_dir().resolve() / key
    actual = resolve_private_upload_path(key)
    if expected != actual or any(path.is_symlink() for path in [expected, *expected.parents] if path != get_upload_dir().resolve()):
        raise ValueError("Unverified recovery path")
    return actual


def _digest(path: Path, limit: int) -> tuple[int, str]:
    if not path.is_file() or path.stat().st_size > limit:
        raise ValueError("Unverified recovery asset")
    digest, size = hashlib.sha256(), 0
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            size += len(chunk)
            if size > limit:
                raise ValueError("Recovery asset exceeds budget")
            digest.update(chunk)
    return size, digest.hexdigest()


def _sync_directory(path: Path) -> None:
    if hasattr(os, "O_DIRECTORY"):
        descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)


def _read_receipt(identity: UUID) -> tuple[ScanReceipt, bytes, Path]:
    path = _safe_path(f".private/evidence-scan/receipts/{identity.hex}.json")
    if not path.is_file() or path.stat().st_size > 16_384:
        raise ValueError("Unknown admission receipt")
    with path.open("rb") as stream:
        content = stream.read(16_385)
    receipt = ScanReceipt.model_validate_json(content)
    if len(content) > 16_384 or receipt.identity != identity:
        raise ValueError("Unverified admission identity")
    return receipt, content, path


def _retire(receipt: ScanReceipt, original: bytes, path: Path, deadline: float, apply: bool) -> ScanRecoveryResult:
    current, content, current_path = _read_receipt(receipt.identity)
    if current != receipt or content != original or current_path != path:
        return ScanRecoveryResult("unknown")
    if path.stat().st_mtime > deadline:
        return ScanRecoveryResult("young")
    known_sources = {page.source.key: page.source for page in receipt.pages}
    receipt_key = f".private/evidence-scan/receipts/{receipt.identity.hex}.json"
    keys = list(receipt.asset_keys())
    for key in (*keys, receipt_key):
        published = _safe_path(key)
        staged = []
        for candidate in published.parent.glob(f'.{published.stem}.*.tmp'):
            if re.fullmatch(rf'\.{published.stem}\.[a-f0-9]{{32}}\.tmp', candidate.name):
                staged.append(f'{key.rsplit("/", 1)[0]}/{candidate.name}')
                if len(staged) > 5:
                    return ScanRecoveryResult('unknown')
        keys.extend(staged)
    keys.append(receipt_key)
    plan = []
    for key in keys:
        source = _safe_path(key)
        category = key.split("/")[-2]
        destination = _safe_path(f".private/evidence-scan-quarantine/{receipt.identity.hex}/{category}/{source.name}")
        limit = 16_384 if category == "receipts" else 10 * 1024 * 1024 if category == "sources" else 2_500_000 if category == "prepared" else 40 * 1024 * 1024
        if source.exists():
            if source.stat().st_mtime > deadline:
                return ScanRecoveryResult("young")
            signature = _digest(source, limit)
            if key in known_sources and signature != (known_sources[key].size_bytes, known_sources[key].sha256):
                return ScanRecoveryResult("unknown")
            if destination.exists() and _digest(destination, limit) != signature:
                return ScanRecoveryResult("unknown")
            plan.append((source, destination))
        elif destination.exists():
            signature = _digest(destination, limit)
            if key in known_sources and signature != (known_sources[key].size_bytes, known_sources[key].sha256):
                return ScanRecoveryResult("unknown")
        # Missing files also occur after an interrupted pre-commit upload. They
        # do not authorize touching any file outside this validated receipt.
    if not apply:
        return ScanRecoveryResult("candidate", max(0, len(plan) - 1))
    for source, destination in plan:  # Receipt last: partial moves are resumable.
        destination.parent.mkdir(parents=True, exist_ok=True)
        # link/unlink never overwrites an earlier quarantine; a crash leaves at
        # least one complete copy. No unlink of an unreferenced asset is final.
        if not destination.exists():
            os.link(source, destination)
        with destination.open("rb") as saved:
            os.fsync(saved.fileno())
        uploads_root = get_upload_dir().resolve()
        for directory in (destination.parent, *destination.parent.parents):
            _sync_directory(directory)
            if directory == uploads_root:
                break
        source.unlink()
        _sync_directory(source.parent)
    return ScanRecoveryResult("quarantined", max(0, len(plan) - 1))


REFERENCE_QUERY = text("""
SELECT EXISTS (
 SELECT 1 FROM entregas WHERE id=CAST(:delivery AS uuid)
    OR CAST(evidencia_manifiesto AS text) LIKE ANY(CAST(:references AS text[]))
    OR archivo_url LIKE ANY(CAST(:references AS text[]))
 UNION ALL SELECT 1 FROM calificacion_revisiones WHERE id=CAST(:request AS uuid)
    OR CAST(snapshot_json AS text) LIKE ANY(CAST(:references AS text[]))
    OR archivo_url LIKE ANY(CAST(:references AS text[]))
 UNION ALL SELECT 1 FROM ai_jobs WHERE entrega_id=CAST(:delivery AS uuid)
    OR CAST(input_json AS text) LIKE ANY(CAST(:references AS text[]))
    OR CAST(resultado_json AS text) LIKE ANY(CAST(:references AS text[]))
 UNION ALL SELECT 1 FROM feedback_publications
    WHERE CAST(payload_json AS text) LIKE ANY(CAST(:references AS text[]))
)
""")


async def reconcile_scan_receipt(db, identity: UUID, *, now: datetime | None = None, quarantine: bool = False) -> ScanRecoveryResult:
    if db.in_transaction():
        raise ValueError("Recovery requires a fresh transaction")
    if not isinstance(identity, UUID) or type(quarantine) is not bool:
        raise ValueError("Invalid recovery request")
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise ValueError("Recovery requires an aware timestamp")
    try:
        receipt, content, path = await run_in_threadpool(_read_receipt, identity)
    except (OSError, ValueError):
        return ScanRecoveryResult("unknown")
    # Grace for staging is not an academic retention policy. Nothing runs on a
    # schedule, and quarantine has no automatic expiry/permanent deletion.
    deadline = (now - timedelta(days=7)).timestamp()
    async with db.begin():
        await db.execute(text("SET TRANSACTION ISOLATION LEVEL READ COMMITTED"))
        owned = await db.scalar(text("SELECT pg_try_advisory_xact_lock(:key)"), {"key": scan_request_lock_key(receipt.request_id)})
        if owned is not True:
            return ScanRecoveryResult("busy")
        # Obtaining the same admission lock proves earlier transactions ended.
        # Read after acquiring it, not from a prior/snapshot transaction. A lost
        # commit acknowledgement with a real delivery/job always stays protected.
        references = (str(receipt.request_id), *receipt.asset_keys(), *(Path(key).stem for key in receipt.asset_keys()))
        referenced = await db.scalar(REFERENCE_QUERY, {"delivery": str(receipt.delivery_id), "request": str(receipt.request_id),
            "references": [f"%{value}%" for value in references]})
        if referenced is not False:
            return ScanRecoveryResult("referenced")
        try:
            return await run_in_threadpool(_retire, receipt, content, path, deadline, quarantine)
        except (OSError, ValueError):
            return ScanRecoveryResult("unknown")
