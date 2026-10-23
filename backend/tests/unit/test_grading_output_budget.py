import asyncio
import json

import pytest

from app.core.config import settings
from app.modules.calificaciones import agents
from app.modules.calificaciones.output_budget import grading_output_budget


def blueprint(count):
    return {
        "nota_maxima": 5,
        "preguntas": [
            {"numero": i + 1, "enunciado": "Explica tu respuesta."}
            for i in range(count)
        ],
    }


@pytest.mark.parametrize(
    "stage", ["grading_primary", "grading_secondary", "targeted_recheck"]
)
def test_budget_grows_with_components_without_exceeding_ceiling(monkeypatch, stage):
    monkeypatch.setattr(settings, "PHOTO_GRADING_OUTPUT_MAX_TOKENS", 16384)
    budgets = [
        grading_output_budget(blueprint(n), stage=stage) for n in (1, 8, 24, 100)
    ]
    assert budgets == sorted(budgets)
    assert budgets[2] > budgets[0]
    assert all(256 <= value <= 16384 for value in budgets)
    assert budgets[-1] == 16384


def test_rubric_and_explicit_limits_are_also_bounded(monkeypatch):
    monkeypatch.setattr(settings, "PHOTO_GRADING_OUTPUT_MAX_TOKENS", 8192)
    rubric = {"criterios": [{"nombre": str(i), "peso": 1} for i in range(24)]}
    assert grading_output_budget(rubric) > settings.PHOTO_GRADING_PRIMARY_MAX_TOKENS
    assert grading_output_budget(blueprint(100), requested=100000) == 8192
    assert grading_output_budget(blueprint(24), requested=512) == 512
    assert (
        grading_output_budget(blueprint(1)) == settings.PHOTO_GRADING_PRIMARY_MAX_TOKENS
    )


class CapturingClient:
    def __init__(self):
        self.requests = []

    def supports_vision(self, _model):
        return True

    async def chat(self, **options):
        self.requests.append(options)
        return {
            "choices": [
                {
                    "message": {
                        "content": json.dumps(
                            {
                                "nota_sugerida": 3,
                                "confianza": 0.8,
                                "componentes": [],
                                "componentes_verificados": [],
                                "requiere_arbitraje": False,
                            }
                        )
                    }
                }
            ]
        }

    chat_multimodal = chat


@pytest.mark.parametrize("multimodal", [False, True])
def test_grader_and_verifier_use_component_budget_with_any_model(multimodal):
    ctx = agents.AgentContext(
        evaluacion_nombre="Sintética",
        nota_maxima=5,
        blueprint=blueprint(24),
        image_bytes=b"synthetic",
    )
    client = CapturingClient()
    primary = asyncio.run(
        agents.grader_agent(
            ctx, model="arbitrary-2099", client=client, multimodal=multimodal
        )
    )
    secondary = asyncio.run(
        agents.verification_agent(
            ctx, primary, model="another-2099", client=client, multimodal=multimodal
        )
    )
    assert primary.nota_sugerida is not None and secondary.nota_sugerida is not None
    assert len(client.requests) == 2
    assert client.requests[0]["max_tokens"] == grading_output_budget(ctx.blueprint)
    assert client.requests[1]["max_tokens"] == grading_output_budget(
        ctx.blueprint, stage="grading_secondary"
    )
    assert client.requests[0]["max_tokens"] > 3072
    assert client.requests[1]["max_tokens"] > 2048


@pytest.mark.parametrize("verifier", [False, True])
def test_configured_truncation_records_usage_once_and_never_becomes_a_score(
    monkeypatch, verifier
):
    from app.services.ai_api_transport import APIOutputError

    calls, events = [], []

    async def truncated(*_args, **kwargs):
        calls.append(kwargs)
        raise APIOutputError(
            "output_budget_exhausted",
            usage={"input_tokens": 123, "output_tokens": 3072},
        )

    async def record(**event):
        events.append(event)

    monkeypatch.setattr(agents, "call_configured_api", truncated)

    async def scenario():
        selection = {
            "provider": "custom_api",
            "model": "unseen-model",
            "runtime_profile": {"protocol": "responses"},
            "connection": {"credential_revision": "synthetic", "max_retries": 5},
        }
        client = agents.OpenCodeClient(tracking={"_ai_config": {"primary": selection}})
        client._configured_secrets = {"synthetic": "not-real"}
        client._log_call = record
        ctx = agents.AgentContext(
            evaluacion_nombre="Prueba", nota_maxima=5, blueprint=blueprint(24)
        )
        try:
            if verifier:
                return await agents.verification_agent(
                    ctx,
                    agents.AgentResult(3, 0.9, ""),
                    model="unseen-model",
                    client=client,
                )
            return await agents.grader_agent(ctx, model="unseen-model", client=client)
        finally:
            await client.close()

    result = asyncio.run(scenario())
    assert result.nota_sugerida is None and result.requiere_revision_docente
    assert result.error == "output_budget_exhausted"
    assert len(calls) == len(events) == 1
    assert events[0]["error_code"] == "output_budget_exhausted"
    assert events[0]["input_tokens"] == 123 and events[0]["output_tokens"] == 3072
