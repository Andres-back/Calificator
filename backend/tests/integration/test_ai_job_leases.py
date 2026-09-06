"""Contrato de migración/colas en un schema efímero, nunca en datos del producto."""
from __future__ import annotations

import asyncio
import importlib.util
import os
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.modules.jobs import service

TEST_URL = os.getenv('SPEC031_TEST_DATABASE_URL')
pytestmark = pytest.mark.skipif(not TEST_URL, reason='Requiere PostgreSQL aislado SPEC031_TEST_DATABASE_URL')


def migration(connection, direction):
    path = Path(__file__).parents[2] / 'alembic/versions/202609030001_ai_job_leases.py'
    spec = importlib.util.spec_from_file_location('job_leases_migration', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(connection)):
        getattr(module, direction)()


async def exercise_contract():
    schema = 'spec031_' + uuid4().hex
    admin = create_async_engine(TEST_URL)
    async with admin.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA {schema}'))
    engine = create_async_engine(TEST_URL, connect_args={'server_settings': {'search_path': schema}})
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with engine.begin() as conn:
            await conn.execute(text('CREATE TABLE entregas (id uuid PRIMARY KEY)'))
            await conn.execute(text("CREATE TABLE calificaciones (id uuid PRIMARY KEY, estado varchar(40), "
                                    "CONSTRAINT ck_calificaciones_estado CHECK "
                                    "(estado IN ('sugerida','confirmada','ajustada','requiere_revision','publicada','anulada')))"))
            await conn.execute(text("CREATE TABLE ai_jobs (id uuid PRIMARY KEY, user_id uuid, tipo varchar(60), "
                                    "estado varchar(40), progreso int DEFAULT 0, input_json jsonb DEFAULT '{}', "
                                    "resultado_json jsonb DEFAULT '{}', error text, created_at timestamp DEFAULT NOW(), "
                                    "started_at timestamp, finished_at timestamp)"))
            await conn.execute(text("INSERT INTO ai_jobs (id,tipo,estado) VALUES (:id,'calificacion_lote','success')"), {'id': uuid4()})
            await conn.run_sync(lambda sync: migration(sync, 'upgrade'))
            await conn.execute(text("INSERT INTO calificaciones VALUES (:id,'procesando')"), {'id': uuid4()})
        async with sessions() as db:
            assert await db.scalar(text("SELECT attempt_count FROM ai_jobs WHERE estado='success'")) == 0
            parent = await service.create_job(db, user_id=None, tipo='calificacion_lote', input_json={'_ai_config': {}})
            children = []
            for _ in range(30):
                delivery = uuid4()
                await db.execute(text('INSERT INTO entregas VALUES (:id)'), {'id': delivery})
                children.append(await service.create_job(
                    db, user_id=None, tipo='calificacion_entrega', input_json={'_ai_config': {}},
                    parent_job_id=parent, entrega_id=delivery, stage='queued',
                ))
            await service.aggregate_parent_job(db, parent)
            await db.commit()

        async def claim(token):
            async with sessions() as db:
                result = await service.claim_job_running(db, children[0], claim_token=token)
                await db.commit()
                return result

        claims = await asyncio.gather(claim('first'), claim('duplicate'))
        assert sum(claims) == 1
        owner = 'first' if claims[0] else 'duplicate'
        async with sessions() as db:
            assert await service.heartbeat_job(db, children[0], claim_token=owner)
            assert not await service.heartbeat_job(db, children[0], claim_token='obsolete')
            recovered = await service.claim_recoverable_jobs(db, tipo='calificacion_entrega', queued_seconds=30, limit=30)
            assert not recovered  # inferencia viva y entregas recién encoladas
            await db.execute(text("UPDATE ai_jobs SET lease_expires_at=NOW()-INTERVAL '1 second' WHERE id=:id"), {'id': children[0]})
            recovered = await service.claim_recoverable_jobs(db, tipo='calificacion_entrega', queued_seconds=30, limit=30)
            assert [r['id'] for r in recovered] == [children[0]]
            assert not await service.claim_recoverable_jobs(db, tipo='calificacion_entrega', queued_seconds=30, limit=30)
            assert await service.claim_job_running(db, children[0], claim_token='recovered')
            assert not await service.finish_job(db, children[0], estado='success', resultado_json={'claim_token': owner})
            assert not await service.update_job_progress(db, children[0], progreso=100, resultado_json={'claim_token': owner})
            assert await service.heartbeat_job(db, children[0], claim_token='recovered')
            await db.commit()

        async def finish(index, job):
            async with sessions() as db:
                if index:
                    assert await service.claim_job_running(db, job, claim_token=f'worker-{index}')
                    await db.commit()
                token = 'recovered' if index == 0 else f'worker-{index}'
                result = await service.finish_job(
                    db, job, estado='failed' if index == 29 else 'success',
                    resultado_json={'claim_token': token},
                )
                await db.commit()
                return result

        assert all(await asyncio.gather(*(finish(i, job) for i, job in enumerate(children))))
        async with sessions() as db:
            parent_row = (await db.execute(text('SELECT * FROM ai_jobs WHERE id=:id'), {'id': parent})).mappings().one()
            assert parent_row['progreso'] == 100
            assert parent_row['estado'] == 'success'
            assert parent_row['resultado_json']['processed'] == 29
            assert parent_row['resultado_json']['failed'] == 1
            assert parent_row['resultado_json']['active'] == 0
            assert not await service.finish_job(db, children[0], estado='failed', resultado_json={})
            # Agotar intentos solo cierra leases vencidos; los workers vivos y
            # conectores a la espera siguen protegidos.
            await db.execute(text(
                "UPDATE ai_jobs SET estado='running', attempt_count=99, "
                "lease_expires_at=NOW()+INTERVAL '1 minute' WHERE id=:id"
            ), {'id': children[0]})
            assert not await service.fail_exhausted_jobs(db, tipo='calificacion_entrega', limit=30)
            await db.execute(text(
                "UPDATE ai_jobs SET lease_expires_at=NOW()-INTERVAL '1 second', "
                "resultado_json=jsonb_build_object('pipeline_status','waiting_connector') WHERE id=:id"
            ), {'id': children[0]})
            assert not await service.fail_exhausted_jobs(db, tipo='calificacion_entrega', limit=30)
            await db.execute(text("UPDATE ai_jobs SET resultado_json='{}' WHERE id=:id"), {'id': children[0]})
            exhausted = await service.fail_exhausted_jobs(db, tipo='calificacion_entrega', limit=30)
            assert [row['id'] for row in exhausted] == [children[0]]
            assert await service.get_job_state(db, children[0]) == 'requires_review'
            assert not await service.fail_exhausted_jobs(db, tipo='calificacion_entrega', limit=30)
            await db.commit()
        async with engine.begin() as conn:
            await conn.run_sync(lambda sync: migration(sync, 'downgrade'))
            assert await conn.scalar(text('SELECT estado FROM calificaciones')) == 'requiere_revision'
            assert await conn.scalar(text('SELECT count(*) FROM ai_jobs')) == 32
    finally:
        await engine.dispose()
        async with admin.begin() as conn:
            await conn.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        await admin.dispose()


def test_migration_claim_recovery_and_concurrent_batch_30():
    asyncio.run(exercise_contract())
