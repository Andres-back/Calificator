"""Synthetic-only regressions for bounded recovery; never call an external API."""
import asyncio
from collections import Counter
from contextlib import asynccontextmanager
from copy import deepcopy
import json
from statistics import median
import time
from uuid import uuid4

import httpx
import pytest

from app.modules.calificaciones.agents import AgentResult
from app.modules.calificaciones.execution_policy import (
    CALL_TIMEOUT_SECONDS, execution_policy, provider_error_code,
)
from app.modules.calificaciones.recovery import ReviewProgress


def valid(model="primary"):
    return AgentResult(nota_sugerida=3.5, confianza=.9,
        feedback_estudiante="Explica la causa del cambio con un ejemplo.",
        modelo=model, proveedor="synthetic", requiere_revision_docente=False)


def failed(code="provider_read_timeout"):
    return AgentResult(nota_sugerida=None, confianza=0,
        feedback_estudiante="", error=code, modelo="synthetic")


def test_sixty_second_policy_has_no_provider_or_model_names():
    assert CALL_TIMEOUT_SECONDS == 60
    assert execution_policy() == {"schema_version": 1, "call_timeout_seconds": 60,
                                  "max_stage_attempts": 2}


@pytest.mark.parametrize(("exc", "code"), [
    (httpx.ReadTimeout("private"), "provider_read_timeout"),
    (httpx.ConnectTimeout("private"), "provider_connect_timeout"),
    (httpx.WriteTimeout("private"), "provider_write_timeout"),
    (httpx.PoolTimeout("private"), "provider_pool_timeout"),
    (TimeoutError("private"), "provider_deadline_exceeded"),
    (ValueError("private"), "provider_error"),
])
def test_diagnostic_codes_do_not_include_provider_content(exc, code):
    assert provider_error_code(exc) == code


def test_retry_only_missing_verifier_and_reuse_primary_after_restart():
    async def scenario():
        persisted = {}
        calls = Counter()
        async def save(payload):
            persisted.clear()
            persisted.update(deepcopy(payload))
        async def primary():
            calls["primary"] += 1
            return valid()
        async def verifier():
            calls["verifier"] += 1
            return failed() if calls["verifier"] == 1 else valid("verifier")
        first = ReviewProgress(fingerprint="same", payload=None, save=save)
        await first.run("grading_primary:part1", primary, maximum_score=5)
        resumed = ReviewProgress(fingerprint="same", payload=persisted, save=save)
        await resumed.run("grading_primary:part1", primary, maximum_score=5)
        second = await resumed.run("grading_secondary:part1", verifier, maximum_score=5)
        assert second.nota_sugerida == 3.5
        assert calls == {"primary": 1, "verifier": 2}
        assert resumed.summary()["grading_secondary:part1"]["attempts"] == 2
    asyncio.run(scenario())


def test_interrupted_attempt_counts_across_restarts():
    async def scenario():
        saved = {}
        calls = 0
        async def save(payload):
            saved.clear()
            saved.update(deepcopy(payload))
        async def interrupted():
            nonlocal calls
            calls += 1
            raise asyncio.CancelledError()
        progress = ReviewProgress(fingerprint="same", payload=None, save=save)
        with pytest.raises(asyncio.CancelledError):
            await progress.run("primary", interrupted, maximum_score=5)
        resumed = ReviewProgress(fingerprint="same", payload=saved, save=save)
        with pytest.raises(asyncio.CancelledError):
            await resumed.run("primary", interrupted, maximum_score=5)
        exhausted = ReviewProgress(fingerprint="same", payload=saved, save=save)
        result = await exhausted.run("primary", interrupted, maximum_score=5)
        assert result.nota_sugerida is None
        assert calls == 2
    asyncio.run(scenario())


@pytest.mark.parametrize("error", ["http_401", "http_403", "output_refused", "output_incomplete", "output_budget_exhausted", "provider_error"])
def test_permanent_failure_does_not_auto_retry(error):
    async def scenario():
        calls = 0
        async def operation():
            nonlocal calls
            calls += 1
            return failed(error)
        progress = ReviewProgress(fingerprint="same", payload=None)
        await progress.run("primary", operation, maximum_score=5)
        await progress.run("primary", operation, maximum_score=5)
        assert calls == 1
    asyncio.run(scenario())


