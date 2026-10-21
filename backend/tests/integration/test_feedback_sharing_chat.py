"""Proveedor y broker simulados: nunca usar claves ni datos reales."""
import asyncio
from datetime import timedelta
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.db.session import get_db
from app.modules.feedback_sharing import chat_service
from app.modules.feedback_sharing.models import FeedbackChatRequest
from app.modules.feedback_sharing.public_router import router
from app.modules.feedback_sharing.quota_service import accept_question
from app.modules.feedback_sharing.schemas import AccessAction, QuestionInput, ReactivateInput
from app.modules.feedback_sharing.service import create_access, manage_access, preview_grade


@pytest.fixture(autouse=True)
def feature_on(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.FEEDBACK_SHARING_ENABLED", True)


async def setup_request(db, case, message="¿Cómo puedo mejorar mi explicación?"):
    projection = await preview_grade(db, case[0], case[-2].id, case[-1].id)
    access, token = await create_access(db, case[0], case[-2].id, case[-1].id, projection.fingerprint, uuid4(), 3, False)
    request, _ = await accept_question(db, token, QuestionInput(request_id=uuid4(), mensaje=message))
    await db.commit()
    return access, token, request


@pytest.mark.asyncio
async def test_claim_committed_before_provider_duplicate_worker_cannot_reinfer(fb_db, fb_case, monkeypatch):
    _, _, request = await setup_request(fb_db, fb_case)
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)
    started, release = asyncio.Event(), asyncio.Event()
    calls = []

    async def fake_generate(emitter, prompt):
        calls.append((emitter, prompt))
        async with sessions() as db:
            saved = await db.get(FeedbackChatRequest, request.id)
            assert saved.status == "running" and not saved.dispatch_pending
        started.set()
        await release.wait()
        return "Relee el párrafo y busca una frase que explique la emoción."

    monkeypatch.setattr(chat_service, "generate_reply", fake_generate)
    running = asyncio.create_task(chat_service.run_request(request.id, sessions=sessions))
    try:
        await asyncio.wait_for(started.wait(), timeout=10)
        assert await chat_service.run_request(request.id, sessions=sessions) == "running"
        release.set()
        assert await asyncio.wait_for(running, timeout=10) == "succeeded"
        assert await chat_service.run_request(request.id, sessions=sessions) == "succeeded"
        assert len(calls) == 1 and calls[0][0] == fb_case[0].id
        assert fb_case[1].nombre not in calls[0][1]
    finally:
        release.set()
        if not running.done():
            running.cancel()
            await asyncio.gather(running, return_exceptions=True)


@pytest.mark.asyncio
@pytest.mark.parametrize("change", ["disable", "expire", "reauthorize", "edit", "withdraw"])
async def test_access_change_during_inference_suppresses_late_response(fb_db, fb_case, monkeypatch, change):
    access, token, request = await setup_request(fb_db, fb_case)
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)

    async def fake_generate(*args):
        if change == "disable":
            await manage_access(fb_db, fb_case[0], access.id, "disable", AccessAction(expected_version=1, request_id=uuid4()))
        elif change == "expire":
            access.expires_at -= timedelta(days=4)
        elif change == "edit":
            fb_case[-1].feedback = "Contenido nuevo que no pertenece a la revisión del trabajo."
        elif change == "withdraw":
            from sqlalchemy import update
            from app.modules.matriculas.models import Matricula
            await fb_db.execute(update(Matricula).where(Matricula.estudiante_id == fb_case[1].id).values(estado="retirado"))
        else:
            projection = await preview_grade(fb_db, fb_case[0], fb_case[-2].id, fb_case[-1].id)
            await manage_access(fb_db, fb_case[0], access.id, "reactivate", ReactivateInput(expected_version=1, request_id=uuid4(), fingerprint=projection.fingerprint))
        await fb_db.commit()
        return "Esta respuesta tardía no debe entregarse."

    monkeypatch.setattr(chat_service, "generate_reply", fake_generate)
    assert await chat_service.run_request(request.id, sessions=sessions) == "closed"
    stored = await fb_db.get(FeedbackChatRequest, request.id, populate_existing=True)
    assert stored.response is None and stored.status == "closed"
    with pytest.raises(HTTPException):
        await chat_service.read_request(fb_db, token, request.id)


