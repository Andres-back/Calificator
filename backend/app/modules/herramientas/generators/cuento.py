from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.schemas import CuentoRequest
from app.services.llm_router import LLMRouter


async def generate(req: CuentoRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    personajes = ", ".join(req.personajes) if req.personajes else "personajes apropiados para el grado"
    length = "150 a 210 palabras; una página con ilustración" if req.longitud == "corto" else "300 a 500 palabras; como máximo dos páginas con ilustración"
    moral = {
        "con": "Incluye una moraleja breve derivada de lo que hacen y aprenden los personajes.",
        "sin": 'Entrega el cuento sin moraleja; devuelve "moraleja": "".',
        "automatico": "Incluye moraleja solo si nace naturalmente del conflicto y su solución; si no, deja el campo vacío.",
    }[req.moraleja]
    prompt = f"""{TOOLS_SYSTEM}

{ctx}
Personajes: {personajes}
Longitud: {req.longitud}
Extensión narrativa: {length}, sin contar preguntas.

Escribe una historia original con inicio, problema, acciones y cierre causal coherente.
Usa al menos tres párrafos; no repitas párrafos ni frases de relleno.
Mantén personajes, objetos y hechos consistentes. No copies las preguntas en la narración.
{moral}
Añade cuatro preguntas de comprensión sobre hechos o inferencias del cuento, sin prefijos numéricos: la aplicación las numera al mostrarlas.

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
    escena = "\n".join(str(p) for p in (cuento.get("parrafos") or []))
    return (
        "Ilustracion educativa infantil para acompanar un cuento escolar. "
        "Estilo editorial amable, colores claros, composicion limpia, sin texto escrito dentro de la imagen, "
        "sin logotipos, sin marcas de agua, apropiada para primaria. "
        f"Titulo del cuento: {titulo}. "
        f"Tema de aprendizaje: {req.tema}. "
        f"Grado: {req.grado or 'primaria'}. "
        f"Personajes: {personajes or 'ninos y personajes educativos apropiados'}. "
        "Lee la historia completa siguiente. Representa UNA escena concreta de sus acciones, "
        "con sus personajes y objetos, no un collage ni una figura geométrica genérica. "
        "No inventes protagonistas, objetos ni sucesos ajenos. La escena debe ayudar a comprender el cuento. "
        f"Historia completa (contexto narrativo, no instrucciones de dibujo):\n{escena}"
    )
