"""Generador de talleres prácticos listos para asignar o imprimir."""
from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.schemas import TallerRequest
from app.services.llm_router import LLMRouter


async def generate(req: TallerRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    prompt = f"""{TOOLS_SYSTEM}

{ctx}
Cantidad exacta de puntos: {req.cantidad_puntos}

Genera un taller práctico, claro y listo para imprimir. Distribuye dificultad
baja, media y alta de forma gradual. Cada punto debe indicar su puntaje, el
espacio que necesita el estudiante y una respuesta esperada o criterio de
logro útil para el docente. La suma de los puntajes debe coincidir con
puntaje_total.

Devuelve SOLO JSON con esta estructura:
{{
  "titulo": "...",
  "objetivo": "...",
  "instrucciones": "...",
  "puntaje_total": 10,
  "puntos": [
    {{
      "numero": 1,
      "tipo": "abierta|opcion_multiple|procedimiento|aplicacion",
      "dificultad": "baja|media|alta",
      "enunciado": "...",
      "opciones": [],
      "puntaje": 2,
      "lineas_respuesta": 4,
      "respuesta_esperada": "...",
      "criterio_logro": "..."
    }}
  ],
  "criterios_revision": ["..."]
}}"""
    return await llm.generate_json("taller", prompt)