def test_changed_fingerprint_never_reuses_other_delivery_or_configuration():
    async def scenario():
        calls = 0
        async def operation():
            nonlocal calls
            calls += 1
            return valid()
        previous = ReviewProgress(fingerprint="old", payload=None)
        await previous.run("primary", operation, maximum_score=5)
        new = ReviewProgress(fingerprint="new", payload=previous.payload)
        await new.run("primary", operation, maximum_score=5)
        assert calls == 2
    asyncio.run(scenario())


def test_lost_ownership_before_attempt_prevents_inference():
    async def scenario():
        calls = 0
        async def save(_payload):
            raise RuntimeError("claim_lost")
        async def operation():
            nonlocal calls
            calls += 1
            return valid()
        with pytest.raises(RuntimeError, match="claim_lost"):
            await ReviewProgress(fingerprint="same", payload=None, save=save).run("primary", operation, maximum_score=5)
        assert calls == 0
    asyncio.run(scenario())


@pytest.mark.parametrize("inject_failures", [False, True])
def test_twenty_synthetic_deliveries_preserve_calls_and_bound_concurrency(inject_failures):
    async def scenario():
        slots = asyncio.Semaphore(4)
        active = peak = 0
        calls = Counter()
        async def operation(delivery, role):
            nonlocal active, peak
            async with slots:
                active += 1
                peak = max(peak, active)
                calls[delivery, role] += 1
                await asyncio.sleep(0)
                active -= 1
                if inject_failures and role == "secondary" and delivery % 5 == 0 and calls[delivery, role] == 1:
                    return failed()
                return valid(role)
        async def delivery(index):
            progress = ReviewProgress(fingerprint=f"delivery-{index}", payload=None)
            primary = await progress.run("primary", lambda: operation(index, "primary"), maximum_score=5)
            secondary = await progress.run("secondary", lambda: operation(index, "secondary"), maximum_score=5)
            assert primary.nota_sugerida is not None and secondary.nota_sugerida is not None
        await asyncio.gather(*(delivery(index) for index in range(20)))
        assert peak == 4
        assert sum(calls.values()) == (44 if inject_failures else 40)
        assert all(calls[index, "primary"] == 1 for index in range(20))
        assert all(calls[index, "secondary"] == (2 if inject_failures and index % 5 == 0 else 1) for index in range(20))
    asyncio.run(scenario())


@pytest.mark.parametrize("score", [float("nan"), float("inf"), -1, 6, True])
def test_invalid_scores_never_become_a_proposal(score):
    async def scenario():
        async def invalid():
            result = valid()
            result.nota_sugerida = score
            return result
        result = await ReviewProgress(fingerprint="same", payload=None).run("primary", invalid, maximum_score=5)
        assert result.nota_sugerida is None
        assert result.error == "output_invalid"
    asyncio.run(scenario())


def test_changed_rag_context_does_not_reuse_or_reset_attempts():
    async def scenario():
        calls = 0
        async def operation():
            nonlocal calls
            calls += 1
            return valid()
        progress = ReviewProgress(fingerprint="same", payload=None)
        await progress.run("primary", operation, maximum_score=5, input_fingerprint="rag-one")
        result = await progress.run("primary", operation, maximum_score=5, input_fingerprint="rag-two")
        assert result.nota_sugerida is None and result.error == "review_context_changed"
        assert calls == 1
        assert progress.summary()["primary"]["attempts"] == 1
    asyncio.run(scenario())


def test_reused_stage_is_marked_and_does_not_report_old_duration_as_new_work():
    async def scenario():
        async def operation():
            result = valid()
            result.tiempo_ms = 12345
            return result
        progress = ReviewProgress(fingerprint="same", payload=None)
        await progress.run("primary", operation, maximum_score=5)
        resumed = ReviewProgress(fingerprint="same", payload=progress.payload)
        result = await resumed.run("primary", operation, maximum_score=5)
        assert result.tiempo_ms == 0
        assert resumed.summary()["primary"]["reused"] is True
        assert resumed.summary()["primary"]["saved_time_ms"] == 12345
    asyncio.run(scenario())


def test_normalized_checkpoint_preserves_decision_flags_without_raw_answers():
    async def scenario():
        async def operation():
            result = valid("arbiter")
            result.raw_output = {"discrepancia": True, "diferencia": 1.5,
                "nota_final": 3.5, "raw_answer": "not-needed-in-recovery"}
            return result
        progress = ReviewProgress(fingerprint="same", payload=None)
        await progress.run("targeted_recheck", operation, maximum_score=5)
        resumed = ReviewProgress(fingerprint="same", payload=progress.payload)
        cached = await resumed.run("targeted_recheck", operation, maximum_score=5)
        assert cached.raw_output == {"discrepancia": True, "diferencia": 1.5, "nota_final": 3.5}
        assert "not-needed-in-recovery" not in json.dumps(resumed.payload)
    asyncio.run(scenario())


