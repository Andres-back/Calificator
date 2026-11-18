"""Spec 195: los recursos solo contienen lo que la IA generó sobre el tema pedido."""
from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.modules.herramientas import service
from app.modules.herramientas.content_quality import normalize_material_content
from app.modules.herramientas.generators import crucigrama, emparejar, sopa_letras, unir_columnas
from app.modules.herramientas.generators.unir_columnas import unique_pairs
from app.modules.herramientas.schemas import (
    CrucigramaRequest,
    EmparejarRequest,
    ParaColorearRequest,
    SopaLetrasRequest,
    UnirColumnasRequest,
)
from app.shared.enums import MaterialTipo


class FakeLLM:
    def __init__(self, *responses):
        self.responses = list(responses)
        self.prompts: list[str] = []

    async def generate_json(self, _task: str, prompt: str):
        self.prompts.append(prompt)
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


def run(coro):
    return asyncio.run(coro)


WORDS = [
    {"respuesta": "INDEPENDENCIA", "pista": "Separación de la corona española."},
    {"respuesta": "BOLIVAR", "pista": "Libertador de cinco naciones."},
    {"respuesta": "BOYACA", "pista": "Batalla decisiva de 1819."},
    {"respuesta": "VIRREINATO", "pista": "Forma de gobierno colonial."},
    {"respuesta": "CRIOLLOS", "pista": "Hijos de españoles nacidos en América."},
    {"respuesta": "PATRIA", "pista": "Tierra a la que se pertenece."},
    {"respuesta": "CABILDO", "pista": "Reunión de vecinos que gobernaba la ciudad."},
    {"respuesta": "FLORERO", "pista": "Objeto que desató el 20 de julio."},
    {"respuesta": "NARINO", "pista": "Tradujo los Derechos del Hombre."},
    {"respuesta": "SANTANDER", "pista": "El hombre de las leyes."},
]


def placed_answers(content: dict) -> list[str]:
    return [item["respuesta"] for item in content["preguntas_horizontales"] + content["preguntas_verticales"]]


def test_crucigrama_con_pocas_palabras_no_se_rellena_con_otro_tema() -> None:
    llm = FakeLLM({"palabras": WORDS[:2]})
    content = run(crucigrama.generate(CrucigramaRequest(titulo="Independencia", tema="Independencia de Colombia"), llm))

    answers = set(placed_answers(content)) | set(content["palabras_sin_ubicar"])
    assert answers <= {"INDEPENDENCIA", "BOLIVAR"}
    assert not answers & {"OBSERVAR", "HIPOTESIS", "EXPERIMENTO", "EVIDENCIA", "REGISTRO", "CONCLUSION"}

    _, issues = normalize_material_content(MaterialTipo.CRUCIGRAMA, content, fallback_title="Crucigrama")
    assert any("al menos 4 palabras" in issue for issue in issues)


def test_crucigrama_sin_palabras_queda_vacio_y_se_reporta() -> None:
    content = run(crucigrama.generate(CrucigramaRequest(titulo="Crucigrama", tema="Tema"), FakeLLM({})))

    assert content["crucigrama"]["grid"] == []
    _, issues = normalize_material_content(MaterialTipo.CRUCIGRAMA, content, fallback_title="Crucigrama")
    assert any("grilla del crucigrama está vacía" in issue for issue in issues)


def test_crucigrama_no_supera_la_cantidad_pedida_y_sigue_conectado() -> None:
    request = CrucigramaRequest(titulo="Independencia", tema="Independencia de Colombia", cantidad_preguntas=5)
    content = run(crucigrama.generate(request, FakeLLM({"palabras": WORDS})))

    answers = placed_answers(content)
    assert 4 <= len(answers) <= 5
    grid = content["crucigrama"]["grid"]
    # Conectado: toda palabra después de la primera comparte al menos una casilla con otra.
    cells: dict[tuple[int, int], int] = {}
    for item in content["preguntas_horizontales"]:
        for offset in range(item["longitud"]):
            cells[(item["fila"], item["columna"] + offset)] = cells.get((item["fila"], item["columna"] + offset), 0) + 1
    for item in content["preguntas_verticales"]:
        for offset in range(item["longitud"]):
            cells[(item["fila"] + offset, item["columna"])] = cells.get((item["fila"] + offset, item["columna"]), 0) + 1
    assert sum(1 for count in cells.values() if count > 1) >= len(answers) - 1
    assert all(grid[row][col] for row, col in cells)
    _, issues = normalize_material_content(MaterialTipo.CRUCIGRAMA, content, fallback_title="Crucigrama")
    assert issues == []


