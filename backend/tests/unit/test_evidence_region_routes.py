import asyncio
import hashlib
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from PIL import Image

from app.modules.authorization.catalog import default_permissions_for_role
from app.modules.calificaciones import router, evidence_service
from app.modules.calificaciones.models import Entrega
from app.services.answer_evidence_regions import evidence_version


def test_page_version_is_checked_after_permission_and_never_serves_a_different_file(tmp_path, monkeypatch):
    image = tmp_path / "photo.png"
    Image.new("RGB", (80, 120), "white").save(image)
    delivery = Entrega(id=uuid4(), evaluacion_id=uuid4(), materia_id=uuid4(), estudiante_id=uuid4(), tipo="foto", estado="recibida", archivo_url="/uploads/entregas/synthetic.png")
    actor = SimpleNamespace(id=uuid4(), rol="profesor", _effective_permissions=default_permissions_for_role("profesor"))
    db = SimpleNamespace(scalar=AsyncMock(return_value=delivery))
    authorized = AsyncMock()
    monkeypatch.setattr(router.evaluaciones_service, "ensure_can_manage_evaluation", authorized)
    monkeypatch.setattr(router, "resolve_upload_path", lambda _url: image)
    monkeypatch.setattr(evidence_service, "get_upload_dir", lambda: tmp_path)
    version = evidence_version(delivery.id, hashlib.sha256(image.read_bytes()).hexdigest())
    response = asyncio.run(router.get_entrega_evidencia_page(delivery.id, 1, evidencia_version=version, current_user=actor, db=db))
    authorized.assert_awaited_once()
    assert response.headers["x-evidence-version"] == version
    assert response.headers["x-evidence-page"] == "1"
    assert response.headers["cache-control"] == "private, no-store"
    Image.new("RGB", (80, 120), "red").save(image)
    with pytest.raises(HTTPException) as changed:
        asyncio.run(router.get_entrega_evidencia_page(delivery.id, 1, evidencia_version=version, current_user=actor, db=db))
    assert changed.value.status_code == 409

    authorized.side_effect = HTTPException(403, "Sin acceso")
    with pytest.raises(HTTPException) as denied:
        asyncio.run(router.get_entrega_evidencia_page(delivery.id, 1, evidencia_version=version, current_user=actor, db=db))
    assert denied.value.status_code == 403


def test_version_reference_does_not_grant_access_to_another_student(tmp_path, monkeypatch):
    delivery = Entrega(id=uuid4(), evaluacion_id=uuid4(), materia_id=uuid4(), estudiante_id=uuid4(), tipo="foto", estado="recibida", archivo_url="/uploads/synthetic.png")
    actor = SimpleNamespace(id=uuid4(), rol="estudiante", _effective_permissions=default_permissions_for_role("estudiante"))
    db = SimpleNamespace(scalar=AsyncMock(return_value=delivery))
    renderer = AsyncMock()
    monkeypatch.setattr(router, "run_in_threadpool", renderer)
    with pytest.raises(HTTPException) as denied:
        asyncio.run(router.get_entrega_evidencia_page(delivery.id, 1, evidencia_version="a" * 32, current_user=actor, db=db))
    assert denied.value.status_code == 403
    renderer.assert_not_awaited()
