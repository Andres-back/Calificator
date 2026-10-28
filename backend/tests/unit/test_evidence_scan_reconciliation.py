"""Synthetic-only recovery checks: uncertain academic assets are never removed."""
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import json
import os
from types import SimpleNamespace
from uuid import uuid4, uuid5

import pytest
import pytest_asyncio

from app.modules.calificaciones.evidence_preparation import inspect_scan_source, persist_scan_sources
from app.modules.calificaciones.evidence_scan_reconciliation import reconcile_scan_receipt
from app.services.storage_service import resolve_private_upload_path
from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture
from tests.unit.test_evidence_preparation import context, submission


class RecoveryDB:
    def __init__(self, *, referenced=False, busy=False, broken=False):
        self.referenced, self.busy, self.broken = referenced, busy, broken
        self.queries = []

    def in_transaction(self):
        return False

    @asynccontextmanager
    async def begin(self):
        yield

    async def execute(self, query, params=None):
        self.queries.append(str(query))

    async def scalar(self, query, params=None):
        self.queries.append(str(query))
        if "pg_try_advisory_xact_lock" in str(query):
            return not self.busy
        if self.broken:
            raise RuntimeError("synthetic database unavailable")
        return self.referenced


@pytest_asyncio.fixture
async def package(tmp_path, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    now = datetime.now(timezone.utc)
    owner, decision = context(), submission()
    source = inspect_scan_source(make_scan_fixture(bank_cases()[0]).content)
    manifest = await persist_scan_sources(owner, decision, (source,))
    receipt_id = uuid5(owner.request_id, f"receipt:{owner.actor_id}")
    receipt_path = resolve_private_upload_path(f".private/evidence-scan/receipts/{receipt_id.hex}.json")
    source_path = resolve_private_upload_path(manifest.pages[0].source.key)
    old = (now - timedelta(days=8)).timestamp()
    for path in (receipt_path, source_path):
        os.utime(path, (old, old))
    return SimpleNamespace(owner=owner, decision=decision, source=source, manifest=manifest, receipt_id=receipt_id,
                           receipt=receipt_path, path=source_path, now=now, root=tmp_path)


@pytest.mark.asyncio
async def test_default_recovery_only_reports_and_checks_all_reference_owners(package):
    db = RecoveryDB()
    result = await reconcile_scan_receipt(db, package.receipt_id, now=package.now)
    assert result.status == "candidate" and package.path.read_bytes() == package.source.content
    sql = " ".join(db.queries)
    for table in ("entregas", "calificacion_revisiones", "ai_jobs", "feedback_publications"):
        assert table in sql
    assert "READ COMMITTED" in sql and "pg_try_advisory_xact_lock" in sql
    assert not (package.root / ".private/evidence-scan-quarantine").exists()


@pytest.mark.asyncio
@pytest.mark.parametrize("reason", ["referenced", "busy", "broken"])
async def test_reference_lease_or_unknown_commit_preserves_all_bytes(package, reason):
    db = RecoveryDB(**{reason: True})
    if reason == "broken":
        with pytest.raises(RuntimeError):
            await reconcile_scan_receipt(db, package.receipt_id, now=package.now, quarantine=True)
    else:
        result = await reconcile_scan_receipt(db, package.receipt_id, now=package.now, quarantine=True)
        assert result.status == reason
    assert package.path.read_bytes() == package.source.content and package.receipt.is_file()


@pytest.mark.asyncio
async def test_explicit_quarantine_is_recoverable_and_same_intention_can_retry(package):
    result = await reconcile_scan_receipt(RecoveryDB(), package.receipt_id, now=package.now, quarantine=True)
    assert result.status == "quarantined" and result.assets == 1
    assert not package.path.exists() and not package.receipt.exists()
    saved = package.root / ".private/evidence-scan-quarantine" / package.receipt_id.hex / "sources" / package.path.name
    assert saved.read_bytes() == package.source.content
    retried = await persist_scan_sources(package.owner, package.decision, (package.source,))
    assert retried.fingerprint == package.manifest.fingerprint
    assert package.path.read_bytes() == package.source.content == saved.read_bytes()


@pytest.mark.asyncio
@pytest.mark.parametrize("change", ["young_source", "young_receipt", "changed_bytes", "old_receipt", "forged_key"])
async def test_uncertain_or_young_files_are_not_quarantined(package, change):
    if change.startswith("young"):
        path = package.path if change == "young_source" else package.receipt
        os.utime(path, (package.now.timestamp(), package.now.timestamp()))
    elif change == "changed_bytes":
        package.path.write_bytes(package.source.content + b"different")
    elif change == "old_receipt":
        package.receipt.write_text('{"schema_version":1}', encoding="utf-8")
    else:
        data = json.loads(package.receipt.read_text())
        data["pages"][0]["source"]["key"] = f".private/evidence-scan/sources/{uuid4().hex}.png"
        package.receipt.write_text(json.dumps(data), encoding="utf-8")
    result = await reconcile_scan_receipt(RecoveryDB(), package.receipt_id, now=package.now, quarantine=True)
    assert result.status in {"young", "unknown"}
    assert package.path.exists() and package.receipt.exists()


@pytest.mark.asyncio
async def test_symlink_and_existing_different_quarantine_are_preserved(package):
    target = package.root / "must-not-touch.png"
    target.write_bytes(package.source.content)
    package.path.unlink()
    package.path.symlink_to(target)
    result = await reconcile_scan_receipt(RecoveryDB(), package.receipt_id, now=package.now, quarantine=True)
    assert result.status == "unknown" and target.read_bytes() == package.source.content


@pytest.mark.asyncio
async def test_never_overwrites_a_different_quarantined_copy(package):
    destination = package.root / ".private/evidence-scan-quarantine" / package.receipt_id.hex / "sources" / package.path.name
    destination.parent.mkdir(parents=True)
    destination.write_bytes(b"different synthetic copy")
    result = await reconcile_scan_receipt(RecoveryDB(), package.receipt_id, now=package.now, quarantine=True)
    assert result.status == "unknown"
    assert destination.read_bytes() == b"different synthetic copy"
    assert package.path.read_bytes() == package.source.content


@pytest.mark.asyncio
async def test_link_persistence_precedes_unlink_and_interrupted_moves_resume(package, monkeypatch):
    from app.modules.calificaciones import evidence_scan_reconciliation as recovery
    original_sync = recovery._sync_directory
    failed = False
    def interrupted(path):
        nonlocal failed
        if not failed:
            failed = True
            raise OSError("synthetic fsync interruption")
        original_sync(path)
    monkeypatch.setattr(recovery, "_sync_directory", interrupted)
    result = await reconcile_scan_receipt(RecoveryDB(), package.receipt_id, now=package.now, quarantine=True)
    assert result.status == "unknown" and package.path.read_bytes() == package.source.content
    assert package.receipt.exists()
    resumed = await reconcile_scan_receipt(RecoveryDB(), package.receipt_id, now=package.now, quarantine=True)
    assert resumed.status == "quarantined" and not package.path.exists()


@pytest.mark.asyncio
async def test_never_reuses_an_open_transaction_as_proof_of_absent_references(package):
    db = RecoveryDB()
    db.in_transaction = lambda: True
    with pytest.raises(ValueError, match="transaction"):
        await reconcile_scan_receipt(db, package.receipt_id, now=package.now, quarantine=True)
    assert package.path.exists() and not db.queries


@pytest.mark.asyncio
async def test_abandoned_staging_moves_only_with_its_verified_intention(package):
    staged = package.path.with_name(f'.{package.path.stem}.{uuid4().hex}.tmp')
    staged.write_bytes(b'partial synthetic upload')
    old = (package.now - timedelta(days=8)).timestamp()
    os.utime(staged, (old, old))
    unrelated = package.path.with_name(f'.{uuid4().hex}.{uuid4().hex}.tmp')
    unrelated.write_bytes(b'unknown intention, must remain')
    os.utime(unrelated, (old, old))
    result = await reconcile_scan_receipt(RecoveryDB(), package.receipt_id, now=package.now, quarantine=True)
    assert result.status == 'quarantined' and result.assets == 2
    assert not staged.exists() and unrelated.read_bytes() == b'unknown intention, must remain'
    saved = package.root / '.private/evidence-scan-quarantine' / package.receipt_id.hex / 'sources' / staged.name
    assert saved.read_bytes() == b'partial synthetic upload'