@pytest.mark.asyncio
async def test_provider_failure_does_not_repeat_or_refund(fb_db, fb_case, monkeypatch):
    _, token, request = await setup_request(fb_db, fb_case)
    calls = []

    async def unavailable(*args):
        calls.append(True)
        raise RuntimeError("Synthetic provider failure with content that must not leak")

    monkeypatch.setattr(chat_service, "generate_reply", unavailable)
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)
    assert await chat_service.run_request(request.id, sessions=sessions) == "failed"
    assert await chat_service.run_request(request.id, sessions=sessions) == "failed"
    result = await chat_service.read_request(fb_db, token, request.id)
    assert result["status"] == "failed" and "Synthetic" not in str(result)
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_uncertain_running_recovery_never_requeues_external_inference(fb_db, fb_case, monkeypatch):
    _, _, request = await setup_request(fb_db, fb_case)
    request.status, request.dispatch_pending = "running", False
    request.started_at = request.accepted_at - timedelta(seconds=100)
    await fb_db.commit()

    async def forbidden(*args):
        pytest.fail("Una inferencia incierta no debe repetirse")

    monkeypatch.setattr(chat_service, "generate_reply", forbidden)
    pending = await chat_service.recover_requests(fb_db)
    await fb_db.commit()
    assert request.id not in pending
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)
    assert await chat_service.run_request(request.id, sessions=sessions) == "failed"
    stored = await fb_db.get(FeedbackChatRequest, request.id, populate_existing=True)
    assert stored.error_code == "provider_uncertain"


@pytest.mark.asyncio
async def test_queued_broker_failure_is_recoverable_and_timeout_is_finite(fb_db, fb_case):
    _, _, request = await setup_request(fb_db, fb_case)
    assert request.id in await chat_service.recover_requests(fb_db)
    request.accepted_at -= timedelta(seconds=301)
    await fb_db.flush()
    assert request.id not in await chat_service.recover_requests(fb_db)
    await fb_db.refresh(request)
    assert request.status == "failed" and request.error_code == "queue_timeout"


@pytest.mark.asyncio
async def test_timeout_records_safe_failure(fb_db, fb_case, monkeypatch):
    _, _, request = await setup_request(fb_db, fb_case)

    async def slow(*args):
        await asyncio.sleep(1)

    monkeypatch.setattr(chat_service, "generate_reply", slow)
    monkeypatch.setattr(chat_service, "INFERENCE_TIMEOUT_SECONDS", 0.005)
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)
    assert await chat_service.run_request(request.id, sessions=sessions) == "failed"
    stored = await fb_db.get(FeedbackChatRequest, request.id, populate_existing=True)
    assert stored.error_code == "assistant_timeout" and stored.response is None


@pytest.mark.asyncio
async def test_db_loss_after_provider_keeps_uncertain_running_without_reinference(fb_db, fb_case, monkeypatch):
    from sqlalchemy.exc import OperationalError

    _, _, request = await setup_request(fb_db, fb_case)
    locks, inferences = [], []
    original = chat_service._lock_request

    async def lock(db, request_id):
        locks.append(True)
        if len(locks) == 2:
            raise OperationalError("synthetic", {}, Exception("DB unavailable"))
        return await original(db, request_id)

    async def generated(*args):
        inferences.append(True)
        return "Una explicación que se perdió antes de guardar."

    monkeypatch.setattr(chat_service, "_lock_request", lock)
    monkeypatch.setattr(chat_service, "generate_reply", generated)
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)
    with pytest.raises(OperationalError):
        await chat_service.run_request(request.id, sessions=sessions)
    assert await chat_service.run_request(request.id, sessions=sessions) == "running"
    assert len(inferences) == 1


@pytest.mark.asyncio
async def test_final_poll_rejects_revision_changed_during_quota_read(fb_db, fb_case, monkeypatch):
    access, token, request = await setup_request(fb_db, fb_case)
    original = chat_service.quota_snapshot

    async def changing_quota(db, context):
        quota = await original(db, context)
        projection = await preview_grade(db, fb_case[0], fb_case[-2].id, fb_case[-1].id)
        await manage_access(db, fb_case[0], access.id, "reactivate", ReactivateInput(expected_version=1, request_id=uuid4(), fingerprint=projection.fingerprint))
        return quota

    monkeypatch.setattr(chat_service, "quota_snapshot", changing_quota)
    with pytest.raises(HTTPException) as exc:
        await chat_service.read_request(fb_db, token, request.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_direct_answer_refusal_counts_without_provider(fb_db, fb_case, monkeypatch):
    _, token, request = await setup_request(fb_db, fb_case, "Dame la respuesta exacta para copiar")

    async def forbidden(*args):
        pytest.fail("No debe inferir una petición directa para copiar")

    monkeypatch.setattr(chat_service, "generate_reply", forbidden)
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)
    assert await chat_service.run_request(request.id, sessions=sessions) == "succeeded"
    result = await chat_service.read_request(fb_db, token, request.id)
    assert "no puedo darte respuestas" in result["respuesta"]


