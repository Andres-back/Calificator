from hashlib import sha256
from uuid import uuid4

import pytest

from app.services.storage_service import (
    PrivateEvidenceConflict, resolve_private_upload_path, save_private_evidence_asset,
)


@pytest.mark.asyncio
async def test_private_evidence_write_is_atomic_idempotent_and_never_overwrites(tmp_path, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    identity = uuid4()
    source = b"\x89PNG\r\n\x1a\nsynthetic-only"
    key = await save_private_evidence_asset(source, "image/png", category="sources", asset_id=identity)
    assert key == f".private/evidence-scan/sources/{identity.hex}.png"
    assert resolve_private_upload_path(key).read_bytes() == source
    assert await save_private_evidence_asset(source, "image/png", category="sources", asset_id=identity) == key
    with pytest.raises(PrivateEvidenceConflict):
        await save_private_evidence_asset(source + b"changed", "image/png", category="sources", asset_id=identity)
    assert sha256(resolve_private_upload_path(key).read_bytes()).digest() == sha256(source).digest()
    assert not list(tmp_path.rglob("*.tmp"))


@pytest.mark.asyncio
async def test_private_receipt_cannot_change_payload_under_the_same_intention(tmp_path, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    identity = uuid4()
    key = await save_private_evidence_asset(b'{"fingerprint":"synthetic"}', "application/json", category="receipts", asset_id=identity)
    assert resolve_private_upload_path(key).suffix == ".json"
    with pytest.raises(PrivateEvidenceConflict):
        await save_private_evidence_asset(b'{"fingerprint":"different"}', "application/json", category="receipts", asset_id=identity)


@pytest.mark.asyncio
async def test_private_evidence_writer_rejects_wrong_categories_and_size_before_writing(tmp_path, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    for category, mime in [("../../other", "image/png"), ("prepared", "image/png"), ("sources", "application/pdf"), ("receipts", "image/jpeg")]:
        with pytest.raises(ValueError):
            await save_private_evidence_asset(b"synthetic", mime, category=category, asset_id=uuid4())
    with pytest.raises(ValueError):
        await save_private_evidence_asset(b"x" * 16385, "application/json", category="receipts", asset_id=uuid4())
    assert not list(tmp_path.rglob("*"))
