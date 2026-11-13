"""Spec 182: la cuadrícula rotulada convierte celdas en recuadros fiables."""

from io import BytesIO

import pytest
from PIL import Image

from app.modules.calificaciones import answer_location_service as location
from app.services import answer_grid_locator as grid

# Respuesta real de la prueba con la hoja 2 de producción, fotografiada de lado.
PRODUCTION_ANSWER = """{"preguntas": [
  {"numero": "11", "desde": "H8", "hasta": "J10"}, {"numero": "12", "desde": "G8", "hasta": "H10"},
  {"numero": "13", "desde": "E8", "hasta": "F10"}, {"numero": "14", "desde": "C8", "hasta": "E10"},
  {"numero": "15", "desde": "B8", "hasta": "C11"}, {"numero": "16", "desde": "I11", "hasta": "J13"},
  {"numero": "17", "desde": "G11", "hasta": "H14"}, {"numero": "18", "desde": "E11", "hasta": "G14"},
  {"numero": "19", "desde": "C11", "hasta": "E14"}, {"numero": "20", "desde": "B11", "hasta": "C14"}]}"""
NUMBERS = [str(number) for number in range(1, 21)]


def png(width, height):
    buffer = BytesIO()
    Image.new("RGB", (width, height), "white").save(buffer, format="PNG")
    return buffer.getvalue()


def test_the_grid_has_square_cells_and_keeps_the_page_size():
    content, cols, rows = grid.draw_grid(png(940, 1248))

    with Image.open(BytesIO(content)) as image:
        assert image.format == "JPEG" and image.size == (940, 1248)
        # La cuadrícula es roja: la hoja blanca queda marcada.
        assert image.getpixel((0, 0))[0] > 150 and image.getpixel((0, 0))[1] < 100
    assert (cols, rows) == (12, 16)
    assert grid.grid_shape(1248, 940) == (16, 12)


def test_large_pages_are_reduced_before_sending():
    content, _, _ = grid.draw_grid(png(3200, 2400))

    with Image.open(BytesIO(content)) as image:
        assert max(image.size) == grid.MAX_SIDE


def test_the_production_answer_puts_question_13_where_it_is():
    found = grid.parse_locations(PRODUCTION_ANSWER, 12, 16, NUMBERS)

    assert sorted(found, key=int) == [str(number) for number in range(11, 21)]
    # La pregunta 13 está en el centro de la hoja, no en el borde derecho.
    x, y, width, height = found["13"]
    assert (x, y, width, height) == (0.3333, 0.4375, 0.1667, 0.1875)
    assert x + width <= 0.6


def test_cells_can_come_in_any_corner_order():
    assert grid.cells_to_box("F10", "E8", 12, 16) == grid.cells_to_box("E8", "F10", 12, 16)
    assert grid.cells_to_box("a1", "a1", 12, 16) == [0.0, 0.0, 0.0833, 0.0625]


@pytest.mark.parametrize("start,end", [("M1", "A1"), ("A17", "A1"), ("A0", "B2"), ("", "B2"), ("AA1", "B2"), ("A1", "L16")])
def test_invalid_or_whole_page_cells_are_rejected(start, end):
    assert grid.cells_to_box(start, end, 12, 16) is None


def test_only_requested_valid_questions_are_kept():
    answer = {"preguntas": [
        {"numero": "1", "desde": "A1", "hasta": "B2"},
        {"numero": "1", "desde": "C3", "hasta": "D4"},
        {"numero": "99", "desde": "A1", "hasta": "B2"},
        {"numero": "2", "desde": "Z1", "hasta": "B2"},
        "no es un objeto",
    ]}

    assert grid.parse_locations(answer, 12, 16, ["1", "2"]) == {"1": [0.0, 0.0, 0.1667, 0.125]}


@pytest.mark.parametrize("content", ["sin json", "{roto", None, {"preguntas": "no"}, []])
def test_malformed_answers_locate_nothing(content):
    assert grid.parse_locations(content, 12, 16, NUMBERS) == {}


def test_the_prompt_asks_for_cells_of_the_requested_questions_only():
    text = grid.prompt(12, 16, ["1", "2", "3"])

    assert "A-L" in text and "1-16" in text and "1, 2, 3" in text
    assert "No leas ni califiques" in text


@pytest.mark.asyncio
async def test_a_page_is_located_with_the_grid(monkeypatch):
    sent = {}

    async def call_route(snapshot, *, image, text, teacher_id):
        sent.update(image=image, text=text)
        return PRODUCTION_ANSWER

    monkeypatch.setattr(location, "call_route", call_route)
    page = location.SheetPage(2, png(940, 1248), "a" * 32)

    found = await location.locate_page(page, NUMBERS, snapshot={}, teacher_id=None)

    assert found["13"] == [0.3333, 0.4375, 0.1667, 0.1875]
    assert sent["image"][:2] == b"\xff\xd8"
    assert "13" in sent["text"]


@pytest.mark.asyncio
async def test_routes_without_vision_are_not_called():
    with pytest.raises(RuntimeError, match="vision_route_not_ready"):
        await location.call_route(
            {"primary": {"model": "texto", "runtime_profile": {"x": 1}, "capabilities": ["text"]}},
            image=b"", text="", teacher_id=None,
        )
