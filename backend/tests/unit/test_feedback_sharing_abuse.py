from unittest.mock import AsyncMock

from fastapi import HTTPException
import pytest

from app.modules.feedback_sharing import chat_service


@pytest.mark.asyncio
async def test_public_transport_guard_limits_attempts_without_using_student_quota(monkeypatch):
    from starlette.requests import Request
    from app.core import rate_limit as limits
    from app.modules.feedback_sharing.public_router import limit_feedback_access

    redis = AsyncMock()
    redis.eval.return_value = [1801, 21]
    monkeypatch.setattr(limits, '_redis_client', lambda: redis)
    request = Request({'type': 'http', 'method': 'GET', 'path': '/api/public/devolucion', 'headers': [], 'client': ('127.0.0.1', 1234)})
    with pytest.raises(HTTPException) as exc:
        await limit_feedback_access(request)
    assert exc.value.status_code == 429 and exc.value.headers['Retry-After'] == '21'
    assert 'credential' not in str(redis.eval.call_args) and 'Bearer' not in str(redis.eval.call_args)


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
