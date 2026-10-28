"""Spec133: opt-in synthetic PostgreSQL only; transport is mocked."""

import importlib.util
import asyncio
import os
from types import SimpleNamespace
from urllib.parse import urlparse
from uuid import uuid4
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.services.ai_api_connections import (
    create_compatible_connection,
    probe_compatible_model,
    validate_compatible_publication,
)
from app.services.ai_api_transport import ModelRuntimeProfile
from app.services.ai_config_service import AIConfigService
from app.services.ai_configuration_resolver import resolve_ai_configuration

DATABASE = os.getenv("SPEC133_TEST_DATABASE_URL", "")
pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(not DATABASE, reason="requires isolated spec133 database"),
]


def engine_for_test():
    parsed = urlparse(DATABASE)
    if parsed.path != "/spec133" or parsed.hostname not in {
        "xcal-spec133-db",
        "127.0.0.1",
        "localhost",
    }:
        raise RuntimeError("Requires the named isolated Spec133 container/database")
    return create_async_engine(DATABASE)


async def test_unused_migration_round_trip_and_reject_used_downgrade():
    engine = engine_for_test()
    path = (
        Path(__file__).parents[2]
        / "alembic/versions/202610280001_vision_runtime_limits.py"
    )
    spec = importlib.util.spec_from_file_location("vision_limits_migration", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)

    def round_trip(connection):
        migration.op = Operations(MigrationContext.configure(connection))
        migration.upgrade()
        migration.downgrade()
        migration.upgrade()

    try:
        async with engine.begin() as conn:
            schema = "migration_" + uuid4().hex
            await conn.execute(text(f"CREATE SCHEMA {schema}"))
            await conn.execute(text(f"SET LOCAL search_path TO {schema}"))
            await conn.execute(
                text(
                    "CREATE TABLE ai_feature_routing (feature text PRIMARY KEY, label text)"
                )
            )
            await conn.execute(
                text("CREATE TABLE ai_configuration_versions (snapshot jsonb)")
            )
            await conn.execute(text("CREATE TABLE ai_jobs (input_json jsonb)"))
            await conn.run_sync(round_trip)
            await conn.execute(
                text(
                    "INSERT INTO ai_feature_routing (feature,label,runtime_limits) VALUES ('calificacion.extraccion','Synthetic','{}')"
                )
            )

            def reject(connection):
                migration.op = Operations(MigrationContext.configure(connection))
                with pytest.raises(RuntimeError, match="ya se utilizaron"):
                    migration.downgrade()

            await conn.run_sync(reject)
            assert (
                await conn.scalar(
                    text(
                        "SELECT runtime_limits FROM ai_feature_routing WHERE feature='calificacion.extraccion'"
                    )
                )
                == {}
            )
            await conn.execute(
                text("UPDATE ai_feature_routing SET runtime_limits=NULL")
            )
            await conn.execute(
                text(
                    'INSERT INTO ai_configuration_versions VALUES (\'{"features":[{"runtime_limits":{}}]}\')'
                )
            )
            await conn.run_sync(reject)
            await conn.execute(text("DELETE FROM ai_configuration_versions"))
            await conn.execute(
                text(
                    'INSERT INTO ai_jobs VALUES (\'{"_ai_config":{"stages":{"extraction":{"runtime_limits":{}}}}}\')'
                )
            )
            await conn.run_sync(reject)
            # The schema contains only the three synthetic tables above.
            await conn.execute(text("DELETE FROM ai_jobs"))
            await conn.run_sync(lambda connection: migration.downgrade())
            await conn.execute(text(f"DROP SCHEMA {schema} CASCADE"))
    finally:
        await engine.dispose()


