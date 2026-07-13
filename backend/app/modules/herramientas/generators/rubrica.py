from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.schemas import RubricaRequest
from app.services.llm_router import LLMRouter


async def generate(req: RubricaRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    criterios = "\n".join(f"- {c}" for c in req.criterios) if req.criterios else "(generar criterios apropiados)"
    escala = ", ".join(req.escala)
    prompt = f"""{TOOLS_SYSTEM}

{ctx}
Criterios de evaluación:
{criterios}
Escala de valoración: {escala}

Genera una rúbrica de evaluación. Devuelve JSON:
{{
  "titulo": "...",
  "escala": ["..."],
  "criterios": [
    {{
      "nombre": "...",
      "descripcion": "...",
      "peso_porcentaje": 25,
      "niveles": {{
        "Excelente": "...",
        "Bueno": "...",
        "Regular": "...",
        "Insuficiente": "..."
      }}
    }}
  ]
}}"""
    return await llm.generate_json("rubrica", prompt)