@pytest.mark.parametrize("persistent", [False, True])
def test_arbitration_retry_is_bounded_and_does_not_repeat_graders(monkeypatch, persistent):
    from unittest.mock import AsyncMock
    from app.modules.calificaciones import orchestrator
    class Client:
        async def close(self):
            pass
    primary = AsyncMock(return_value=valid())
    verifier_result = valid("verifier")
    verifier_result.nota_sugerida = 1.5
    verifier = AsyncMock(return_value=verifier_result)
    failed_arbiter = failed()
    failed_arbiter.nota_sugerida = 2.5  # Existing safe local comparator fallback.
    success = valid("arbiter")
    success.nota_sugerida = 2.5
    arbiter = AsyncMock(side_effect=[failed_arbiter, failed_arbiter if persistent else success])
    monkeypatch.setattr(orchestrator, "OpenCodeClient", lambda **_: Client())
    monkeypatch.setattr(orchestrator, "_run_grader_until_complete", primary)
    monkeypatch.setattr(orchestrator, "verification_agent", verifier)
    monkeypatch.setattr(orchestrator, "comparator_agent", arbiter)
    monkeypatch.setattr(orchestrator, "build_question_context_for_grading", AsyncMock(return_value=({}, [])))
    monkeypatch.setattr(orchestrator.settings, "FEEDBACK_REFINEMENT_ENABLED", False)
    async def scenario():
        progress = ReviewProgress(fingerprint="same", payload=None)
        async def run():
            return await orchestrator.orchestrate_grading(object(), evaluacion_id=uuid4(),
                materia_id=uuid4(), blueprint={"nombre": "Synthetic", "nota_maxima": 5},
                student_response_text="Respuesta", review_progress=progress)
        first = await run()
        assert arbiter.await_count == 2
        original_pipeline = first.raw_model_output["pipeline_run_id"]
        second = await run()
        assert first.nota_sugerida == second.nota_sugerida == 2.5
        assert primary.await_count == verifier.await_count == 1
        assert arbiter.await_count == 2
        assert second.raw_model_output["pipeline_run_id"] == original_pipeline
        if persistent:
            assert first.requiere_revision_docente
            assert first.raw_model_output["comparator"]["fallback_applied"]
    asyncio.run(scenario())


def test_admission_wait_does_not_consume_the_provider_deadline(monkeypatch):
    from app.modules.calificaciones import execution_policy as policy

    @asynccontextmanager
    async def delayed_admission(**kwargs):
        assert kwargs == {"strict": True}
        await asyncio.sleep(.03)
        yield

    monkeypatch.setattr(policy, "provider_capacity", delayed_admission)
    monkeypatch.setattr(policy, "CALL_TIMEOUT_SECONDS", .01)

    async def scenario():
        async with policy.grading_call_window("grading_primary"):
            await asyncio.sleep(0)
        with pytest.raises(TimeoutError):
            async with policy.grading_call_window("grading_secondary"):
                await asyncio.sleep(.1)
    asyncio.run(scenario())


def test_configured_grading_uses_sixty_seconds_not_the_shared_connection_limit(monkeypatch):
    from unittest.mock import AsyncMock
    from app.modules.calificaciones import agents
    seen = []
    async def call(_selection, _secret, _messages, **kwargs):
        seen.append(kwargs["timeout"].read)
        return {"choices": [{"message": {"content": '{"ok":true}'}}]}
    monkeypatch.setattr(agents, "call_configured_api", call)
    monkeypatch.setattr(agents, "log_ai_usage", AsyncMock())

    async def scenario():
        selected = {"provider": "synthetic", "model": "chosen-model",
            "connection": {"timeout_seconds": 45, "credential_revision": "revision"},
            "runtime_profile": {"protocol": "responses"}}
        client = agents.OpenCodeClient(tracking={"_ai_config": {"primary": selected}})
        client._configured_secrets = {"revision": "synthetic-only"}
        try:
            await client.chat("chosen-model", [], stage="grading_primary", max_attempts=1)
            await client.chat("chosen-model", [], stage="vision", max_attempts=1)
        finally:
            await client.close()
        assert seen == [60, 45]
        assert selected["connection"]["timeout_seconds"] == 45
    asyncio.run(scenario())


