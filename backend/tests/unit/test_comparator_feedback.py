import asyncio

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