def test_parejas_repetidas_o_identicas_se_descartan() -> None:
    pairs = unique_pairs([
        {"izquierda": "Caracol", "derecha": "Invertebrado"},
        {"izquierda": "Estrella de mar", "derecha": "invertebrado."},
        {"izquierda": "caracol", "derecha": "Molusco"},
        {"izquierda": "Águila", "derecha": "Ave"},
        {"izquierda": "Ave", "derecha": "AVE"},
    ])

    assert pairs == [
        {"izquierda": "Caracol", "derecha": "Invertebrado"},
        {"izquierda": "Águila", "derecha": "Ave"},
    ]


@pytest.mark.parametrize(
    ("generator", "request_type", "tipo"),
    [
        (emparejar, EmparejarRequest, MaterialTipo.EMPAREJAR),
        (unir_columnas, UnirColumnasRequest, MaterialTipo.UNIR_COLUMNAS),
    ],
)
def test_pares_insuficientes_no_se_rellenan_con_otro_tema(generator, request_type, tipo) -> None:
    llm = FakeLLM({"pares": [{"izquierda": "Bolívar", "derecha": "Libertador"}]})
    content = run(generator.generate(request_type(titulo="Próceres", tema="Independencia"), llm))

    texts = {item["texto"] for item in content["columna_izquierda"] + content["columna_derecha"]}
    assert texts == {"Bolívar", "Libertador"}
    _, issues = normalize_material_content(tipo, content, fallback_title="Pares")
    assert any("al menos 3 parejas" in issue for issue in issues)


def test_el_prompt_de_pares_exige_parejas_inequivocas() -> None:
    llm = FakeLLM({"pares": [
        {"izquierda": "Águila", "derecha": "Ave"},
        {"izquierda": "Delfín", "derecha": "Mamífero"},
        {"izquierda": "Serpiente", "derecha": "Reptil"},
    ]})
    content = run(emparejar.generate(EmparejarRequest(titulo="Animales", tema="Vertebrados", cantidad_pares=3), llm))

    assert "UN solo elemento" in llm.prompts[0]
    assert "signifiquen lo mismo" in llm.prompts[0]
    assert len(content["pares"]) == 3
    _, issues = normalize_material_content(MaterialTipo.EMPAREJAR, content, fallback_title="Pares")
    assert issues == []


def test_sopa_sin_palabras_no_usa_palabras_genericas() -> None:
    content = run(sopa_letras.generate(SopaLetrasRequest(titulo="Sopa", tema="El agua"), FakeLLM({"palabras": []})))

    assert content["banco_palabras"] == []
    assert content["grilla"] == []
    _, issues = normalize_material_content(MaterialTipo.SOPA_LETRAS, content, fallback_title="Sopa")
    assert any("sopa" in issue for issue in issues)


def test_sopa_propaga_el_fallo_de_la_ia_en_vez_de_inventar_palabras() -> None:
    with pytest.raises(RuntimeError):
        run(sopa_letras.generate(SopaLetrasRequest(titulo="Sopa", tema="El agua"), FakeLLM(RuntimeError("sin proveedor"))))


def test_sopa_con_palabras_del_docente_no_depende_de_la_ia() -> None:
    request = SopaLetrasRequest(titulo="Sopa", tema="El agua", palabras_clave=["NUBE", "RIO", "LLUVIA", "MAR", "LAGO"])
    content = run(sopa_letras.generate(request, FakeLLM(RuntimeError("pistas no disponibles"))))

    assert sorted(content["banco_palabras"]) == ["LAGO", "LLUVIA", "MAR", "NUBE", "RIO"]


def test_para_colorear_sin_dibujo_no_guarda_el_recurso(monkeypatch) -> None:
    saved: list[object] = []

    async def enabled(*_args, **_kwargs):
        return None

    async def no_subject(*_args, **_kwargs):
        return None

    async def placeholder_image(**_kwargs):
        return SimpleNamespace(is_placeholder=True, provider="placeholder", url="/static/placeholder_educational.svg", b64_data=None, prompt_used=None)

    async def save(*_args, **kwargs):
        saved.append(kwargs)
        return {}

    monkeypatch.setattr("app.modules.herramientas.tool_control_service.ensure_generation_enabled", enabled)
    monkeypatch.setattr(service, "_resolve_materia_id", no_subject)
    monkeypatch.setattr(service, "generate_image", placeholder_image)
    monkeypatch.setattr(service, "_save_material", save)

    request = ParaColorearRequest(titulo="Mariposa", tema="Ciclo de vida")
    with pytest.raises(HTTPException) as error:
        run(service.gen_para_colorear(None, request, SimpleNamespace(id="docente")))

    assert error.value.status_code == 503
    assert "No se guardó nada" in error.value.detail
    assert saved == []
