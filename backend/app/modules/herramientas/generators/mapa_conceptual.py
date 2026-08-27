"""Mapa conceptual: estructura jerárquica de conceptos y relaciones."""

from __future__ import annotations

from app.core.logging import get_logger
from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
from app.modules.herramientas.schemas import MapaConceptualRequest
from app.services.llm_router import LLMRouter

logger = get_logger(__name__)


def _clean_text(value: object, *, limit: int) -> str:
    return " ".join(str(value or "").split())[:limit].strip()


def normalize_concept_map(result: object, req: MapaConceptualRequest) -> dict:
    """Normaliza salidas variables del LLM sin romper mapas creados previamente."""
    payload = result if isinstance(result, dict) else {}
    raw_nodes = payload.get("nodos") if isinstance(payload.get("nodos"), list) else []
    nodes: list[dict] = []
    old_to_new: dict[str, str] = {}
    seen_concepts: set[str] = set()

    for raw in raw_nodes:
        if not isinstance(raw, dict) or len(nodes) >= 12:
            continue
        concept = _clean_text(raw.get("concepto"), limit=80)
        key = concept.casefold()
        if not concept or key in seen_concepts:
            continue
        seen_concepts.add(key)
        node_id = f"n{len(nodes) + 1}"
        old_id = _clean_text(raw.get("id"), limit=40)
        if old_id:
            old_to_new[old_id] = node_id
        try:
            level = max(1, min(3, int(raw.get("nivel") or 1)))
        except (TypeError, ValueError):
            level = 1
        nodes.append(
            {
                "id": node_id,
                "concepto": concept,
                "descripcion_breve": _clean_text(
                    raw.get("descripcion_breve"), limit=180
                ),
                "nivel": level,
            }
        )

    valid_ids = {node["id"] for node in nodes}
    relations: list[dict] = []
    seen_relations: set[tuple[str, str]] = set()
    raw_relations = (
        payload.get("relaciones") if isinstance(payload.get("relaciones"), list) else []
    )
    for raw in raw_relations:
        if not isinstance(raw, dict):
            continue
        raw_origin = _clean_text(raw.get("origen"), limit=40)
        raw_destination = _clean_text(raw.get("destino"), limit=40)
        origin = (
            "central"
            if raw_origin in {"central", "concepto_principal"}
            else old_to_new.get(raw_origin, raw_origin)
        )
        destination = old_to_new.get(raw_destination, raw_destination)
        pair = (origin, destination)
        if (
            origin not in valid_ids | {"central"}
            or destination not in valid_ids
            or origin == destination
            or pair in seen_relations
        ):
            continue
        seen_relations.add(pair)
        relations.append(
            {
                "origen": origin,
                "destino": destination,
                "etiqueta": _clean_text(raw.get("etiqueta"), limit=60)
                or "se relaciona con",
            }
        )

    incoming = {relation["destino"] for relation in relations}
    for node in nodes:
        if node["id"] in incoming:
            continue
        previous = [
            candidate for candidate in nodes if candidate["nivel"] == node["nivel"] - 1
        ]
        origin = previous[-1]["id"] if previous else "central"
        pair = (origin, node["id"])
        if pair not in seen_relations:
            relations.append(
                {
                    "origen": origin,
                    "destino": node["id"],
                    "etiqueta": "se relaciona con",
                }
            )
            seen_relations.add(pair)

    valid = 6 <= len(nodes) <= 12 and bool(relations)
    return {
        "titulo": _clean_text(
            payload.get("titulo") or req.titulo or "Mapa conceptual", limit=160
        ),
        "concepto_principal": _clean_text(
            payload.get("concepto_principal") or req.tema, limit=100
        ),
        "descripcion": _clean_text(payload.get("descripcion"), limit=320),
        "nodos": nodes,
        "relaciones": relations,
        "mapa_valido": valid,
        "advertencia": None
        if valid
        else "El mapa quedó incompleto. Revísalo o vuelve a generarlo para obtener entre 6 y 12 conceptos conectados.",
    }


async def generate(req: MapaConceptualRequest, llm: LLMRouter) -> dict:
    ctx = build_base_context(req)
    prompt = f"""{TOOLS_SYSTEM}

{ctx}

Genera un mapa conceptual pedagógico y visual sobre el tema, apropiado para el grado indicado.
Reglas obligatorias:
- Incluye exactamente 8 nodos únicos, distribuidos en 3 niveles jerárquicos.
- Usa frases breves: concepto máximo 8 palabras y descripción máximo 22 palabras.
- Todos los nodos deben estar conectados; usa "central" como origen para conexiones desde el concepto principal.
- Cada relación debe tener origen, destino y una etiqueta verbal clara (por ejemplo: "incluye", "produce", "se compone de").
- No inventes identificadores fuera de n1 a n8 ni relaciones hacia nodos inexistentes.
Devuelve SOLO JSON:
{{"titulo":"...","concepto_principal":"...","descripcion":"...","nodos":[{{"id":"n1","concepto":"...","descripcion_breve":"...","nivel":1}}],"relaciones":[{{"origen":"central","destino":"n1","etiqueta":"incluye"}}]}}"""

    result = await llm.generate_json("mapa_conceptual", prompt)
    if not isinstance(result, dict):
        result = {}

    return normalize_concept_map(result, req)
