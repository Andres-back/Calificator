import asyncio
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.jobs import service as jobs_service
from app.modules.jobs import router as jobs_router
from app.services import ai_provider_capacity
from app.workers.worker import celery_app


@pytest.mark.parametrize(
    ("task_name", "queue"),
    [
        ("tasks.grade_batch", "grading"),
        ("tasks.grade_delivery", "grading"),
        ("tasks.recover_stale_grading_jobs", "grading"),
        ("tasks.digitalize_evaluation", "digitalization"),
        ("tasks.recover_stale_digitalization_jobs", "digitalization"),
        ("tasks.generate_presentation", "presentations"),
        ("tasks.recover_stale_presentation_jobs", "presentations"),
        ("tasks.generate_image", "presentations"),
    ],
)
def test_worker_routes_expensive_tasks_to_reserved_queues(
    task_name: str, queue: str
) -> None:
    assert celery_app.conf.task_routes[task_name]["queue"] == queue


@pytest.mark.parametrize(
    ("job_type", "payload", "expected_task", "expected_queue"),
    [
        (
            "calificacion_lote",
            {"evaluacion_id": "evaluation", "entrega_ids": ["delivery"]},
            "tasks.grade_batch",
            "grading",
        ),
        (
            "calificacion_entrega",
            {"evaluacion_id": "evaluation", "entrega_ids": ["delivery"]},
            "tasks.grade_delivery",
            "grading",
        ),
        (
            "evaluacion_digitalizacion",
            {
                "materia_id": "subject",
                "file_key": "digitalizaciones/evidence.pdf",
                "filename": "evidence.pdf",
                "nombre": "Evaluation",
                "nota_maxima": "5",
                "modalidad": "papel",
            },
            "tasks.digitalize_evaluation",
            "digitalization",
        ),
        (
            "presentacion",
            {"presentacion_id": "presentation"},
            "tasks.generate_presentation",
            "presentations",
        ),
    ],
)
def test_recovery_republishes_to_the_original_queue(
    monkeypatch: pytest.MonkeyPatch,
    job_type: str,
    payload: dict,
    expected_task: str,
    expected_queue: str,
) -> None:
    send_task = MagicMock()
    monkeypatch.setattr(celery_app, "send_task", send_task)

    accepted = jobs_service.dispatch_persisted_job(
        {
            "id": uuid4(),
            "user_id": uuid4(),
            "tipo": job_type,
            "input_json": payload,
        }
    )

    assert accepted is True
    assert send_task.call_args.args[0] == expected_task
    assert send_task.call_args.kwargs["queue"] == expected_queue


def test_provider_capacity_acquires_and_releases_a_renewable_slot(monkeypatch) -> None:
    class FakeRedis:
        def __init__(self) -> None:
            self.acquired: list[str] = []
            self.scripts: list[str] = []

        async def set(self, key, _token, **_kwargs):
            self.acquired.append(key)
            return True

        async def eval(self, script, *_args):
            self.scripts.append(script)
            return 1

        async def aclose(self):
            return None

    redis = FakeRedis()
    monkeypatch.setattr(
        ai_provider_capacity.Redis,
        "from_url",
        lambda *_args, **_kwargs: redis,
    )

    async def use_slot() -> None:
        async with ai_provider_capacity.provider_capacity():
            assert redis.acquired == ["xcalificator:ai-provider-slot:0"]

    asyncio.run(use_slot())
    assert ai_provider_capacity._RELEASE_SCRIPT in redis.scripts


def test_job_detail_is_scoped_to_owner_and_admin() -> None:
    owner_id = uuid4()
    job_id = uuid4()

    class Result:
        def __init__(self, visible: bool) -> None:
            self.visible = visible

        def fetchone(self):
            return SimpleNamespace(_mapping={"id": job_id, "user_id": owner_id}) if self.visible else None

    class DB:
        async def execute(self, _statement, params):
            return Result(params["u"] in {str(owner_id), None})

    owner_job = asyncio.run(jobs_router._get_job(DB(), job_id, owner_id))
    admin_job = asyncio.run(jobs_router._get_job(DB(), job_id, None))
    assert owner_job["id"] == admin_job["id"] == job_id

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(jobs_router._get_job(DB(), job_id, uuid4()))
    assert exc_info.value.status_code == 404
