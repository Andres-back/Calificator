from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
import pytest
from PIL import Image

from app.core.config import settings
from app.modules.calificaciones.models import Entrega
from app.modules.feedback_sharing.public_router import read_evidence
from app.modules.feedback_sharing.service import create_access, preview_grade
from app.modules.feedback_sharing.service import manage_access
from app.modules.feedback_sharing.schemas import ReactivateInput


@pytest.mark.asyncio
async def test_evidence_is_opt_in_and_private_then_blocked_after_close(fb_db, fb_case, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "FEEDBACK_SHARING_ENABLED", True)
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "UPLOAD_DIR", None)
    teacher, student, subject, evaluation, grade = fb_case
    image = tmp_path / "spec107.png"
    Image.new("RGB", (40, 40), "white").save(image)
    delivery = Entrega(evaluacion_id=evaluation.id, estudiante_id=student.id, materia_id=subject.id, tipo="foto", archivo_url="/uploads/spec107.png", estado="revisada")
    fb_db.add(delivery)
    await fb_db.flush()
    grade.entrega_id = delivery.id
    projection = await preview_grade(fb_db, teacher, evaluation.id, grade.id)
    hidden, hidden_token = await create_access(fb_db, teacher, evaluation.id, grade.id, projection.fingerprint, uuid4(), 3, False)
    with pytest.raises(HTTPException) as exc:
        await read_evidence(1, hidden_token, fb_db)
    assert exc.value.status_code == 404
    visible, token = await create_access(fb_db, teacher, evaluation.id, grade.id, projection.fingerprint, uuid4(), 3, True)
    result = await read_evidence(1, token, fb_db)
    assert result.media_type == "image/png" and result.body.startswith(b"\x89PNG")
    assert result.headers["cache-control"] == "private, no-store"
    assert "location" not in result.headers
    assert Path(image).exists()
    from app.modules.feedback_sharing import public_router
    original_render = public_router.run_in_threadpool
    changed = False

    async def reauthorize_during_render(function, *args):
        nonlocal changed
        result = await original_render(function, *args)
        if not changed:
            changed = True
            await manage_access(fb_db, teacher, visible.id, "reactivate", ReactivateInput(expected_version=1, request_id=uuid4(), fingerprint=projection.fingerprint, evidencia=False))
        return result

    monkeypatch.setattr(public_router, "run_in_threadpool", reauthorize_during_render)
    with pytest.raises(HTTPException) as changed_revision:
        await read_evidence(1, token, fb_db)
    assert changed_revision.value.status_code == 404
    visible.state = "disabled"
    await fb_db.flush()
    with pytest.raises(HTTPException):
        await read_evidence(1, token, fb_db)
