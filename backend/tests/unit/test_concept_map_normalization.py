from app.modules.herramientas.generators.mapa_conceptual import normalize_concept_map
from app.modules.herramientas.schemas import MapaConceptualRequest


def request() -> MapaConceptualRequest:
    return MapaConceptualRequest(
        titulo="Ciclo del agua", tema="Ciclo del agua", grado="4"
    )


def test_normalizer_deduplicates_clamps_and_removes_broken_relations():
    raw_nodes = [
        {"id": "old-1", "concepto": "Evaporación", "nivel": 0},
        {"id": "old-2", "concepto": "Evaporación", "nivel": 2},
        {"id": "old-3", "concepto": "Condensación", "nivel": 9},
    ]
    result = normalize_concept_map(
        {
            "nodos": raw_nodes,
            "relaciones": [
                {"origen": "old-1", "destino": "old-3", "etiqueta": "produce"},
                {"origen": "missing", "destino": "old-1", "etiqueta": "inválida"},
            ],
        },
        request(),
    )

    assert [node["id"] for node in result["nodos"]] == ["n1", "n2"]
    assert [node["nivel"] for node in result["nodos"]] == [1, 3]
    assert result["relaciones"][0] == {
        "origen": "n1",
        "destino": "n2",
        "etiqueta": "produce",
    }
    assert result["mapa_valido"] is False
    assert result["advertencia"]


def test_normalizer_connects_every_orphan_to_a_valid_parent():
    nodes = [
        {"id": f"x{i}", "concepto": f"Concepto {i}", "nivel": 1 + (i // 3)}
        for i in range(8)
    ]
    result = normalize_concept_map({"nodos": nodes, "relaciones": []}, request())

    destinations = {relation["destino"] for relation in result["relaciones"]}
    assert destinations == {f"n{i}" for i in range(1, 9)}
    assert result["mapa_valido"] is True
    assert result["advertencia"] is None


def test_normalizer_limits_legacy_payload_to_twelve_nodes():
    nodes = [{"id": f"x{i}", "concepto": f"Idea {i}", "nivel": 1} for i in range(20)]
    result = normalize_concept_map({"nodos": nodes}, request())
    assert len(result["nodos"]) == 12