async def test_publication_old_client_snapshot_restore_and_academic_preservation(
    monkeypatch, fb_case_factory
):
    import app.services.ai_api_connections as connections

    monkeypatch.setattr(
        connections, "validate_api_base_url", lambda url, **_: url.rstrip("/")
    )
    monkeypatch.setattr("secrets.randbelow", lambda _: 23)

    async def synthetic(*_, **__):
        return {"choices": [{"message": {"content": '{"numero":"123"}'}}]}

    monkeypatch.setattr(connections, "call_configured_api", synthetic)
    engine = engine_for_test()
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as db:
            from app.db.base import import_models

            import_models()
            teacher, student, subject, evaluation, grade = await fb_case_factory(db)
            await db.commit()
            before = await db.scalar(
                text("SELECT row_to_json(c)::text FROM calificaciones c WHERE id=:id"),
                {"id": grade.id},
            )
            svc = AIConfigService(db=db)
            await svc.init()
            connection = await create_compatible_connection(
                db,
                label="Synthetic reader",
                base_url="https://example.com/v1",
                secret="synthetic-key",
                actor_id=teacher.id,
            )
            model = {
                "provider_id": connection["id"],
                "model_id": "future-visual",
                "label": "Synthetic",
                "capabilities": ["text", "vision"],
                "active": True,
                "recommended": False,
                "runtime_profile": ModelRuntimeProfile(
                    protocol="responses"
                ).model_dump(),
            }
            proof = await probe_compatible_model(
                db, provider=connection, model=model, actor_id=teacher.id
            )
            assert proof["status"] == "ok", proof.get("detail")
            providers = await svc.get_all_providers() + [proof["provider"]]
            models = await svc.get_all_models() + [proof["model"]]
            features = [
                f
                for f in await svc.get_all_features()
                if f["feature"] != "calificacion.extraccion"
            ]
            limits = {
                "call_timeout_seconds": 40,
                "max_attempts": 2,
                "max_output_tokens": 9216,
            }
            features.append(
                {
                    "feature": "calificacion.extraccion",
                    "label": "Lectura",
                    "capability": "vision",
                    "primary_provider": connection["id"],
                    "primary_model": model["model_id"],
                    "fallback_provider": None,
                    "fallback_model": None,
                    "active": True,
                    "rollout_enabled": False,
                    "runtime_limits": limits,
                }
            )
            actual, _ = await validate_compatible_publication(
                db, providers, models, features
            )
            await svc.publish_configuration(
                actual, models, features, admin_id=teacher.id
            )
            first = await resolve_ai_configuration(
                db, feature="calificacion.extraccion"
            )
            assert first["runtime_limits"] == limits
            assert (
                first["primary"]["connection"]["credential_revision"]
                == connection["credential_revision"]
            )
            old_client = [
                {k: v for k, v in f.items() if k != "runtime_limits"}
                for f in await svc.get_all_features()
            ]
            await validate_compatible_publication(db, actual, models, old_client)
            assert (
                next(
                    f for f in old_client if f["feature"] == "calificacion.extraccion"
                )["runtime_limits"]
                == limits
            )
            await svc.publish_configuration(
                actual, models, old_client, admin_id=teacher.id
            )
            reset = await svc.get_all_features()
            next(f for f in reset if f["feature"] == "calificacion.extraccion")[
                "runtime_limits"
            ] = None
            await validate_compatible_publication(db, actual, models, reset)
            await svc.publish_configuration(actual, models, reset, admin_id=teacher.id)
            assert (
                await resolve_ai_configuration(db, feature="calificacion.extraccion")
            )["runtime_limits"]["max_output_tokens"] == 10000
            assert first["runtime_limits"] == limits
            assert await svc.restore_previous_configuration(admin_id=teacher.id)
            assert (await svc.get_feature_config("calificacion.extraccion"))[
                "runtime_limits"
            ] == limits
            # Old clients on the legacy service also preserve omitted fields.
            await svc.save_features(features)
            await svc.save_features(
                [
                    {k: v for k, v in f.items() if k != "runtime_limits"}
                    for f in features
                ]
            )
            assert (await svc.get_feature_config("calificacion.extraccion"))[
                "runtime_limits"
            ] == limits
            assert (
                await db.scalar(
                    text(
                        "SELECT row_to_json(c)::text FROM calificaciones c WHERE id=:id"
                    ),
                    {"id": grade.id},
                )
                == before
            )
            assert "synthetic-key" not in str(first)
    finally:
        await engine.dispose()


async def test_concurrent_admins_conflict_and_teacher_cannot_publish():
    from fastapi import HTTPException
    from app.modules.admin_ai_config.router import publish_ai_control_center
    from app.modules.admin_ai_config.schemas import AIControlCenterPublication

    engine = engine_for_test()
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as db:
            svc = AIConfigService(db=db)
            features = await svc.get_all_features()
            next(f for f in features if f["feature"] == "calificacion.extraccion")[
                "runtime_limits"
            ]["call_timeout_seconds"] = 45
            payload = AIControlCenterPublication(
                expected_version=max(f.get("config_version") or 1 for f in features),
                providers=await svc.get_all_providers(),
                models=await svc.get_all_models(),
                features=features,
            )
        admin = SimpleNamespace(id=None, _effective_permissions={"admin_ai.manage"})

        async def publish():
            async with sessions() as db:
                try:
                    return await publish_ai_control_center(payload, admin, db)
                except HTTPException as exc:
                    await db.rollback()
                    return exc.status_code

        results = await asyncio.gather(publish(), publish())
        assert sum(isinstance(r, dict) and r["status"] == "ok" for r in results) == 1
        assert results.count(409) == 1
        teacher = SimpleNamespace(id=None, _effective_permissions={"grading.grade"})
        with pytest.raises(HTTPException) as denied:
            await publish_ai_control_center(payload, teacher, object())
        assert denied.value.status_code == 403
    finally:
        await engine.dispose()
