from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.schemas import PlanRefuerzoRequest
from app.services.llm_router import LLMRouter


async def generate(req: PlanRefuerzoRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    dificultades = "\n".join(f"- {d}" for d in req.dificultades) if req.dificultades else "(no especificadas)"
    prompt = f"""{TOOLS_SYSTEM}

{ctx}
Estudiante: {req.nombre_estudiante}
Calificación actual: {req.calificacion_actual or 'no especificada'}
Dificultades identificadas:
{dificultades}

Genera un plan de refuerzo personalizado. Devuelve JSON:
{{
  "estudiante": "...",
  "diagnostico_inicial": "...",
  "dificultades": ["..."],
  "fortalezas": ["..."],
  "objetivo_general": "...",
  "duracion_estimada": "...",
  "semanas": [
    {{
      "semana": 1,
      "tema": "...",
      "meta_semana": "...",
      "actividades": ["..."],
      "recursos": ["..."],
      "evidencia": "...",
      "responsable": "docente|estudiante|familia"
    }}
  ],
  "estrategias_apoyo": ["..."],
  "indicadores_mejora": ["..."],
  "comprobacion_final": "...",
  "recomendaciones_familia": ["..."]
}}"""
    return await llm.generate_json("plan_refuerzo", prompt)