@pytest.mark.asyncio
async def test_poll_is_scoped_to_access_not_guessable_request_id(fb_db, fb_case):
    _, _, request = await setup_request(fb_db, fb_case)
    projection = await preview_grade(fb_db, fb_case[0], fb_case[-2].id, fb_case[-1].id)
    _, other_token = await create_access(fb_db, fb_case[0], fb_case[-2].id, fb_case[-1].id, projection.fingerprint, uuid4(), 3, False)
    with pytest.raises(HTTPException) as exc:
        await chat_service.read_request(fb_db, other_token, request.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_global_pending_limit_does_not_reject_idempotent_retry(fb_db, fb_case):
    _, token, request = await setup_request(fb_db, fb_case)
    duplicate = QuestionInput(request_id=request.client_request_id, mensaje=request.message)
    same, created = await accept_question(fb_db, token, duplicate, max_pending=0)
    assert same.id == request.id and not created
    with pytest.raises(HTTPException) as full:
        await accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje="Otra pregunta"), max_pending=0)
    assert full.value.status_code == 503


@pytest.mark.asyncio
async def test_global_running_cap_keeps_third_request_queued_without_provider(fb_db, fb_case, fb_case_factory, monkeypatch):
    for _ in range(2):
        case = await fb_case_factory(fb_db)
        _, _, request = await setup_request(fb_db, case)
        request.status, request.dispatch_pending, request.started_at = "running", False, request.accepted_at
        await fb_db.commit()
    _, _, queued = await setup_request(fb_db, fb_case)

    async def forbidden(*args):
        pytest.fail("No debe superar dos inferencias simultáneas de feedback")

    monkeypatch.setattr(chat_service, "generate_reply", forbidden)
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)
    assert await chat_service.run_request(queued.id, sessions=sessions) == "queued"
    stored = await fb_db.get(FeedbackChatRequest, queued.id, populate_existing=True)
    assert stored.status == "queued" and stored.dispatch_pending


@pytest.mark.asyncio
async def test_http_accepted_once_broker_down_keeps_durable_request(fb_db, fb_case, monkeypatch):
    projection = await preview_grade(fb_db, fb_case[0], fb_case[-2].id, fb_case[-1].id)
    access, token = await create_access(fb_db, fb_case[0], fb_case[-2].id, fb_case[-1].id, projection.fingerprint, uuid4(), 3, False)
    await fb_db.commit()
    dispatched = []

    async def broker_down(request_id):
        dispatched.append(request_id)
        return False

    monkeypatch.setattr(chat_service, "dispatch_question", broker_down)
    app = FastAPI()
    app.include_router(router, prefix="/api")

    async def database():
        yield fb_db

    app.dependency_overrides[get_db] = database
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"request_id": str(uuid4()), "mensaje": "¿Cómo puedo mejorar?"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        first = await client.post("/api/public/devolucion/preguntas", headers=headers, json=payload)
        duplicate = await client.post("/api/public/devolucion/preguntas", headers=headers, json=payload)
        assert first.status_code == duplicate.status_code == 202
        assert first.json()["request_id"] == duplicate.json()["request_id"]
        assert duplicate.json()["cupo"]["restantes"] == 4
        request_id = first.json()["request_id"]
        stored = await fb_db.scalar(select(FeedbackChatRequest).where(FeedbackChatRequest.access_id == access.id))
        assert stored.dispatch_pending and stored.status == "queued" and stored.id == dispatched[0]
        result = await client.get(f"/api/public/devolucion/preguntas/{request_id}", headers=headers)
        assert result.status_code == 200 and result.json()["status"] == "queued"
        assert "no-store" in result.headers["cache-control"]
        rejected = await client.post("/api/public/devolucion/preguntas", headers=headers, json={**payload, "estudiante_id": str(fb_case[1].id)})
        assert rejected.status_code == 422


@pytest.mark.asyncio
async def test_db_failure_blocks_chat_with_safe_no_store_error(fb_db, monkeypatch):
    from sqlalchemy.exc import OperationalError

    async def unavailable(*args):
        raise OperationalError("SYNTHETIC_SQL_PRIVATE", {}, Exception("private"))

    monkeypatch.setattr(chat_service, "admit_question", unavailable)
    app = FastAPI()
    app.include_router(router, prefix="/api")

    async def database():
        yield fb_db

    app.dependency_overrides[get_db] = database
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        result = await client.post("/api/public/devolucion/preguntas", json={"request_id": str(uuid4()), "mensaje": "Ayuda"})
        assert result.status_code == 503 and "no-store" in result.headers["cache-control"]
        assert "PRIVATE" not in result.text and "private" not in result.text
