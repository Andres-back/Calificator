"""Quiz rápido: evaluación corta con preguntas de selección múltiple."""
from __future__ import annotations

from app.core.logging import get_logger
from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.schemas import QuizRapidoRequest
from app.services.llm_router import LLMRouter

logger = get_logger(__name__)


async def generate(req: QuizRapidoRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    prompt = f"""{TOOLS_SYSTEM}

{ctx}

Genera un quiz rápido de {req.cantidad_preguntas} preguntas de opción múltiple
sobre el tema. Cada pregunta debe tener 4 opciones y una respuesta correcta
(claramente marcada). Apropiado para el grado indicado.
Devuelve SOLO JSON:
{{"titulo":"...","instrucciones":"...","preguntas":[{{"numero":1,"enunciado":"...","opciones":["A) ...","B) ...","C) ...","D) ..."],"respuesta_correcta":"A)"}}]}}"""

    result = await llm.generate_json("quiz_rapido", prompt)
    if not isinstance(result, dict):
        result = {}

    preguntas = result.get("preguntas", [])
    if not isinstance(preguntas, list):
        preguntas = []

    titulo = (result.get("titulo") or req.titulo or "Quiz rápido").strip()
    instrucciones = (result.get("instrucciones") or "Selecciona la opción correcta para cada pregunta.").strip()

    return {
        "titulo": titulo,
        "instrucciones": instrucciones,
        "preguntas": preguntas,
    }