@pytest.mark.parametrize(("failed_role", "persistent", "expected"), [
    ("primary", False, {"primary": 2, "secondary": 1}),
    ("secondary", False, {"primary": 1, "secondary": 2}),
    ("secondary", True, {"primary": 1, "secondary": 2}),
    (None, False, {"primary": 1, "secondary": 1}),
])
@pytest.mark.parametrize("with_image", [False, True])
def test_orchestrator_recovers_same_role_then_runs_independent_verifier(monkeypatch, failed_role, persistent, expected, with_image):
    from unittest.mock import AsyncMock
    from app.modules.calificaciones import orchestrator

    class Client:
        async def close(self):
            pass

    calls = Counter()
    expected = {**expected, **({"vision": 1} if with_image else {})}
    async def vision(*_args, **_kwargs):
        calls["vision"] += 1
        return AgentResult(nota_sugerida=None, confianza=.95, feedback_estudiante="",
            raw_output={"usable": True, "texto_extraido": "1. Una respuesta",
                "respuestas_detectadas": [{"pregunta": 1, "respuesta": "Una respuesta", "legible": True}]})
    async def primary(_ctx, *, models, **_kwargs):
        assert models == ["chosen-primary"]
        calls["primary"] += 1
        return failed() if failed_role == "primary" and calls["primary"] == 1 else valid("chosen-primary")
    async def secondary(_ctx, previous, *, model, **_kwargs):
        assert previous.nota_sugerida == 3.5
        assert model == "chosen-verifier"
        calls["secondary"] += 1
        return failed() if failed_role == "secondary" and (persistent or calls["secondary"] == 1) else valid("chosen-verifier")
    monkeypatch.setattr(orchestrator, "OpenCodeClient", lambda **_: Client())
    monkeypatch.setattr(orchestrator, "_run_grader_until_complete", primary)
    monkeypatch.setattr(orchestrator, "verification_agent", secondary)
    monkeypatch.setattr(orchestrator, "vision_agent", vision)
    monkeypatch.setattr(orchestrator, "build_question_context_for_grading", AsyncMock(return_value=({}, [])))
    monkeypatch.setattr(orchestrator.settings, "FEEDBACK_REFINEMENT_ENABLED", False)

    async def scenario():
        progress = ReviewProgress(fingerprint="same", payload=None)
        async def run():
            return await orchestrator.orchestrate_grading(object(), evaluacion_id=uuid4(),
                materia_id=uuid4(), blueprint={"nombre": "Synthetic", "nota_maxima": 5},
                student_response_text="Una respuesta", review_progress=progress,
                image_bytes=b"synthetic" if with_image else None,
                grader_a_model="chosen-primary", verifier_model="chosen-verifier")
        result = await run()
        assert calls == expected
        raw = result.raw_model_output
        assert raw["grader_a"]["modelo"] == "chosen-primary"
        assert raw["verification_status"] == ("pending" if persistent else "complete")
        assert raw["pending_stages"] == (["grading_secondary"] if persistent else [])
        if persistent:
            assert result.requiere_revision_docente
            assert raw["comparator"]["modelo"] == "resultado_parcial"
        await run()  # A restarted execution must not infer completed or exhausted roles again.
        assert calls == expected
    asyncio.run(scenario())


class SyntheticRedis:
    def __init__(self):
        self.slots = {}

    async def set(self, key, value, **_kwargs):
        if key in self.slots:
            return False
        self.slots[key] = value
        return True

    async def eval(self, script, _count, key, token, *_args):
        if self.slots.get(key) != token:
            return 0
        if "del" in script:
            del self.slots[key]
        return 1

    async def aclose(self):
        pass


def test_twenty_calls_use_the_actual_distributed_admission_guard(monkeypatch):
    from app.services import ai_provider_capacity as capacity
    from app.modules.calificaciones import execution_policy as policy
    redis = SyntheticRedis()
    monkeypatch.setattr(capacity.Redis, "from_url", lambda *_a, **_kw: redis)
    monkeypatch.setattr(capacity.settings, "AI_PROVIDER_MAX_CONCURRENCY", 4)
    monkeypatch.setattr(policy, "provider_capacity", capacity.provider_capacity)

    async def scenario():
        active = peak = calls = 0
        async def request():
            nonlocal active, peak, calls
            async with policy.grading_call_window("grading_primary"):
                active += 1
                calls += 1
                peak = max(peak, active)
                await asyncio.sleep(.001)
                active -= 1
        await asyncio.gather(*(request() for _ in range(20)))
        assert calls == 20 and peak == 4
        assert redis.slots == {}
    asyncio.run(scenario())


