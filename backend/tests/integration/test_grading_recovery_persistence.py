"""Opt-in synthetic PostgreSQL contract; never uses application DATABASE_URL."""
import asyncio
from collections import Counter
import os
from urllib.parse import urlparse
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.modules.calificaciones.agents import AgentResult
from app.modules.calificaciones.recovery import ReviewProgress
from app.modules.jobs import service
from app.modules.jobs.router import _get_job, _public_result
from fastapi import HTTPException

TEST_URL = os.getenv("SPEC119_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="Requires isolated SPEC119_TEST_DATABASE_URL")


def test_twenty_persisted_deliveries_resume_only_the_missing_role():
    parsed = urlparse(TEST_URL)
    assert parsed.hostname in {"127.0.0.1", "localhost", "xcal-spec119-db"}
    assert parsed.path == "/spec119"

    async def scenario():
        engine = create_async_engine(TEST_URL)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        calls = Counter()
        job_ids = []
        teacher_id = uuid4()
        schema = "review119_" + uuid4().hex
        # Only this newly generated schema is removed in cleanup.
        assert schema.startswith("review119_") and len(schema) == 42
        async with engine.begin() as conn:
            await conn.execute(text(f"CREATE SCHEMA {schema}"))
        await engine.dispose()
        engine = create_async_engine(TEST_URL, connect_args={"server_settings": {"search_path": schema}})
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        try:
            async with engine.begin() as conn:
                await conn.execute(text("CREATE TABLE ai_jobs (id uuid PRIMARY KEY, user_id uuid, "
                    "tipo text, estado text, progreso int DEFAULT 0, input_json jsonb DEFAULT '{}', "
                    "resultado_json jsonb DEFAULT '{}', error text, claim_token text, "
                    "attempt_count int DEFAULT 0, parent_job_id uuid, entrega_id uuid, stage text, "
                    "created_at timestamptz DEFAULT NOW(), started_at timestamptz, "
                    "finished_at timestamptz, heartbeat_at timestamptz, lease_expires_at timestamptz)"))
            for index in range(20):
                delivery_id = uuid4()
                async with sessions() as db:
                    job_id = await service.create_job(db, user_id=teacher_id,
                        tipo="calificacion_entrega", input_json={"_ai_config": {}}, entrega_id=delivery_id)
                    job_ids.append(job_id)
                    assert await service.claim_job_running(db, job_id, claim_token="original")
                    await db.commit()

                async def save(payload, *, token="original"):
                    async with sessions() as db:
                        saved = await service.save_grading_review_progress(db, job_id,
                            delivery_id=delivery_id, claim_token=token, checkpoint=payload)
                        await db.commit()
                        if not saved:
                            raise service.JobOwnershipLost("obsolete")

                async def primary():
                    calls[index, "primary"] += 1
                    return AgentResult(nota_sugerida=3.5, confianza=.9,
                        feedback_estudiante="Respuesta sintética", requiere_revision_docente=False)

                async def interrupted():
                    calls[index, "secondary"] += 1
                    raise asyncio.CancelledError()

                progress = ReviewProgress(fingerprint=f"delivery-{index}", payload=None, save=save)
                await progress.save_vision({"vision_result": {"raw_output": {"texto_extraido": "synthetic"}}})
                await progress.run("primary", primary, maximum_score=5)
                with pytest.raises(asyncio.CancelledError):
                    await progress.run("secondary", interrupted, maximum_score=5)

                async with sessions() as db:
                    # Simulate a lost worker, then use the real lease/claim recovery path.
                    await db.execute(text("UPDATE ai_jobs SET lease_expires_at=NOW()-INTERVAL '1 second' WHERE id=:id"), {"id": job_id})
                    recovered = await service.claim_recoverable_jobs(db,
                        tipo="calificacion_entrega", queued_seconds=30, limit=100)
                    assert [row["id"] for row in recovered] == [job_id]
                    assert await service.claim_job_running(db, job_id, claim_token="resumed")
                    await db.commit()
                    saved_result = await service.get_job_result(db, job_id)
                    assert not await service.save_grading_review_progress(db, job_id,
                        delivery_id=delivery_id, claim_token="original", checkpoint={})
                    assert not await service.save_grading_review_progress(db, job_id,
                        delivery_id=uuid4(), claim_token="resumed", checkpoint={})
                    with pytest.raises(service.JobOwnershipLost):
                        await service.lock_owned_job(db, job_id, "original")
                    await db.rollback()
                    with pytest.raises(HTTPException) as denied:
                        await _get_job(db, job_id, uuid4())
                    assert denied.value.status_code == 404
                    owned = await _get_job(db, job_id, teacher_id)
                    assert "_grading_review_v1" not in _public_result(owned["resultado_json"])

                async def save_resumed(payload):
                    await save(payload, token="resumed")

                resumed = ReviewProgress(fingerprint=f"delivery-{index}",
                    payload=saved_result["_grading_review_v1"][str(delivery_id)], save=save_resumed)
                assert resumed.payload["vision"]["vision_result"]["raw_output"]["texto_extraido"] == "synthetic"
                await resumed.run("primary", primary, maximum_score=5)

                async def secondary():
                    calls[index, "secondary"] += 1
                    return AgentResult(nota_sugerida=3.5, confianza=.9,
                        feedback_estudiante="Verificación sintética", requiere_revision_docente=False)
                assert (await resumed.run("secondary", secondary, maximum_score=5)).nota_sugerida == 3.5
                async with sessions() as db:
                    assert await service.finish_job(db, job_id, estado="success",
                        resultado_json={"claim_token": "resumed", "verification_status": "complete"})
                    await db.commit()
                    final = await service.get_job_result(db, job_id)
                    assert final["_grading_review_v1"][str(delivery_id)]["stages"]["secondary"]["attempts"] == 2
                assert calls[index, "primary"] == 1 and calls[index, "secondary"] == 2

            assert len(job_ids) == len(set(job_ids)) == 20
            assert sum(calls.values()) == 60

            async with sessions() as db:
                parent = await service.create_job(db, user_id=teacher_id,
                    tipo="calificacion_lote", input_json={"_ai_config": {}})
                child = await service.create_job(db, user_id=teacher_id,
                    tipo="calificacion_entrega", input_json={"_ai_config": {}}, parent_job_id=parent)
                assert await service.claim_job_running(db, child, claim_token="pending")
                assert await service.finish_job(db, child, estado="requires_review",
                    resultado_json={"claim_token": "pending", "verification_status": "pending"})
                assert await service.get_job_state(db, parent) == "requires_review"
                # A legacy batch owns several distinct progress entries.
                assert await service.claim_job_running(db, parent, claim_token="batch") is False
                await db.execute(text("UPDATE ai_jobs SET estado='running',claim_token='batch' WHERE id=:id"), {"id": parent})
                ids = [uuid4(), uuid4()]
                for number, target in enumerate(ids):
                    assert await service.save_grading_review_progress(db, parent,
                        delivery_id=target, claim_token="batch", checkpoint={"fingerprint": f"unique-{number}"})
                private = (await service.get_job_result(db, parent))["_grading_review_v1"]
                assert private[str(ids[0])]["fingerprint"] == "unique-0"
                assert private[str(ids[1])]["fingerprint"] == "unique-1"
                await db.commit()
        finally:
            async with engine.begin() as conn:
                await conn.execute(text(f"DROP SCHEMA {schema} CASCADE"))
            await engine.dispose()

    asyncio.run(scenario())
