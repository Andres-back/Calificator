"""Private, synthetic-only PostgreSQL contracts; no external inference requests."""

import os
import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.services.ai_api_connections import (
    APIConnectionError,
    create_compatible_connection,
    probe_compatible_model,
    validate_compatible_publication,
)
from app.services.ai_api_transport import ModelRuntimeProfile
from app.services.ai_config_service import AIConfigService
from app.services.ai_credentials_service import (
    create_api_credential_revision,
    resolve_api_credential,
)

DATABASE = os.getenv("SPEC116_TEST_DATABASE_URL", "")
pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(not DATABASE, reason="requires isolated Spec 116 database"),
]


async def session_factory():
    if not DATABASE.endswith("/spec116"):
        raise RuntimeError("Spec 116 tests require an isolated database named spec116")
    engine = create_async_engine(DATABASE)
    return engine, async_sessionmaker(engine, expire_on_commit=False)


async def test_new_api_profiles_secrets_proof_publication_and_snapshot(
    monkeypatch, fb_case_factory
):
    import app.services.ai_api_connections as connections
    from app.services.ai_configuration_resolver import resolve_ai_configuration

    monkeypatch.setattr(
        connections, "validate_api_base_url", lambda url, **_: url.rstrip("/")
    )
    calls = []

    async def synthetic_call(selection, secret, messages, **kwargs):
        assert secret == "synthetic-connection-key"
        calls.append(selection)
        return {"choices": [{"message": {"content": '{"ok":true}'}}]}

    monkeypatch.setattr(connections, "call_configured_api", synthetic_call)
    engine, sessions = await session_factory()
    try:
        async with sessions() as db:
            from app.db.base import import_models
            from app.modules.calificaciones.models import Entrega

            import_models()
            teacher, student, subject, evaluation, grade = await fb_case_factory(db)
            evidence = Entrega(
                evaluacion_id=evaluation.id,
                estudiante_id=student.id,
                materia_id=subject.id,
                tipo="foto",
                archivo_url="synthetic-only/no-real-file.png",
                estado="calificada",
            )
            db.add(evidence)
            await db.flush()
            grade.entrega_id = evidence.id
            await db.commit()
            before = (
                await db.execute(
                    text(
                        "SELECT row_to_json(c)::text FROM calificaciones c WHERE id=:id"
                    ),
                    {"id": grade.id},
                )
            ).scalar()
            evidence_before = (
                await db.execute(
                    text("SELECT row_to_json(e)::text FROM entregas e WHERE id=:id"),
                    {"id": evidence.id},
                )
            ).scalar()
            service = AIConfigService(db=db)
            await service.init()
            connection = await create_compatible_connection(
                db,
                label="Direct independent API",
                base_url="https://example.com/v1",
                secret="synthetic-connection-key",
                actor_id=uuid4(),
            )
            assert "synthetic-connection-key" not in str(connection)
            encrypted = await db.scalar(
                text("SELECT secret_encrypted FROM ai_api_credentials WHERE id=:id"),
                {"id": connection["credential_revision"]},
            )
            assert (
                encrypted.startswith("enc:v1:")
                and "synthetic-connection-key" not in encrypted
            )
            model = {
                "provider_id": connection["id"],
                "model_id": "brand-new-model-2099",
                "label": "Future model",
                "capabilities": ["text"],
                "active": True,
                "recommended": False,
                "runtime_profile": ModelRuntimeProfile(
                    protocol="responses"
                ).model_dump(),
            }
            probe = await probe_compatible_model(
                db, provider=connection, model=model, actor_id=uuid4()
            )
            assert probe["status"] == "ok" and len(calls) == 1
            providers = await service.get_all_providers() + [probe["provider"]]
            models = await service.get_all_models() + [probe["model"]]
            features = [
                f
                for f in await service.get_all_features()
                if f["feature"] != "calificacion.valoracion"
            ]
            route = {
                "feature": "calificacion.valoracion",
                "label": "Principal",
                "capability": "text",
                "primary_provider": connection["id"],
                "primary_model": model["model_id"],
                "fallback_provider": None,
                "fallback_model": None,
                "active": True,
                "rollout_enabled": False,
            }
            features.append(route)
            actual, changed = await validate_compatible_publication(
                db, providers, models, features
            )
            assert route in changed and actual[-1]["auth_configured"]
            await service.publish_configuration(
                actual, models, features, admin_id=uuid4()
            )
            snapshot = await resolve_ai_configuration(
                db, feature="calificacion.valoracion"
            )
            assert snapshot["primary"]["provider"] == connection["id"]
            assert snapshot["primary"]["runtime_profile"]["protocol"] == "responses"
            assert (
                snapshot["primary"]["connection"]["base_url"]
                == "https://example.com/v1"
            )
            assert "synthetic-connection-key" not in str(snapshot)
            changed_model = {
                **probe["model"],
                "runtime_profile": ModelRuntimeProfile(
                    protocol="messages"
                ).model_dump(),
            }
            altered = [
                m
                if (m["provider_id"], m["model_id"])
                != (model["provider_id"], model["model_id"])
                else changed_model
                for m in models
            ]
            with pytest.raises(APIConnectionError, match="Prueba nuevamente"):
                await validate_compatible_publication(db, actual, altered, features)
            assert (await service.get_feature_config("calificacion.valoracion"))[
                "primary_model"
            ] == model["model_id"]
            assert (
                await db.execute(
                    text(
                        "SELECT row_to_json(c)::text FROM calificaciones c WHERE id=:id"
                    ),
                    {"id": grade.id},
                )
            ).scalar() == before
            assert (
                await db.execute(
                    text("SELECT row_to_json(e)::text FROM entregas e WHERE id=:id"),
                    {"id": evidence.id},
                )
            ).scalar() == evidence_before
            # A browser cannot authorize a different destination or vision with the old proof.
            for altered in (
                {**probe["model"], "verification_id": str(uuid4())},
                {**probe["model"], "capabilities": ["text", "vision"]},
            ):
                with pytest.raises(APIConnectionError, match="Prueba nuevamente"):
                    await validate_compatible_publication(
                        db,
                        actual,
                        [
                            m
                            if (m["provider_id"], m["model_id"])
                            != (model["provider_id"], model["model_id"])
                            else altered
                            for m in models
                        ],
                        features,
                    )
            assert snapshot["primary"]["runtime_profile"]["protocol"] == "responses"
    finally:
        await engine.dispose()


