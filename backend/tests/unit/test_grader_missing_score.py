"""Spec 151: una salida sin nota conserva su motivo real (datos sintéticos, sin API)."""
import asyncio
import json
from types import SimpleNamespace

from app.modules.calificaciones import agents
from app.modules.calificaciones.agents import AgentResult, grader_agent, grader_output_shape
from app.modules.calificaciones.recovery import ReviewProgress

PRIVATE = "respuesta privada del estudiante"
OUTPUT = {
    "nota_sugerida": None,
    "confianza": 0.2,
    "feedback_estudiante": PRIVATE,
    "campo_inventado": PRIVATE,
    "componentes": [
        {"clave": "pregunta:1", "respuesta_estudiante": PRIVATE, "puntaje": 1, "estado": "correcta"},
        {"clave": "pregunta:2", "respuesta_estudiante": PRIVATE, "puntaje": None, "estado": "ilegible"},
        {"clave": "pregunta:3", "respuesta_estudiante": PRIVATE, "puntaje": True, "estado": PRIVATE},
    ],
}


def test_forma_de_la_salida_no_incluye_texto_del_estudiante():
    shape = grader_output_shape(OUTPUT)
    assert shape == {
        "campos": ["componentes", "confianza", "feedback_estudiante", "nota_sugerida"],
        "campos_desconocidos": 1,
        "nota_presente": True,
        "componentes": 3,
        "componentes_con_puntaje": 1,
        "estados": {"correcta": 1, "ilegible": 1, "otro": 1},
    }
    assert PRIVATE not in json.dumps(shape)
    assert grader_output_shape({"otra": 1})["nota_presente"] is False


def test_calificador_sin_nota_devuelve_motivo_y_forma(monkeypatch):
    class Client:
        async def chat(self, **_kwargs):
            return {"choices": [{"message": {"content": json.dumps(OUTPUT)}}]}

    monkeypatch.setattr(agents, "render_grader_prompt", lambda _ctx: "prompt")
    monkeypatch.setattr(agents, "grading_output_budget", lambda *_args, **_kwargs: 100)
    monkeypatch.setattr(agents, "client_provider_for_model", lambda *_args: "synthetic")
    ctx = SimpleNamespace(blueprint={}, requires_visual_material=False, evaluation_visuals=None, image_bytes=None)
    result = asyncio.run(grader_agent(ctx, model="m", client=Client()))
    assert result.nota_sugerida is None
    assert result.error == "grader_missing_score"
    assert result.raw_output["output_shape"]["estados"]["ilegible"] == 1
    assert PRIVATE not in json.dumps(result.raw_output)


def _missing() -> AgentResult:
    return AgentResult(nota_sugerida=None, confianza=0, feedback_estudiante="", error="grader_missing_score",
                       raw_output={"output_shape": grader_output_shape(OUTPUT)})


def _graded() -> AgentResult:
    return AgentResult(nota_sugerida=3.0, confianza=.8, feedback_estudiante="Explica la causa con un ejemplo.",
                       requiere_revision_docente=False)


def _run(responses: list[AgentResult]) -> tuple[AgentResult, ReviewProgress, list[int]]:
    calls: list[int] = []

    async def operation() -> AgentResult:
        calls.append(1)
        return responses[len(calls) - 1]

    progress = ReviewProgress(fingerprint="f", payload=None)
    result = asyncio.run(progress.run("grading_primary:a", operation, maximum_score=5, input_fingerprint="i"))
    return result, progress, calls


def test_etapa_reintenta_una_vez_si_falta_la_nota():
    result, progress, calls = _run([_missing(), _graded()])
    assert result.nota_sugerida == 3.0
    assert len(calls) == 2
    assert progress.summary()["grading_primary:a"]["status"] == "complete"


def test_etapa_no_supera_dos_intentos_y_conserva_motivo_y_forma():
    result, progress, calls = _run([_missing(), _missing(), _graded()])
    assert result.nota_sugerida is None
    assert len(calls) == 2
    assert result.error == "grader_missing_score"
    assert progress.summary()["grading_primary:a"]["error_code"] == "grader_missing_score"
    assert result.raw_output["output_shape"]["nota_presente"] is True


def test_otros_errores_no_transitorios_no_se_reintentan():
    other = AgentResult(nota_sugerida=None, confianza=0, feedback_estudiante="", error="output_refused")
    result, _progress, calls = _run([other, _graded()])
    assert len(calls) == 1
    assert result.error == "output_refused"
