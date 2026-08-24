import asyncio

from app.modules.calificaciones import agents
from app.modules.calificaciones.agents import AgentResult, comparator_agent


def result(*, feedback: str, confidence: float, score: float = 4.0) -> AgentResult:
    return AgentResult(
        nota_sugerida=score,
        confianza=confidence,
        feedback_estudiante=feedback,
        proveedor="test",
        modelo="test-model",
        requiere_revision_docente=False,
    )


def test_consensus_returns_one_feedback_from_most_reliable_grader() -> None:
    grading_a = result(
        feedback="Buen trabajo. Revisa la posicion de los decimales.",
        confidence=0.72,
    )
    grading_b = result(
        feedback="Alinea las comas decimales y comprueba los ejercicios 4 y 7.",
        confidence=0.94,
        score=4.1,
    )

    consolidated = asyncio.run(comparator_agent(grading_a, grading_b))

    assert consolidated.feedback_estudiante == grading_b.feedback_estudiante
    assert " | " not in consolidated.feedback_estudiante
    assert consolidated.requiere_revision_docente is False


def test_consensus_deduplicates_equal_feedback() -> None:
    feedback = "Explica con claridad el procedimiento usado."
    grading_a = result(feedback=f"  {feedback}  ", confidence=0.9)
    grading_b = result(feedback=feedback, confidence=0.9, score=4.2)

    consolidated = asyncio.run(comparator_agent(grading_a, grading_b))

    assert consolidated.feedback_estudiante == feedback


def test_forced_arbitration_calls_pro_once_when_verifier_failed(monkeypatch) -> None:
    calls: list[dict] = []

    class FakeArbiterClient:
        async def chat(self, **kwargs):
            calls.append(kwargs)
            return {
                "choices": [{
                    "message": {
                        "content": {
                            "nota_final": 4.0,
                            "discrepancia": True,
                            "feedback_integrado": "Se requiere revisión docente.",
                        }
                    }
                }]
            }

        async def close(self) -> None:
            return None

    monkeypatch.setattr(agents, "OpenCodeClient", FakeArbiterClient)
    primary = result(feedback="Desglose disponible.", confidence=0.9, score=4.0)
    failed_verifier = AgentResult(
        nota_sugerida=None,
        confianza=0,
        feedback_estudiante="",
        proveedor="opencode",
        modelo="deepseek-v4-flash",
        error="verifier_deadline_exceeded",
        requiere_revision_docente=True,
    )

    consolidated = asyncio.run(
        comparator_agent(
            primary,
            failed_verifier,
            model="deepseek-v4-pro",
            force_arbitration=True,
        )
    )

    assert consolidated.nota_sugerida == 4.0
    assert len(calls) == 1
    assert calls[0]["model"] == "deepseek-v4-pro"
    assert calls[0]["max_tokens"] == 1024
    assert calls[0]["stage"] == "consolidation"