"""Synthetic-only database fixture; never falls back to DATABASE_URL."""
import os
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.db.base import Base, import_models


def create_domain_tables(connection):
    tables = set()
    def include(table):
        if table in tables:
            return
        tables.add(table)
        for foreign in table.foreign_keys:
            include(foreign.column.table)
    for name in ('materias', 'matriculas', 'evaluaciones', 'evaluacion_blueprints', 'evaluacion_recursos',
                 'evaluacion_contenido_versiones', 'entregas', 'calificaciones', 'asistencia_registros',
                 'dba_catalog', 'dba_personalizados', 'audit_events', 'authorization_user_roles',
                 'authorization_roles', 'authorization_role_permissions', 'authorization_permissions'):
        include(Base.metadata.tables[name])
    Base.metadata.create_all(connection, tables=list(tables))


@pytest_asyncio.fixture
async def database128():
    url = os.getenv("SPEC128_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Requiere PostgreSQL sintético SPEC128_TEST_DATABASE_URL")
    schema = "spec128_" + uuid4().hex
    admin = create_async_engine(url)
    import_models()
    async with admin.begin() as connection:
        await connection.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
        await connection.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
        await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_async_engine(url, connect_args={"server_settings": {"search_path": schema + ",public"}},
                                 execution_options={"schema_translate_map": {None: schema}})
    try:
        async with engine.begin() as connection:
            await connection.run_sync(create_domain_tables)
            # ai_jobs is SQL-managed, not part of Base.metadata. Same durable
            # fields used by printing/digitalization; no production migration.
            await connection.execute(text("""CREATE TABLE ai_jobs (
                id uuid PRIMARY KEY, user_id uuid, tipo text, estado text, progreso int DEFAULT 0,
                input_json jsonb, resultado_json jsonb DEFAULT '{}', parent_job_id uuid,
                entrega_id uuid, stage text, attempt_count int DEFAULT 0, claim_token text,
                created_at timestamptz DEFAULT NOW(), started_at timestamptz, finished_at timestamptz,
                heartbeat_at timestamptz, lease_expires_at timestamptz, error text)"""))
        yield engine
    finally:
        await engine.dispose()
        async with admin.begin() as connection:
            # Only the random schema created above, never public or an app database.
            await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await admin.dispose()
