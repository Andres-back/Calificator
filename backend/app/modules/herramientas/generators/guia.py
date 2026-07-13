from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.schemas import GuiaRequest
from app.services.llm_router import LLMRouter


async def generate(req: GuiaRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    objetivos = "\n".join(f"- {o}" for o in req.objetivos) if req.objetivos else "(definir objetivos)"
    prompt = f"""{TOOLS_SYSTEM}

{ctx}
Objetivos de aprendizaje:
{objetivos}
Cantidad de actividades: {req.cantidad_actividades}

Genera una guía de aprendizaje estructurada. Devuelve JSON:
{{
  "titulo": "...",
  "objetivos": ["..."],
  "introduccion": "...",
  "secciones": [{{"titulo":"...","contenido":"...","actividades":["..."]}}],
  "evaluacion_formativa": ["..."]
}}"""
    return await llm.generate_json("guia", prompt)
