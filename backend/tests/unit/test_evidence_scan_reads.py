"""Versioned readers must never substitute or disclose a camera original."""
from hashlib import sha256
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from fastapi import HTTPException
from PIL import Image
import pytest

from app.core.config import settings
from app.modules.authorization.catalog import default_permissions_for_role
from app.modules.calificaciones import router
from app.modules.calificaciones.evidence_manifest import EvidenceAsset, EvidenceManifest, ScanSubmission
from app.modules.calificaciones.evidence_preparation import (
    ScanAdmissionContext, inspect_scan_source, persist_scan_sources, prepared_manifest_page,
)
from app.services.evidence_scan import prepare_evidence_original
from app.services.storage_service import resolve_private_upload_path, save_private_evidence_asset


async def sample(tmp_path, monkeypatch, *, prepared=True):
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    buffer = BytesIO()
    Image.new("RGB", (80, 120), "white").save(buffer, format="PNG")
    content = buffer.getvalue()
    context = ScanAdmissionContext(*(uuid4() for _ in range(6)))
    decision = ScanSubmission.model_validate({"schema_version": 1, "pages": [{"page_id": str(uuid4()), "decision": "original", "rotation": 0, "confirmed": True}]})
    manifest = await persist_scan_sources(context, decision, (inspect_scan_source(content),))
    if prepared:
        result = prepare_evidence_original(content)
        key = await save_private_evidence_asset(result.content, result.mime, category="prepared", asset_id=uuid4())
        asset = EvidenceAsset(key=key, sha256=sha256(result.content).hexdigest(), mime=result.mime, size_bytes=len(result.content), width=result.width, height=result.height)
        page = prepared_manifest_page(manifest.pages[0], asset, result.source_to_prepared)
        manifest = EvidenceManifest.model_validate({**manifest.model_dump(mode="json"), "pages": [page.model_dump(mode="json")], "state": "prepared"})
    delivery = SimpleNamespace(id=context.delivery_id, evaluacion_id=context.evaluacion_id, estudiante_id=context.estudiante_id,
                               materia_id=context.materia_id, archivo_url="/uploads/" + manifest.pages[0].source.key,
                               evidencia_manifiesto=manifest.model_dump(mode="json"))
    teacher = SimpleNamespace(id=context.actor_id, rol="profesor", _effective_permissions=default_permissions_for_role("profesor"))
    student = SimpleNamespace(id=context.estudiante_id, rol="estudiante", _effective_permissions=default_permissions_for_role("estudiante"))
    authorized = AsyncMock()
    monkeypatch.setattr(router.evaluaciones_service, "ensure_can_manage_evaluation", authorized)
    return delivery, manifest, teacher, student, SimpleNamespace(scalar=AsyncMock(return_value=delivery)), authorized


@pytest.mark.asyncio
async def test_manifest_read_serves_verified_prepared_bytes_not_internal_raw_url(tmp_path, monkeypatch):
    delivery, manifest, teacher, _, db, _ = await sample(tmp_path, monkeypatch)
    response = await router.get_entrega_evidencia_page(delivery.id, 1, current_user=teacher, db=db)
    assert response.body == resolve_private_upload_path(manifest.pages[0].prepared.key).read_bytes()
    assert response.headers["cache-control"] == "private, no-store"
    assert response.headers["x-evidence-variant"] == "preparada"
    token = response.headers["x-evidence-version"]
    # A canonical region cannot be reused over an original, even for the owner.
    with pytest.raises(HTTPException) as stale:
        await router.get_entrega_evidencia_page(delivery.id, 1, version="original", evidencia_version=token, current_user=teacher, db=db)
    assert stale.value.status_code == 409
    resolve_private_upload_path(manifest.pages[0].prepared.key).write_bytes(b"changed")
    with pytest.raises(HTTPException) as changed:
        await router.get_entrega_evidencia_page(delivery.id, 1, current_user=teacher, db=db)
    assert changed.value.status_code == 409


@pytest.mark.asyncio
async def test_own_student_never_reads_new_original_or_exif(tmp_path, monkeypatch):
    delivery, _, _, student, db, _ = await sample(tmp_path, monkeypatch, prepared=False)
    for endpoint, extra in [(router.get_entrega_evidencia, {}), (router.get_entrega_evidencia_page, {"numero": 1})]:
        with pytest.raises(HTTPException) as denied:
            await endpoint(delivery.id, version="original", current_user=student, db=db, **extra)
        assert denied.value.status_code == 403
        with pytest.raises(HTTPException) as waiting:
            await endpoint(delivery.id, current_user=student, db=db, **extra)
        assert waiting.value.status_code == 409


@pytest.mark.asyncio
async def test_permission_checked_before_reading_original_and_corrupt_never_falls_back(tmp_path, monkeypatch):
    delivery, _, teacher, _, db, authorized = await sample(tmp_path, monkeypatch)
    authorized.side_effect = HTTPException(403, "Sin acceso")
    with pytest.raises(HTTPException) as denied:
        await router.get_entrega_evidencia(delivery.id, version="original", current_user=teacher, db=db)
    assert denied.value.status_code == 403
    authorized.side_effect = None
    response = await router.get_entrega_evidencia(delivery.id, version="original", current_user=teacher, db=db)
    assert response.body.startswith(b"\x89PNG")
    delivery.evidencia_manifiesto = {"schema_version": 999}
    with pytest.raises(HTTPException) as corrupt:
        await router.get_entrega_evidencia(delivery.id, current_user=teacher, db=db)
    assert corrupt.value.status_code == 409
