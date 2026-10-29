"""A merged scanner stays inactive until a separately approved activation."""
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.core.config import Settings
from app.modules.calificaciones import evidence_scan_admission as admission


def test_scan_and_visual_help_are_disabled_by_default():
    assert Settings.model_fields["EVIDENCE_SCAN_ENABLED"].default is False
    assert Settings.model_fields["EVIDENCE_CORNER_ASSISTANCE_ENABLED"].default is False


@pytest.mark.parametrize("role", ["profesor", "admin"])
def test_disabled_capability_stays_disabled_even_for_an_allowlisted_actor(monkeypatch, role):
    actor = SimpleNamespace(id=uuid4(), rol=role)
    monkeypatch.setattr(admission.settings, "EVIDENCE_SCAN_ENABLED", False)
    monkeypatch.setattr(admission.settings, "EVIDENCE_SCAN_TEACHER_IDS", str(actor.id))
    assert not admission.scan_enabled_for(actor)
    assert admission.capability(actor)["enabled"] is False


@pytest.mark.asyncio
async def test_disabled_admission_does_not_lock_write_prepare_or_queue(monkeypatch):
    actor = SimpleNamespace(id=uuid4(), rol="profesor")
    monkeypatch.setattr(admission.settings, "EVIDENCE_SCAN_ENABLED", False)
    execute = AsyncMock(side_effect=AssertionError("Disabled admission must not reach the DB"))
    persist = AsyncMock(side_effect=AssertionError("Disabled admission must not persist evidence"))
    enqueue = AsyncMock(side_effect=AssertionError("Disabled admission must not create a job"))
    monkeypatch.setattr(admission, "persist_scan_sources", persist)
    monkeypatch.setattr(admission.grading_queue_service, "enqueue_persisted_grading", enqueue)
    with pytest.raises(HTTPException) as caught:
        await admission.admit_scan_grading(
            SimpleNamespace(execute=execute), evaluation=None, student_id=uuid4(),
            actor=actor, request_id=uuid4(), submission=None, sources=(),
        )
    assert caught.value.status_code == 409
    execute.assert_not_awaited()
    persist.assert_not_awaited()
    enqueue.assert_not_awaited()