async def test_rotation_is_private_and_old_jobs_do_not_use_new_keys(monkeypatch):
    import app.services.ai_api_connections as connections

    monkeypatch.setattr(
        connections, "validate_api_base_url", lambda url, **_: url.rstrip("/")
    )
    engine, sessions = await session_factory()
    try:
        async with sessions() as db:
            original = await create_compatible_connection(
                db,
                label="Only synthetic",
                base_url="https://example.com/v1",
                secret="old-synthetic-key",
                actor_id=uuid4(),
            )
            changed = await create_api_credential_revision(
                db,
                provider_id=original["id"],
                base_url="https://other.example/v1",
                secret="new-synthetic-key",
                actor_id=uuid4(),
            )
            await db.commit()
            assert await resolve_api_credential(db, original) == "old-synthetic-key"
            with pytest.raises(ValueError):
                await resolve_api_credential(
                    db, {**original, "credential_revision": changed}
                )
            await db.execute(
                text("UPDATE ai_api_credentials SET revoked_at=NOW() WHERE id=:id"),
                {"id": original["credential_revision"]},
            )
            await db.commit()
            with pytest.raises(ValueError):
                await resolve_api_credential(db, original)
    finally:
        await engine.dispose()


async def test_non_admin_cannot_prepare_connection_or_probe():
    from fastapi import HTTPException
    from app.modules.admin_ai_config.router import (
        create_compatible_api,
        probe_compatible_api,
    )
    from app.modules.admin_ai_config.schemas import CompatibleAPIConnectionCreate
    from app.shared.enums import UserRole

    teacher = SimpleNamespace(id=uuid4(), rol=UserRole.PROFESOR, role=UserRole.PROFESOR)
    with pytest.raises(HTTPException) as denied:
        await create_compatible_api(
            CompatibleAPIConnectionCreate(
                label="blocked", base_url="https://example.com/v1", api_key="not-used"
            ),
            teacher,
            None,
        )
    assert denied.value.status_code == 403
    with pytest.raises(HTTPException):
        await probe_compatible_api(None, teacher, None)


async def test_simultaneous_publications_accept_only_one_version():
    from fastapi import HTTPException
    from app.modules.admin_ai_config.router import publish_ai_control_center
    from app.modules.admin_ai_config.schemas import AIControlCenterPublication

    engine, sessions = await session_factory()
    actor = SimpleNamespace(id=uuid4(), _effective_permissions={"admin_ai.manage"})
    try:
        async with sessions() as db:
            service = AIConfigService(db=db)
            await service.init()
            features = await service.get_all_features()
            payload = AIControlCenterPublication(
                expected_version=max(f.get("config_version") or 1 for f in features),
                providers=await service.get_all_providers(),
                models=await service.get_all_models(),
                features=features,
            )

        async def publish():
            async with sessions() as db:
                try:
                    return await publish_ai_control_center(payload, actor, db)
                except HTTPException as exc:
                    await db.rollback()
                    return exc.status_code

        results = await asyncio.gather(publish(), publish())
        assert (
            sum(
                isinstance(result, dict) and result["status"] == "ok"
                for result in results
            )
            == 1
        )
        assert results.count(409) == 1
    finally:
        await engine.dispose()