def test_redis_failure_does_not_fail_open_for_grading(monkeypatch):
    from redis.exceptions import RedisError
    from app.services import ai_provider_capacity as capacity
    def unavailable(*_args, **_kwargs):
        raise RedisError("synthetic")
    monkeypatch.setattr(capacity.Redis, "from_url", unavailable)

    async def scenario():
        with pytest.raises(capacity.ProviderCapacityUnavailable):
            async with capacity.provider_capacity(strict=True):
                pytest.fail("Must not send inference without admission")
    asyncio.run(scenario())


def test_lost_capacity_lease_cancels_the_current_call(monkeypatch):
    from app.services import ai_provider_capacity as capacity
    redis = SyntheticRedis()
    original_eval = redis.eval
    async def lose(script, *args):
        return 0 if "expire" in script else await original_eval(script, *args)
    monkeypatch.setattr(redis, "eval", lose)
    monkeypatch.setattr(capacity.Redis, "from_url", lambda *_a, **_kw: redis)
    monkeypatch.setattr(capacity, "_REFRESH_SECONDS", .001)

    async def scenario():
        with pytest.raises(capacity.ProviderCapacityUnavailable):
            async with capacity.provider_capacity(strict=True):
                await asyncio.sleep(.05)
        assert redis.slots == {}
    asyncio.run(scenario())


def test_normal_twenty_delivery_path_has_no_extra_calls_or_material_cpu_overhead(monkeypatch):
    """Compare stage bookkeeping with a no-bookkeeping control, instant API replies.

    This measures in-process pipeline overhead, not SQL durability or API latency.
    The separate PostgreSQL test verifies durability without claiming its latency.
    """
    from unittest.mock import AsyncMock
    from app.modules.calificaciones import orchestrator
    calls = 0
    components = [{"componente_id": f"pregunta:{i}", "pregunta_numero": str(i),
        "puntos_obtenidos": .2, "puntos_maximos": 5 / 24,
        "explicacion": "Identificaste la causa; agrega un ejemplo del texto."} for i in range(1, 25)]
    content = json.dumps({"nota_sugerida": 4.8, "confianza": .95,
        "feedback_estudiante": "En la pregunta 7 identificaste la causa. Explica un ejemplo del texto para justificarla.",
        "componentes": components, "requiere_revision_docente": False})

    class Client:
        async def close(self):
            pass
        async def chat(self, **_kwargs):
            nonlocal calls
            calls += 1
            return {"choices": [{"message": {"content": content}}]}

    class Control:
        def __init__(self):
            self.payload = {}
        async def run(self, _stage, operation, **_kwargs):
            return await operation()
        def summary(self):
            return {}
        def run_timings(self):
            return {}

    monkeypatch.setattr(orchestrator, "OpenCodeClient", lambda **_: Client())
    monkeypatch.setattr(orchestrator, "build_question_context_for_grading", AsyncMock(return_value=({}, [])))
    monkeypatch.setattr(orchestrator.settings, "FEEDBACK_REFINEMENT_ENABLED", False)
    blueprint = {"nombre": "Synthetic", "nota_maxima": 5, "preguntas": [
        {"numero": i, "enunciado": f"Explica la causa del cambio {i}", "tipo": "abierta", "puntos": 5 / 24}
        for i in range(1, 25)]}

    async def scenario():
        async def batch(progress_factory):
            nonlocal calls
            before = calls
            started = time.perf_counter()
            for _ in range(20):
                result = await orchestrator.orchestrate_grading(object(), evaluacion_id=uuid4(),
                    materia_id=uuid4(), blueprint=blueprint, student_response_text="1. Una respuesta",
                    review_progress=progress_factory())
                assert result.nota_sugerida is not None
            return time.perf_counter() - started, calls - before

        normal, control = [], []
        # Alternate order and warm both paths before measuring medians.
        await batch(Control)
        await batch(lambda: ReviewProgress(fingerprint="same", payload=None))
        for _ in range(5):
            reference, reference_calls = await batch(Control)
            measured, measured_calls = await batch(lambda: ReviewProgress(fingerprint="same", payload=None))
            assert measured_calls == reference_calls == 40
            control.append(reference)
            normal.append(measured)
        ratio = median(normal) / median(control)
        print(f"synthetic_pipeline_cpu_ratio={ratio:.3f}; extra_ms_per_delivery={(median(normal)-median(control))*50:.3f}; calls=40/20 deliveries; no real API")
        assert ratio <= 1.10
    asyncio.run(scenario())
