"""Contrato de migración/colas en un schema efímero, nunca en datos del producto."""
from __future__ import annotations

import asyncio
import importlib.util
import os
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import import_models
from app.modules.analytics import router as analytics_router
from app.modules.analytics import service as analytics_service
from app.modules.jobs import router as jobs_router
from app.modules.jobs import service as jobs_service

TEST_URL = os.getenv('SPEC031_TEST_DATABASE_URL')
pytestmark = pytest.mark.skipif(not TEST_URL, reason='Requiere PostgreSQL aislado SPEC031_TEST_DATABASE_URL')

import_models()


def migration(connection, direction):
    path = Path(__file__).parents[2] / 'alembic/versions/202609030001_ai_job_leases.py'
    spec = importlib.util.spec_from_file_location('job_leases_migration', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(connection)):
        getattr(module, direction)()


def work_session_migration(connection, direction):
    path = Path(__file__).parents[2] / 'alembic/versions/202609090001_analytics_work_sessions.py'
    spec = importlib.util.spec_from_file_location('work_sessions_migration', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(connection)):
        getattr(module, direction)()


def impact_study_migration(connection, direction):
    path = Path(__file__).parents[2] / 'alembic/versions/202609090002_impact_studies.py'
    spec = importlib.util.spec_from_file_location('impact_study_migration', path)
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
            await conn.execute(text('CREATE TABLE users (id uuid PRIMARY KEY, nombre text NOT NULL)'))
            await conn.execute(text('CREATE TABLE evaluaciones (id uuid PRIMARY KEY, materia_id uuid NOT NULL)'))
            await conn.execute(text('CREATE TABLE entregas (id uuid PRIMARY KEY, estudiante_id uuid)'))
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
            await conn.run_sync(lambda sync: work_session_migration(sync, 'upgrade'))
            assert await conn.scalar(text(
                "SELECT to_regclass('analytics_work_sessions') IS NOT NULL"
            ))
            await conn.run_sync(lambda sync: impact_study_migration(sync, 'upgrade'))
            assert await conn.scalar(text("SELECT to_regclass('impacto_studies') IS NOT NULL"))
            assert await conn.scalar(text("SELECT to_regclass('impacto_observations') IS NOT NULL"))
        async with sessions() as db:
            assert await db.scalar(text("SELECT attempt_count FROM ai_jobs WHERE estado='success'")) == 0
            parents = []
            children = []
            teacher_ids = (uuid4(), uuid4(), uuid4())
            for teacher_id in teacher_ids:
                evaluation_id = uuid4()
                await db.execute(text(
                    'INSERT INTO evaluaciones VALUES (:id, :subject)'
                ), {'id': evaluation_id, 'subject': uuid4()})
                await db.execute(text(
                    'INSERT INTO users VALUES (:id, :name)'
                ), {'id': teacher_id, 'name': f'Docente {len(parents) + 1}'})
                parent = await jobs_service.create_job(
                    db, user_id=teacher_id, tipo='calificacion_lote',
                    input_json={
                        '_ai_config': {},
                        'evaluacion_id': str(evaluation_id),
                    },
                )
                parents.append(parent)
                for student_number in range(10):
                    delivery = uuid4()
                    student = uuid4()
                    await db.execute(text(
                        'INSERT INTO users VALUES (:id, :name)'
                    ), {'id': student, 'name': f'Estudiante {student_number + 1}'})
                    await db.execute(text(
                        'INSERT INTO entregas VALUES (:id, :student)'
                    ), {'id': delivery, 'student': student})
                    children.append(await jobs_service.create_job(
                        db, user_id=teacher_id, tipo='calificacion_entrega',
                        input_json={'_ai_config': {}}, parent_job_id=parent,
                        entrega_id=delivery, stage='queued',
                    ))
                await jobs_service.aggregate_parent_job(db, parent)
            await db.commit()

        async with sessions() as db:
            pending = await jobs_router.get_pending_grading_jobs(
                limit=30,
                offset=0,
                current_user=SimpleNamespace(
                    id=teacher_ids[0],
                    rol='profesor',
                ),
                db=db,
            )
            assert pending['total'] == 1
            assert len(pending['items']) == 1
            assert pending['items'][0]['job_id'] == parents[0]
            assert pending['items'][0]['kind'] == 'batch'
            assert pending['items'][0]['total'] == 10
            assert pending['items'][0]['estudiante_nombre'].startswith('Estudiante ')

        async def claim(token):
            async with sessions() as db:
                result = await jobs_service.claim_job_running(db, children[0], claim_token=token)
                await db.commit()
                return result

        claims = await asyncio.gather(claim('first'), claim('duplicate'))
        assert sum(claims) == 1
        owner = 'first' if claims[0] else 'duplicate'
        async with sessions() as db:
            assert await jobs_service.heartbeat_job(db, children[0], claim_token=owner)
            assert not await jobs_service.heartbeat_job(db, children[0], claim_token='obsolete')
            recovered = await jobs_service.claim_recoverable_jobs(db, tipo='calificacion_entrega', queued_seconds=30, limit=30)
            assert not recovered  # inferencia viva y entregas recién encoladas
            await db.execute(text("UPDATE ai_jobs SET lease_expires_at=NOW()-INTERVAL '1 second' WHERE id=:id"), {'id': children[0]})
            recovered = await jobs_service.claim_recoverable_jobs(db, tipo='calificacion_entrega', queued_seconds=30, limit=30)
            assert [r['id'] for r in recovered] == [children[0]]
            assert await jobs_service.get_job_state(db, children[0]) == 'retrying'
            assert not await jobs_service.claim_recoverable_jobs(db, tipo='calificacion_entrega', queued_seconds=30, limit=30)
            assert await jobs_service.claim_job_running(db, children[0], claim_token='recovered')
            assert not await jobs_service.finish_job(db, children[0], estado='success', resultado_json={'claim_token': owner})
            assert not await jobs_service.update_job_progress(db, children[0], progreso=100, resultado_json={'claim_token': owner})
            assert await jobs_service.heartbeat_job(db, children[0], claim_token='recovered')
            await db.commit()

        async def finish(index, job):
            async with sessions() as db:
                if index:
                    assert await jobs_service.claim_job_running(db, job, claim_token=f'worker-{index}')
                    await db.commit()
                token = 'recovered' if index == 0 else f'worker-{index}'
                result = await jobs_service.finish_job(
                    db, job, estado='failed' if index == 29 else 'success',
                    resultado_json={'claim_token': token},
                )
                await db.commit()
                return result

        assert all(await asyncio.gather(*(finish(i, job) for i, job in enumerate(children))))
        async with sessions() as db:
            parent_rows = (await db.execute(text(
                'SELECT * FROM ai_jobs WHERE id=ANY(:ids) ORDER BY created_at, id'
            ), {'ids': parents})).mappings().all()
            assert len(parent_rows) == 3
            assert all(row['progreso'] == 100 for row in parent_rows)
            assert all(row['estado'] == 'success' for row in parent_rows)
            assert sum(row['resultado_json']['processed'] for row in parent_rows) == 29
            assert sum(row['resultado_json']['failed'] for row in parent_rows) == 1
            assert sum(row['resultado_json']['active'] for row in parent_rows) == 0
            assert not await jobs_service.finish_job(db, children[0], estado='failed', resultado_json={})
            # Agotar intentos solo cierra leases vencidos; los workers vivos y
            # conectores a la espera siguen protegidos.
            await db.execute(text(
                "UPDATE ai_jobs SET estado='running', attempt_count=99, "
                "lease_expires_at=NOW()+INTERVAL '1 minute' WHERE id=:id"
            ), {'id': children[0]})
            assert not await jobs_service.fail_exhausted_jobs(db, tipo='calificacion_entrega', limit=30)
            await db.execute(text(
                "UPDATE ai_jobs SET lease_expires_at=NOW()-INTERVAL '1 second', "
                "resultado_json=jsonb_build_object('pipeline_status','waiting_connector') WHERE id=:id"
            ), {'id': children[0]})
            assert not await jobs_service.fail_exhausted_jobs(db, tipo='calificacion_entrega', limit=30)
            await db.execute(text("UPDATE ai_jobs SET resultado_json='{}' WHERE id=:id"), {'id': children[0]})
            exhausted = await jobs_service.fail_exhausted_jobs(db, tipo='calificacion_entrega', limit=30)
            assert [row['id'] for row in exhausted] == [children[0]]
            assert await jobs_service.get_job_state(db, children[0]) == 'requires_review'
            assert not await jobs_service.fail_exhausted_jobs(db, tipo='calificacion_entrega', limit=30)
            await db.commit()

        teacher = SimpleNamespace(id=teacher_ids[0], rol='profesor')
        create_event = uuid4()
        async with sessions() as db:
            created = await analytics_service.create_work_session(
                db,
                current_user=teacher,
                condicion='asistida',
                fase='revision',
                event_id=create_event,
            )
            assert created['version'] == 1
            assert created['duracion_confirmada_ms'] == 0
            assert created['incertidumbre_ms'] == 0
            assert created['owner_token']
            session_id = created['id']
            owner_token = created['owner_token']

            replayed_create = await analytics_service.create_work_session(
                db,
                current_user=teacher,
                condicion='asistida',
                fase='revision',
                event_id=create_event,
            )
            assert replayed_create['replayed'] is True
            assert replayed_create['owner_token'] == owner_token

            with pytest.raises(HTTPException) as duplicate_session:
                await analytics_service.create_work_session(
                    db,
                    current_user=teacher,
                    condicion='manual',
                    fase='preparacion',
                    event_id=uuid4(),
                )
            assert duplicate_session.value.status_code == 409

        heartbeat_events = (uuid4(), uuid4())

        async def record_same_version(event_id):
            async with sessions() as db:
                try:
                    return await analytics_service.command_work_session(
                        db,
                        session_id=session_id,
                        current_user=teacher,
                        event_id=event_id,
                        expected_version=1,
                        owner_token=owner_token,
                        action='heartbeat',
                        elapsed_ms=15_000,
                    )
                except HTTPException as exc:
                    return exc

        concurrent_results = await asyncio.gather(
            *(record_same_version(event_id) for event_id in heartbeat_events)
        )
        successes = [item for item in concurrent_results if isinstance(item, dict)]
        conflicts = [item for item in concurrent_results if isinstance(item, HTTPException)]
        assert len(successes) == 1
        assert len(conflicts) == 1 and conflicts[0].status_code == 409
        successful_event = heartbeat_events[concurrent_results.index(successes[0])]

        async with sessions() as db:
            replayed = await analytics_service.command_work_session(
                db,
                session_id=session_id,
                current_user=teacher,
                event_id=successful_event,
                expected_version=1,
                owner_token=owner_token,
                action='heartbeat',
                elapsed_ms=15_000,
            )
            assert replayed['replayed'] is True
            assert replayed['duracion_confirmada_ms'] == 15_000

            with pytest.raises(HTTPException) as foreign_session:
                await analytics_service.command_work_session(
                    db,
                    session_id=session_id,
                    current_user=SimpleNamespace(id=teacher_ids[1], rol='profesor'),
                    event_id=uuid4(),
                    expected_version=2,
                    owner_token=owner_token,
                    action='heartbeat',
                    elapsed_ms=1,
                )
            assert foreign_session.value.status_code == 404

            paused = await analytics_service.command_work_session(
                db, session_id=session_id, current_user=teacher, event_id=uuid4(),
                expected_version=2, owner_token=owner_token, action='pausar',
                elapsed_ms=10_000,
            )
            resumed = await analytics_service.command_work_session(
                db, session_id=session_id, current_user=teacher, event_id=uuid4(),
                expected_version=paused['version'], owner_token=owner_token,
                action='reanudar',
            )
            uncertain = await analytics_service.command_work_session(
                db, session_id=session_id, current_user=teacher, event_id=uuid4(),
                expected_version=resumed['version'], owner_token=owner_token,
                action='heartbeat', elapsed_ms=60_000,
            )
            assert uncertain['duracion_confirmada_ms'] == 25_000
            assert uncertain['incertidumbre_ms'] == 60_000

            transfer_event = uuid4()
            transferred = await analytics_service.command_work_session(
                db, session_id=session_id, current_user=teacher, event_id=transfer_event,
                expected_version=uncertain['version'], owner_token='0' * 64,
                action='traspasar',
            )
            new_owner_token = transferred['owner_token']
            assert new_owner_token != owner_token

            replayed_transfer = await analytics_service.command_work_session(
                db, session_id=session_id, current_user=teacher, event_id=transfer_event,
                expected_version=uncertain['version'], owner_token='0' * 64,
                action='traspasar',
            )
            assert replayed_transfer['replayed'] is True
            assert replayed_transfer['owner_token'] == new_owner_token

            with pytest.raises(HTTPException) as obsolete_owner:
                await analytics_service.command_work_session(
                    db, session_id=session_id, current_user=teacher, event_id=uuid4(),
                    expected_version=transferred['version'], owner_token=owner_token,
                    action='heartbeat', elapsed_ms=1,
                )
            assert obsolete_owner.value.status_code == 409

            final_heartbeat = await analytics_service.command_work_session(
                db, session_id=session_id, current_user=teacher, event_id=uuid4(),
                expected_version=transferred['version'], owner_token=new_owner_token,
                action='heartbeat', elapsed_ms=5_000,
            )
            completed = await analytics_service.command_work_session(
                db, session_id=session_id, current_user=teacher, event_id=uuid4(),
                expected_version=final_heartbeat['version'], owner_token=new_owner_token,
                action='finalizar',
            )
            assert completed['estado'] == 'completed'
            assert completed['duracion_confirmada_ms'] == 30_000
            assert completed['incertidumbre_ms'] == 60_000

            own_sessions = await analytics_service.list_work_sessions(db, current_user=teacher)
            other_sessions = await analytics_service.list_work_sessions(
                db, current_user=SimpleNamespace(id=teacher_ids[1], rol='profesor')
            )
            assert own_sessions['total'] == 1
            assert 'owner_token' not in own_sessions['items'][0]
            assert other_sessions['total'] == 0

            limited = await analytics_service.create_work_session(
                db,
                current_user=teacher,
                condicion='manual',
                fase='preparacion',
                event_id=uuid4(),
            )
            original_limit = analytics_service.WORK_SESSION_COMMAND_LIMIT
            analytics_service.WORK_SESSION_COMMAND_LIMIT = 2
            try:
                rollover_event = uuid4()
                rolled = await analytics_service.command_work_session(
                    db, session_id=limited['id'], current_user=teacher,
                    event_id=rollover_event, expected_version=1,
                    owner_token=limited['owner_token'], action='heartbeat',
                    elapsed_ms=1,
                )
                assert rolled['estado'] == 'completed'
                assert rolled['rollover'] is True
                assert rolled['continuation']['estado'] == 'active'
                assert rolled['owner_token'] != limited['owner_token']
                rolled_replay = await analytics_service.command_work_session(
                    db, session_id=limited['id'], current_user=teacher,
                    event_id=rollover_event, expected_version=1,
                    owner_token=limited['owner_token'], action='heartbeat',
                    elapsed_ms=1,
                )
                assert rolled_replay['replayed'] is True
                assert rolled_replay['owner_token'] == rolled['owner_token']
            finally:
                analytics_service.WORK_SESSION_COMMAND_LIMIT = original_limit

            previous_flag = settings.TEACHER_WORK_TIMING_ENABLED
            settings.TEACHER_WORK_TIMING_ENABLED = True
            try:
                with pytest.raises(HTTPException) as no_permission:
                    await analytics_router.crear_sesion_trabajo(
                        analytics_router.WorkSessionCreate(
                            condicion='manual', fase='revision', event_id=uuid4(),
                            acepta_medicion=True,
                        ),
                        current_user=SimpleNamespace(
                            id=teacher_ids[2], rol='profesor', _effective_permissions=set(),
                        ),
                        db=db,
                    )
                assert no_permission.value.status_code == 403
            finally:
                settings.TEACHER_WORK_TIMING_ENABLED = previous_flag

        async with engine.begin() as conn:
            await conn.run_sync(lambda sync: impact_study_migration(sync, 'downgrade'))
            assert not await conn.scalar(text("SELECT to_regclass('impacto_studies') IS NOT NULL"))
            await conn.run_sync(lambda sync: work_session_migration(sync, 'downgrade'))
            assert not await conn.scalar(text(
                "SELECT to_regclass('analytics_work_sessions') IS NOT NULL"
            ))
            await conn.run_sync(lambda sync: migration(sync, 'downgrade'))
            assert await conn.scalar(text('SELECT estado FROM calificaciones')) == 'requiere_revision'
            assert await conn.scalar(text('SELECT count(*) FROM ai_jobs')) == 34
    finally:
        await engine.dispose()
        async with admin.begin() as conn:
            await conn.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        await admin.dispose()


def test_migration_claim_recovery_and_concurrent_batch_30():
    asyncio.run(exercise_contract())
