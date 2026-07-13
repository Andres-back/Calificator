from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.schemas import ExamenRequest
from app.services.llm_router import LLMRouter


async def generate(req: ExamenRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    tipos = ", ".join(req.tipos_pregunta)
    prompt = f"""{TOOLS_SYSTEM}

{ctx}
Cantidad de preguntas: {req.cantidad_preguntas}
Tipos de pregunta: {tipos}

Genera un examen educativo completo. Devuelve JSON:
{{
  "titulo": "...",
  "instrucciones": "...",
  "preguntas": [
    {{
      "numero": 1,
      "tipo": "opcion_multiple|abierta|verdadero_falso|completar",
      "enunciado": "...",
      "opciones": ["A)...","B)...","C)...","D)..."],
      "respuesta_correcta": "...",
      "puntaje": 1.0
    }}
  ],
  "total_puntaje": 5.0
}}"""
    return await llm.generate_json("examen", prompt)
