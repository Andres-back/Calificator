from copy import deepcopy
from unittest.mock import AsyncMock

import pytest

from app.modules.herramientas.generators import cuento
from app.modules.herramientas.schemas import CuentoRequest
from app.modules.herramientas.story_quality import StoryQualityError, validate_story
from app.modules.herramientas import service
from app.shared.enums import MaterialTipo
from fastapi import HTTPException


def story():
    return {
        "titulo": "La huerta",
        "personajes": ["Lina", "Tomás"],
        "parrafos": [
            "Lina llegó a la escuela y encontró las plantas de la huerta dobladas bajo el sol. "
            "Habían olvidado regarlas durante el fin de semana. Buscó a Tomás para pedirle ayuda. "
            "Los dos observaron la tierra seca y decidieron buscar una solución antes del recreo.",
            "Tomás propuso abrir la manguera, pero Lina vio que el depósito estaba casi vacío. "
            "Entonces recordaron los baldes que recogían la lluvia del techo. Llevaron el agua hasta "
            "la huerta y regaron despacio las raíces, cuidando de no desperdiciar ninguna gota.",
            "Al día siguiente algunas hojas estaban firmes otra vez. Los niños dibujaron un turno "
            "de riego para que sus compañeros pudieran colaborar. También cubrieron la tierra con "
            "hojas secas para conservar la humedad. Ahora cuidar las plantas era una tarea compartida.",
        ],
        "moraleja": "Compartir el cuidado del agua ayuda a que la huerta siga viva.",
        "preguntas_comprension": ["¿Qué problema encontraron?", "¿Cómo lo resolvieron?"],
    }


def request(**kwargs):
    return CuentoRequest(titulo="La huerta", tema="Agua", **kwargs)


def test_accepts_complete_story_without_mutating_it():
    value = story()
    before = deepcopy(value)
    validate_story(value, request(), page_counter=lambda content: 1)
    assert value == before


@pytest.mark.parametrize("damage", ["duplicate", "near_duplicate", "empty", "too_long", "no_questions"])
def test_rejects_bad_story_before_illustration(damage):
    value = story()
    if damage == "duplicate":
        value["parrafos"].append(value["parrafos"][0])
    elif damage == "near_duplicate":
        value["parrafos"].append(value["parrafos"][0] + " Finalmente sonrió.")
    elif damage == "empty":
        value["parrafos"] = []
    elif damage == "too_long":
        value["parrafos"][0] += " palabra" * 650
    else:
        value["preguntas_comprension"] = []
    with pytest.raises(StoryQualityError):
        validate_story(value, request(), page_counter=lambda content: 1)


@pytest.mark.parametrize("length,pages,valid", [("corto", 1, True), ("corto", 2, False), ("medio", 2, True), ("largo", 2, True), ("largo", 3, False)])
def test_counts_narrative_pages_not_question_pages(length, pages, valid):
    if valid:
        validate_story(story(), request(longitud=length), page_counter=lambda content: pages)
    else:
        with pytest.raises(StoryQualityError, match="página"):
            validate_story(story(), request(longitud=length), page_counter=lambda content: pages)


def test_moral_preferences_are_enforced():
    value = story()
    value["moraleja"] = ""
    with pytest.raises(StoryQualityError, match="moraleja"):
        validate_story(value, request(moraleja="con"), page_counter=lambda content: 1)
    value["moraleja"] = "Enseñanza"
    with pytest.raises(StoryQualityError, match="moraleja"):
        validate_story(value, request(moraleja="sin"), page_counter=lambda content: 1)


def test_image_context_includes_resolution_not_only_opening():
    value = story()
    prompt = cuento.build_image_prompt(request(), value)
    assert value["parrafos"][-1] in prompt
    assert "Tomás" in prompt
    assert "no" in prompt.lower()


@pytest.mark.asyncio
async def test_text_prompt_respects_length_and_moral_without_paid_calls():
    llm = AsyncMock()
    llm.generate_json.return_value = story()
    await cuento.generate(request(moraleja="sin"), llm)
    prompt = llm.generate_json.call_args.args[1]
    assert "una página" in prompt
    assert "sin moraleja" in prompt.lower()
    assert "no repitas" in prompt.lower()


@pytest.mark.asyncio
async def test_repetition_cannot_be_hidden_by_normalizer_and_retry_is_bounded(monkeypatch):
    req = request(instrucciones_adicionales="Texto original")
    value = story()
    value["parrafos"].append(value["parrafos"][0])
    generator = AsyncMock(return_value=value)
    with pytest.raises(HTTPException) as exc:
        await service._generate_with_quality(tipo=MaterialTipo.CUENTO, req=req, generator=generator)
    assert exc.value.status_code == 502
    assert generator.await_count == 2
    assert req.instrucciones_adicionales == "Texto original"


@pytest.mark.asyncio
async def test_one_correction_can_produce_valid_story(monkeypatch):
    monkeypatch.setattr("app.modules.herramientas.pdf_render.count_story_narrative_pages", lambda content: 1)
    req = request()
    generator = AsyncMock(side_effect=[{"parrafos": []}, story()])
    result = await service._generate_with_quality(tipo=MaterialTipo.CUENTO, req=req, generator=generator)
    assert result["parrafos"] == story()["parrafos"]
    assert generator.await_count == 2


@pytest.mark.asyncio
async def test_failed_image_is_not_saved_as_generated_illustration(monkeypatch):
    from types import SimpleNamespace
    from uuid import uuid4

    monkeypatch.setattr("app.modules.herramientas.tool_control_service.ensure_generation_enabled", AsyncMock())
    monkeypatch.setattr(service, "_resolve_materia_id", AsyncMock(return_value=None))
    monkeypatch.setattr(service, "_generate_with_quality", AsyncMock(return_value=story()))
    image = SimpleNamespace(is_placeholder=True, url="placeholder.svg", b64_data="TRIANGLE", provider="placeholder", prompt_used=None)
    generate = AsyncMock(return_value=image)
    monkeypatch.setattr(service, "generate_image", generate)
    monkeypatch.setattr(service.imagenes_service, "register_imagen_generada", AsyncMock())
    save = AsyncMock(return_value={"id": "synthetic"})
    monkeypatch.setattr(service, "_save_material", save)
    await service.gen_cuento(AsyncMock(), request(), SimpleNamespace(id=uuid4()))
    content = save.call_args.kwargs["contenido_json"]
    assert content["imagen"]["is_placeholder"] is True
    assert content["imagen"]["url"] is None
    assert content["imagen"]["b64_data"] is None
    assert generate.call_args.kwargs["strict_provider"] is True


@pytest.mark.asyncio
async def test_invalid_story_never_requests_image_or_saves_material(monkeypatch):
    from types import SimpleNamespace
    from uuid import uuid4

    monkeypatch.setattr("app.modules.herramientas.tool_control_service.ensure_generation_enabled", AsyncMock())
    monkeypatch.setattr(service, "_resolve_materia_id", AsyncMock(return_value=None))
    monkeypatch.setattr(cuento, "generate", AsyncMock(return_value={"parrafos": []}))
    image = AsyncMock()
    save = AsyncMock()
    monkeypatch.setattr(service, "generate_image", image)
    monkeypatch.setattr(service, "_save_material", save)
    with pytest.raises(HTTPException):
        await service.gen_cuento(AsyncMock(), request(), SimpleNamespace(id=uuid4()))
    image.assert_not_called()
    save.assert_not_called()
