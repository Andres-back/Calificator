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


def test_consensus_preserves_teacher_review_and_both_alerts_without_arbiter() -> None:
    class NoArbiter:
        async def chat(self, **_kwargs):
            raise AssertionError("El consenso no requiere una tercera valoración")

    primary = result(feedback="Revisa el razonamiento.", confidence=0.9, score=4.17)
    primary.requiere_revision_docente = True
    primary.alertas = ["Comprobar la respuesta de referencia."]
    primary.componentes = [{"clave": "pregunta:1", "puntaje": 1.17}]
    verifier = result(feedback="", confidence=0.88, score=4.17)
    verifier.alertas = ["La imagen necesita revisión docente."]

    consolidated = asyncio.run(comparator_agent(primary, verifier, client=NoArbiter()))

    assert consolidated.nota_sugerida == 4.17
    assert consolidated.modelo == "consenso"
    assert consolidated.requiere_revision_docente is True
    assert consolidated.alertas == primary.alertas + verifier.alertas
    assert consolidated.componentes == primary.componentes


def test_failed_verifier_returns_primary_for_review_without_extra_call(monkeypatch) -> None:
    calls: list[dict] = []

    class FakeArbiterClient:
        async def chat(self, **kwargs):
            calls.append(kwargs)
            raise AssertionError("No debe iniciar un arbitraje si falta la nota verificadora")

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
    assert calls == []
    assert consolidated.modelo == "resultado_parcial"
    assert consolidated.requiere_revision_docente is True
    assert consolidated.componentes == primary.componentes
    assert any("verificador" in alert.lower() for alert in consolidated.alertas)