async def test_five_approved_routes_resolve_without_rewriting_unrelated_routes(
    monkeypatch,
):
    import copy
    import app.services.ai_api_connections as connections
    from app.services.ai_configuration_resolver import resolve_ai_configuration

    monkeypatch.setattr(
        connections, "validate_api_base_url", lambda url, **_: url.rstrip("/")
    )
    monkeypatch.setattr(
        connections,
        "_probe_messages",
        lambda vision: (
            [{"role": "user", "content": "synthetic only"}],
            {"numero": "741"},
        ),
    )

    async def synthetic_call(*args, **kwargs):
        return {"choices": [{"message": {"content": '{"numero":"741"}'}}]}

    monkeypatch.setattr(connections, "call_configured_api", synthetic_call)
    engine, sessions = await session_factory()
    try:
        async with sessions() as db:
            service = AIConfigService(db=db)
            await service.init()
            original_providers = await service.get_all_providers()
            if not any(p["id"] == "open_code" for p in original_providers):
                from app.services.ai_config_service import DEFAULT_PROVIDERS

                # Migrations seed only a subset; prepare the synthetic baseline.
                original_providers += [
                    {"name": p["id"], **p}
                    for p in DEFAULT_PROVIDERS
                    if p["id"] == "open_code"
                ]
                await service.publish_configuration(
                    original_providers,
                    await service.get_all_models(),
                    await service.get_all_features(),
                    admin_id=uuid4(),
                )
                original_providers = await service.get_all_providers()
            original_features = await service.get_all_features()
            providers = copy.deepcopy(original_providers)
            provider = next(p for p in providers if p["id"] == "open_code")
            provider["credential_revision"] = await create_api_credential_revision(
                db,
                provider_id="open_code",
                base_url=provider["base_url"],
                secret="synthetic-route-key",
                actor_id=uuid4(),
            )
            await db.commit()
            models = await service.get_all_models()
            for identifier, protocol in [
                ("synthetic-luna", "responses"),
                ("synthetic-glm", "chat_completions"),
            ]:
                probe = await probe_compatible_model(
                    db,
                    provider=provider,
                    actor_id=uuid4(),
                    model={
                        "provider_id": "open_code",
                        "model_id": identifier,
                        "label": identifier,
                        "capabilities": ["text", "vision"],
                        "active": True,
                        "runtime_profile": {"protocol": protocol},
                    },
                )
                assert probe["status"] == "ok"
                models = [
                    m
                    for m in models
                    if (m["provider_id"], m["model_id"]) != ("open_code", identifier)
                ] + [probe["model"]]
            choices = {
                "digitalizacion.extraccion": "synthetic-luna",
                "digitalizacion.estructura": "synthetic-luna",
                "calificacion.valoracion": "synthetic-luna",
                "calificacion.verificacion": "synthetic-glm",
                "calificacion.revision_adicional": "synthetic-luna",
            }
            features = copy.deepcopy(original_features)
            for name, identifier in choices.items():
                feature = next((f for f in features if f["feature"] == name), None)
                if feature is None:
                    feature = {
                        "feature": name,
                        "label": name,
                        "capability": "vision"
                        if name.endswith(".extraccion")
                        else "text",
                        "active": True,
                        "rollout_enabled": False,
                    }
                    features.append(feature)
                feature.update(
                    primary_provider="open_code",
                    primary_model=identifier,
                    fallback_provider=None,
                    fallback_model=None,
                )
                if name.startswith("digitalizacion."):
                    feature.update(
                        fallback_provider="open_code", fallback_model="synthetic-glm"
                    )
            actual, changed = await validate_compatible_publication(
                db, providers, models, features
            )
            assert {f["feature"] for f in changed} == set(choices)
            await service.publish_configuration(
                actual, models, features, admin_id=uuid4()
            )
            for name, identifier in choices.items():
                resolved = await resolve_ai_configuration(db, feature=name)
                assert resolved["primary"]["provider"] == "open_code"
                assert resolved["primary"]["model"] == identifier
                assert (
                    resolved["primary"]["connection"]["credential_revision"]
                    == provider["credential_revision"]
                )
                if name.startswith("digitalizacion."):
                    assert resolved["fallback"]["model"] == "synthetic-glm"
            after = await service.get_all_features()
            fields = (
                "feature",
                "primary_provider",
                "primary_model",
                "fallback_provider",
                "fallback_model",
                "capability",
                "active",
                "rollout_enabled",
            )
            assert [
                {k: f.get(k) for k in fields}
                for f in after
                if f["feature"] not in choices
            ] == [
                {k: f.get(k) for k in fields}
                for f in original_features
                if f["feature"] not in choices
            ]
            assert "synthetic-route-key" not in str(after)
    finally:
        await engine.dispose()
