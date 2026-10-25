"""Real PostgreSQL, synthetic isolated schema; never use the application DB."""
import json
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.modules.evaluaciones.visual_generation import VisualMaterialError
from app.workers.tasks_evaluation_visuals import reserve_image_attempt
from tests.integration.test_evaluation_visual_persistence import TEST_URL, database  # noqa: F401

pytestmark = pytest.mark.skipif(not TEST_URL, reason='Requiere SPEC101_TEST_DATABASE_URL aislado')


@pytest.mark.asyncio
async def test_image_attempt_is_durable_and_does_not_change_job_payload_or_other_jobs(database):
    job_id, untouched = uuid4(), uuid4()
    payload = {'proposal': {'descripcion': 'Semilla sintética'}, '_ai_config': {'image': {'primary': {'model': 'synthetic'}}}}
    async with database.begin() as connection:
        await connection.execute(text('CREATE TABLE ai_jobs (id uuid PRIMARY KEY, input_json jsonb NOT NULL)'))
        for identifier in (job_id, untouched):
            await connection.execute(text('INSERT INTO ai_jobs VALUES (:id,CAST(:payload AS jsonb))'), {'id': identifier, 'payload': json.dumps(payload)})
    session = async_sessionmaker(database, expire_on_commit=False)
    async with session() as first:
        await reserve_image_attempt(first, job_id)
    # A different process/session observes the committed guard after a restart.
    async with session() as recovered:
        with pytest.raises(VisualMaterialError, match='No repetiremos el gasto'):
            await reserve_image_attempt(recovered, job_id)
        await recovered.rollback()
        current = await recovered.scalar(text('SELECT input_json FROM ai_jobs WHERE id=:id'), {'id': job_id})
        assert current.pop('_image_call_started') is True
        assert current == payload
        assert await recovered.scalar(text('SELECT input_json FROM ai_jobs WHERE id=:id'), {'id': untouched}) == payload
