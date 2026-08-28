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

Genera una guía de aprendizaje completa, secuencial y lista para usar. Incluye
saberes previos, explicación accesible, un ejemplo guiado, práctica y una
verificación breve en cada sección. Distribuye exactamente
{req.cantidad_actividades} actividades entre al menos dos secciones.

Devuelve SOLO JSON:
{{
  "titulo": "...",
  "objetivos": ["..."],
  "saberes_previos": ["..."],
  "introduccion": "...",
  "secciones": [
    {{
      "titulo":"...",
      "explicacion":"...",
      "ejemplo_guiado":"...",
      "actividades":["..."],
      "verificacion":"..."
    }}
  ],
  "cierre": "...",
  "evaluacion_formativa": ["..."]
}}"""
    return await llm.generate_json("guia", prompt)
