from pathlib import Path
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
import yaml

from app.modules.feedback_sharing import chat_service
from app.workers.worker import celery_app


def test_feedback_queue_is_isolated_bounded_and_registered():
    from app.workers.tasks_feedback_chat import feedback_question

    assert "app.workers.tasks_feedback_chat" in celery_app.conf.include
    assert celery_app.conf.task_routes["tasks.feedback_question"]["queue"] == "feedback"
    assert celery_app.conf.task_routes["tasks.grade_delivery"]["queue"] == "grading"
    assert celery_app.conf.beat_schedule["recover-feedback-questions"]["task"] == "tasks.recover_feedback_questions"
    assert feedback_question.max_retries == 0 and feedback_question.time_limit == 75
    compose = yaml.safe_load((Path(__file__).resolve().parents[3] / "docker-compose.yml").read_text(encoding="utf-8"))
    command = compose["services"]["worker-feedback"]["command"]
    assert "-Q feedback " in command and "--concurrency=1" in command
    assert "feedback" not in compose["services"]["worker-grading"]["command"]


def test_dispatch_transports_only_uuid_and_never_secret_prompt_or_celery_result(monkeypatch):
    request_id = uuid4()
    connection = MagicMock()
    connection.__enter__.return_value = connection
    connect, send = MagicMock(return_value=connection), MagicMock()
    monkeypatch.setattr(celery_app, "connection_for_write", connect)
    monkeypatch.setattr(celery_app, "send_task", send)
    chat_service._send_task(request_id)
    args, kwargs = send.call_args
    assert args == ("tasks.feedback_question",)
    assert kwargs["args"] == [str(request_id)]
    assert kwargs["retry"] is False and kwargs["ignore_result"] is True
    assert kwargs["queue"] == "feedback" and kwargs["expires"] == 300
    connect.assert_called_once_with(connect_timeout=2)


@pytest.mark.asyncio
async def test_broker_exception_does_not_claim_success(monkeypatch):
    def fail(*args):
        raise RuntimeError("Synthetic broker down")

    monkeypatch.setattr(chat_service, "_send_task", fail)
    assert await chat_service.dispatch_question(uuid4()) is False


@pytest.mark.asyncio
async def test_feature_off_worker_does_not_open_database_or_infer(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.FEEDBACK_SHARING_ENABLED", False)

    def forbidden():
        pytest.fail("Flag apagada no debe abrir tablas nuevas")

    assert await chat_service.run_request(uuid4(), sessions=forbidden) == "disabled"
