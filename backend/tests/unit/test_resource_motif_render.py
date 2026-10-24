from copy import deepcopy

import pytest

from app.modules.motif_library.presentation import merge_presentation, presentation_for_read, decoration_html


def test_decoration_does_not_change_academic_fields_or_original():
    original = {"parrafos": ["Relato original"], "preguntas": [{"puntaje": 0.625, "respuesta": "Razón"}], "imagen": {"url": "private-illustration"}, "criterios": [{"nombre": "Comprende", "peso": 100}], "_future": {"keep": True}}
    before = deepcopy(original)
    result = merge_presentation(original, decoration={"motif_id": "naturales-001", "placement": "header"})
    assert original == before
    assert {key: value for key, value in result.items() if key != "_presentacion"} == before
    assert "asset_url" not in str(result)
    read = presentation_for_read(result)
    assert read["_presentacion"]["decoracion"]["asset_url"].startswith("/api/biblioteca-motivos/archivos/naturales-001/thumbnail/")
    assert "asset_url" not in str(result)
    assert "data:image/webp;base64," in decoration_html(result)


def test_generic_content_cannot_overwrite_reserved_presentation():
    original = {"texto": "Antes", "_presentacion": {"version": 1, "decoracion": {"motif_id": "naturales-001", "placement": "header"}, "future": 7}}
    incoming = {"texto": "Después", "_presentacion": {"decoracion": {"motif_id": "private-file", "url": "file:///secret"}}}
    result = merge_presentation(original, academic=incoming)
    assert result["texto"] == "Después"
    assert result["_presentacion"] == original["_presentacion"]
    assert merge_presentation({}, academic=incoming).get("_presentacion") is None
    removed = merge_presentation(original, decoration=None)
    assert removed["_presentacion"]["decoracion"] is None
    assert removed["_presentacion"]["future"] == 7


@pytest.mark.parametrize("selection", [{"motif_id": "missing", "placement": "header"}, {"motif_id": "naturales-001", "placement": "background"}, {"motif_id": "naturales-001", "placement": "header", "url": "file:///secret"}])
def test_invalid_decoration_is_rejected_not_fetched(selection):
    with pytest.raises(ValueError):
        merge_presentation({"texto": "Original"}, decoration=selection)


def test_missing_or_legacy_decoration_does_not_block_document():
    legacy = {"texto": "El texto sigue completo"}
    assert presentation_for_read(legacy) == legacy
    assert decoration_html(legacy) == ""
    missing = {**legacy, "_presentacion": {"decoracion": {"motif_id": "unknown", "placement": "header", "asset_url": "https://example.test/private.png"}}}
    assert decoration_html(missing) == ""
    assert "asset_url" not in str(presentation_for_read(missing))
