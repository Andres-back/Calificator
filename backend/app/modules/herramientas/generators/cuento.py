from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.schemas import CuentoRequest
from app.services.llm_router import LLMRouter


async def generate(req: CuentoRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    personajes = ", ".join(req.personajes) if req.personajes else "personajes apropiados para el grado"
    prompt = f"""{TOOLS_SYSTEM}

{ctx}
Personajes: {personajes}
Longitud: {req.longitud}

Genera un cuento educativo. Devuelve JSON:
{{
  "titulo": "...",
  "personajes": ["..."],
  "parrafos": ["..."],
  "moraleja": "...",
  "preguntas_comprension": ["..."]
}}"""
    return await llm.generate_json("cuento", prompt)


def build_image_prompt(req: CuentoRequest, cuento: dict) -> str:
    titulo = cuento.get("titulo") or req.titulo
    personajes = ", ".join(cuento.get("personajes") or req.personajes or [])
    escena = " ".join(str(p) for p in (cuento.get("parrafos") or [])[:2])
    return (
        "Ilustracion educativa infantil para acompanar un cuento escolar. "
        "Estilo editorial amable, colores claros, composicion limpia, sin texto escrito dentro de la imagen, "
        "sin logotipos, sin marcas de agua, apropiada para primaria. "
        f"Titulo del cuento: {titulo}. "
        f"Tema de aprendizaje: {req.tema}. "
        f"Grado: {req.grado or 'primaria'}. "
        f"Personajes: {personajes or 'ninos y personajes educativos apropiados'}. "
        f"Escena principal: {escena[:900]}"
    )
