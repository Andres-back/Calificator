from unittest.mock import AsyncMock

from fastapi import HTTPException
import pytest

from app.modules.feedback_sharing import chat_service


@pytest.mark.asyncio
async def test_global_capacity_is_independent_of_student_quota_and_fail_closed(monkeypatch):
    db = AsyncMock()
    check_token = AsyncMock()
    admission = AsyncMock(side_effect=HTTPException(503, "Ocupado"))
    monkeypatch.setattr(chat_service, "guard_token", check_token)
    monkeypatch.setattr(chat_service, "accept_question", admission)
    with pytest.raises(HTTPException) as exc:
        await chat_service.admit_question(db, "synthetic-credential", "payload")
    assert exc.value.status_code == 503
    admission.assert_awaited_once_with(db, "synthetic-credential", "payload", max_pending=60)
    assert "feedback_admission" in str(db.execute.call_args.args[0])


def test_context_and_inference_have_finite_separate_limits():
    assert chat_service.MAX_CONTEXT_CHARS == 24000
    assert chat_service.MAX_RESPONSE_CHARS == 8000
    assert chat_service.INFERENCE_TIMEOUT_SECONDS < chat_service.UNCERTAIN_AFTER_SECONDS < chat_service.QUEUE_TIMEOUT_SECONDS
