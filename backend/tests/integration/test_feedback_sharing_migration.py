"""Migración real sobre DB sintética: esquema nuevo y datos previos intactos."""
from __future__ import annotations

import asyncio
import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine


TABLES = {"feedback_publications", "feedback_accesses", "feedback_chat_quotas", "feedback_chat_requests"}
MIGRATION = Path(__file__).resolve().parents[2] / "alembic/versions/202610200001_feedback_sharing.py"


def test_migration_is_additive_and_has_explicit_parent():
    source = MIGRATION.read_text(encoding="utf8")
    assert 'down_revision = "202610150001"' in source
    assert "create_table" in source
    upgrade = source.split("def upgrade()", 1)[1].split("def downgrade()", 1)[0].upper()
    for forbidden in ("DELETE FROM", "UPDATE CALIFICACIONES", "ALTER TABLE USERS", "DROP TABLE", "TRUNCATE"):
        assert forbidden not in upgrade


@pytest.mark.asyncio
async def test_schema_has_constraints_indexes_and_no_plaintext_credential(fb_db):
    rows = (await fb_db.execute(text("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name LIKE 'feedback_%'"))).all()
    actual = {row.table_name for row in rows}
    assert TABLES <= actual
    access_columns = {row.column_name for row in rows if row.table_name == "feedback_accesses"}
    assert {"credential_digest", "credential_generation", "expires_at", "version"} <= access_columns
    assert not {"token", "password", "credential", "family_id"} & access_columns
    indexes = (await fb_db.execute(text("SELECT indexdef FROM pg_indexes WHERE tablename LIKE 'feedback_%'"))).scalars().all()
    assert any("UNIQUE" in value and "estudiante_id, evaluacion_id" in value for value in indexes)
    assert any("quota_id, accepted_at" in value for value in indexes)


@pytest.mark.asyncio
async def test_upgrade_preserves_whole_existing_grade(fb_db, fb_case_factory):
    # Un head ya aplicado solo probaría un no-op. Crear DB efímera y migrar de
    # verdad desde el padre, con registros sintéticos guardados entre upgrades.
    base = make_url(os.environ["SPEC107_TEST_DATABASE_URL"])
    assert base.host in {"localhost", "127.0.0.1"} and base.port == 55417 and base.database == "spec107"
    name = "spec107_migration_" + uuid4().hex
    admin = create_async_engine(base.set(database="postgres"), isolation_level="AUTOCOMMIT")
    temporary = create_async_engine(base.set(database=name))
    env = {**os.environ, "DATABASE_URL": base.set(database=name).render_as_string(hide_password=False), "SECRET_KEY": "spec107-synthetic-secret-key-long-enough"}

    async def upgrade(target):
        result = await asyncio.to_thread(subprocess.run, [sys.executable, "-m", "alembic", "upgrade", target], cwd=Path(__file__).resolve().parents[2], env=env, capture_output=True, text=True, timeout=90)
        assert result.returncode == 0, result.stderr

    async with admin.connect() as connection:
        await connection.execute(text(f'CREATE DATABASE "{name}"'))
    try:
        await upgrade("202610150001")
        sessions = async_sessionmaker(temporary, expire_on_commit=False)
        async with sessions() as db:
            case = await fb_case_factory(db)
            grade_id = case[-1].id
            await db.commit()
            query = text("SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id")
            before = await db.scalar(query, {"id": grade_id})
            assert await db.scalar(text("SELECT to_regclass('feedback_accesses')")) is None
        # Exercise this migration exactly. A later head has its own preservation
        # tests and must not change the meaning of this historical regression.
        await upgrade("202610200001")
        async with sessions() as db:
            assert await db.scalar(query, {"id": grade_id}) == before
            assert await db.scalar(text("SELECT version_num FROM alembic_version")) == "202610200001"
            assert await db.scalar(text("SELECT to_regclass('feedback_accesses')")) is not None
    finally:
        await temporary.dispose()
        # Solo la DB aleatoria creada arriba, nunca la base de trabajo ni ajena.
        async with admin.connect() as connection:
            await connection.execute(text(f'DROP DATABASE "{name}"'))
        await admin.dispose()
