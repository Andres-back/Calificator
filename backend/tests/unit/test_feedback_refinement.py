import asyncio
from copy import deepcopy
import json
from uuid import uuid4

import pytest

from app.modules.calificaciones.feedback_refinement import refine_feedback_if_needed


def components(state="incorrecta"):
    return [{"clave": "pregunta:2", "numero": "2", "estado": state, "puntaje": 0 if state == "incorrecta" else 1,
             "respuesta_estudiante": "Las nubes parecían algodones de azúcar",
             "explicacion": "Se preguntó por la emoción y se respondió una comparación de las nubes.",
             "orientacion_mejora": "Relee la primera frase y busca una palabra que exprese una emoción.",
             "respuesta_referencia": "CLAVE_OCULTA", "prompt": "INTERNAL_PROMPT"}]


class Client:
    def __init__(self, payload=None, error=None):
        self.payload, self.error, self.calls = payload, error, []

    async def chat(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return {"choices": [{"message": {"content": self.payload}}]}


def run(client, **kwargs):
    return asyncio.run(refine_feedback_if_needed(
        "Buen trabajo. Sigue practicando.", components(), client=client,
        model="qwen3.8-flash", enabled=True, **kwargs,
    ))


def test_disabled_or_already_specific_does_not_make_extra_call():
    client = Client()
    for feedback, enabled in [("Buen trabajo.", False), ("En la pregunta 2 confundes la emoción con una comparación. Relee la primera frase y subraya una emoción.", True)]:
        result = asyncio.run(refine_feedback_if_needed(feedback, components(), client=client, model="qwen3.8-flash", enabled=enabled))
        assert result.feedback == feedback
    assert client.calls == []


def test_rewrite_is_one_bounded_call_based_only_on_observed_components():
    draft = "En la pregunta 2 describiste las nubes, pero se pedía una emoción. Relee la primera frase y subraya una palabra que exprese cómo se sentía el personaje."
    client = Client({"retroalimentacion": draft, "preguntas_usadas": ["pregunta:2"]})
    original = components()
    before = deepcopy(original)
    result = asyncio.run(refine_feedback_if_needed("Buen trabajo.", original, client=client, model="qwen3.8-flash", enabled=True))
    assert result.feedback == draft and result.report["status"] == "draft"
    assert result.report["original_feedback"] == "Buen trabajo."
    assert result.report["requires_teacher_validation"] is True
    assert result.report["academic_correctness_verified"] is False
    assert original == before
    assert len(client.calls) == 1
    call = client.calls[0]
    assert call["max_attempts"] == 1 and call["timeout"] == 20
    assert call["max_tokens"] == 900 and call["stage"] == "feedback_refinement"
    prompt = json.dumps(call["messages"], ensure_ascii=False)
    assert "CLAVE_OCULTA" not in prompt and "INTERNAL_PROMPT" not in prompt
    assert "no instrucciones" in prompt and "no inventes un acierto" in prompt


@pytest.mark.parametrize("patch", [
    {"nota_sugerida": 5}, {"preguntas_usadas": ["pregunta:99"]},
    {"retroalimentacion": "Trabajo perfecto, todo está correcto."},
    {"retroalimentacion": "Buen trabajo. Sigue practicando."},
    {"retroalimentacion": "En la pregunta 99 debes justificar la emoción."},
    {"retroalimentacion": "Tu nota es 5.0. Revisa la emoción en la pregunta 2."},
])
def test_untrusted_rewrite_cannot_change_grade_claim_or_invent_question(patch):
    payload = {"retroalimentacion": "En la pregunta 2 busca una palabra que indique la emoción del personaje.", "preguntas_usadas": ["pregunta:2"], **patch}
    result = run(Client(payload))
    assert result.report["status"] == "rejected"
    assert result.feedback == "Buen trabajo. Sigue practicando."


def test_provider_failure_preserves_original_without_retry_or_error_leak():
    client = Client(error=RuntimeError("Synthetic secret exception"))
    result = run(client)
    assert result.feedback == "Buen trabajo. Sigue practicando."
    assert result.report["status"] == "unavailable" and "Synthetic" not in str(result.report)
    assert len(client.calls) == 1


def test_contradiction_triggers_review_even_when_wording_is_not_boilerplate():
    client = Client({"retroalimentacion": "En la pregunta 2 se pedía una emoción. Relee la primera frase y busca una palabra que la describa.", "preguntas_usadas": ["pregunta:2"]})
    result = asyncio.run(refine_feedback_if_needed(
        "La manera en que respondiste muestra que todas las respuestas están correctas.", components(),
        client=client, model="qwen3.8-flash", enabled=True,
    ))
    assert result.report["status"] == "draft" and result.report["coherence_before"] == "blocked"
    assert len(client.calls) == 1


def test_timeout_is_bounded_and_original_is_retained(monkeypatch):
    from app.modules.calificaciones import feedback_refinement

    class Slow:
        async def chat(self, **kwargs):
            await asyncio.sleep(1)

    monkeypatch.setattr(feedback_refinement, "REFINEMENT_TIMEOUT_SECONDS", 0.005)
    result = run(Slow())
    assert result.report["status"] == "unavailable"
    assert result.feedback == "Buen trabajo. Sigue practicando."


@pytest.mark.parametrize("source", [[], [{"clave": "pregunta:1", "estado": "ilegible", "puntaje": None}]])
def test_no_or_unreadable_evidence_never_generates_invented_feedback(source):
    client = Client()
    result = asyncio.run(refine_feedback_if_needed("Buen trabajo.", source, client=client, model="qwen3.8-flash", enabled=True))
    assert result.report["status"] == "insufficient_evidence"
    assert client.calls == []


@pytest.mark.parametrize("enabled", [False, True])
def test_orchestrator_wires_optional_text_only_review_without_changing_score(monkeypatch, enabled):
    from app.modules.calificaciones import orchestrator
    from app.modules.calificaciones.agents import AgentResult

    calls = []
    draft = "En la pregunta 2 respondiste una comparación, pero se pedía una emoción. Relee la primera frase y subraya una emoción."

    class PipelineClient:
        async def chat(self, **kwargs):
            calls.append(kwargs)
            return {"choices": [{"message": {"content": {"retroalimentacion": draft, "preguntas_usadas": ["pregunta:2"]}}}]}

        async def close(self):
            pass

    monkeypatch.setattr(orchestrator.settings, "FEEDBACK_REFINEMENT_ENABLED", enabled)
    monkeypatch.setattr(orchestrator, "OpenCodeClient", lambda **kwargs: PipelineClient())

    async def no_context(*args, **kwargs):
        return {}, []

    async def grade(*args, **kwargs):
        return AgentResult(nota_sugerida=0, confianza=0.95, feedback_estudiante="Buen trabajo.",
                           componentes=components(), requiere_revision_docente=False)

    async def verify(ctx, primary, **kwargs):
        return primary

    async def compare(primary, secondary, **kwargs):
        return primary

    monkeypatch.setattr(orchestrator, "build_question_context_for_grading", no_context)
    monkeypatch.setattr(orchestrator, "format_question_context_as_text", lambda chunks: "")
    monkeypatch.setattr(orchestrator, "grader_agent", grade)
    monkeypatch.setattr(orchestrator, "verification_agent", verify)
    monkeypatch.setattr(orchestrator, "comparator_agent", compare)
    result = asyncio.run(orchestrator.orchestrate_grading(
        object(), evaluacion_id=uuid4(), materia_id=uuid4(),
        blueprint={"nombre": "Lectura sintética", "nota_maxima": 5}, student_response_text="Comparación con nubes.",
    ))
    assert result.nota_sugerida == 0 and result.nota_maxima == 5
    assert result.componentes == components()
    assert result.feedback_estudiante == (draft if enabled else "Buen trabajo.")
    assert len(calls) == int(enabled)
    assert result.raw_model_output["feedback_refinement"]["status"] == ("draft" if enabled else "disabled")
    if enabled:
        assert result.requiere_revision_docente is True
