"""Mapa conceptual: estructura jerárquica de conceptos y relaciones."""
from __future__ import annotations

from app.core.logging import get_logger
from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.schemas import MapaConceptualRequest
from app.services.llm_router import LLMRouter

logger = get_logger(__name__)


async def generate(req: MapaConceptualRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    prompt = f"""{TOOLS_SYSTEM}

{ctx}

Genera un mapa conceptual sobre el tema con concepto principal, conceptos
secundarios y relaciones entre ellos. Apropiado para el grado indicado.
Cada relación debe incluir: origen, destino y etiqueta (tipo de relación).
Devuelve SOLO JSON:
{{"titulo":"...","concepto_principal":"...","descripcion":"...","nodos":[{{"id":"n1","concepto":"...","descripcion_breve":"...","nivel":1}}],"relaciones":[{{"origen":"n1","destino":"n2","etiqueta":"..."}}]}}"""

    result = await llm.generate_json("mapa_conceptual", prompt)
    if not isinstance(result, dict):
        result = {}

    nodos = result.get("nodos", [])
    relaciones = result.get("relaciones", [])
    if not isinstance(nodos, list):
        nodos = []
    if not isinstance(relaciones, list):
        relaciones = []

    titulo = (result.get("titulo") or req.titulo or "Mapa conceptual").strip()
    concepto_principal = (result.get("concepto_principal") or "").strip()
    descripcion = (result.get("descripcion") or "").strip()

    return {
        "titulo": titulo,
        "concepto_principal": concepto_principal,
        "descripcion": descripcion,
        "nodos": nodos,
        "relaciones": relaciones,
    }
