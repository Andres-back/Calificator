"""Spec 196: la imagen de un recurso viaja como enlace liviano, no incrustada en el JSON."""
from __future__ import annotations

import asyncio
import base64
import io
from copy import deepcopy
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from PIL import Image
from starlette.requests import Request

from app.modules.herramientas import router as herramientas_router
from app.modules.herramientas.image_delivery import (
    image_version,
    lighten_material,
    render_web_image,
    restore_stored_image,
    stored_image_b64,
)


def png_b64(color=(120, 60, 200, 255), size=(256, 256), mode="RGBA") -> str:
    image = Image.new(mode, size, color)
    # Ruido determinista para que el PNG no sea trivialmente pequeño.
    pixels = image.load()
    for x in range(0, size[0], 3):
        for y in range(0, size[1], 5):
            pixels[x, y] = (x % 255, y % 255, (x * y) % 255, 255) if mode == "RGBA" else (x % 255, y % 255, 9)
    output = io.BytesIO()
    image.save(output, "PNG")
    return base64.b64encode(output.getvalue()).decode("ascii")


def material(b64: str | None, **image_extra) -> dict:
    content: dict = {"titulo": "El viaje de una gota", "parrafos": ["Había una vez…"]}
    if b64 is not None:
        content["imagen"] = {"url": "", "b64_data": b64, "provider": "openai", "is_placeholder": False, "prompt": "p", **image_extra}
    return {"id": uuid4(), "tipo": "cuento", "titulo": "El viaje de una gota", "contenido_json": content}


def test_la_respuesta_no_incluye_la_imagen_incrustada_y_trae_su_enlace() -> None:
    b64 = png_b64()
    original = material(b64)
    snapshot = deepcopy(original)

    light = lighten_material(original)

    image = light["contenido_json"]["imagen"]
    assert "b64_data" not in image
    assert image["url"] == f"/api/herramientas/{original['id']}/imagen?v={image_version(b64)}"
    assert image["provider"] == "openai" and image["is_placeholder"] is False
    assert light["contenido_json"]["parrafos"] == ["Había una vez…"]
    # El material guardado no se toca: el PDF sigue usando la imagen original.
    assert original == snapshot


@pytest.mark.parametrize(
    "item",
    [
        material(None),
        material(png_b64(), is_placeholder=True),
        {"id": uuid4(), "contenido_json": {"imagen": {"url": "/static/placeholder_educational.svg", "b64_data": None}}},
        {"id": uuid4(), "contenido_json": None},
        None,
    ],
)
def test_sin_imagen_real_el_material_no_cambia(item) -> None:
    assert lighten_material(item) is item


def test_acepta_imagenes_guardadas_como_data_url() -> None:
    b64 = png_b64()
    content = {"imagen": {"b64_data": f"data:image/png;base64,{b64}", "is_placeholder": False}}
    assert stored_image_b64(content) == b64


def test_al_editar_se_conserva_la_imagen_guardada() -> None:
    b64 = png_b64()
    stored = material(b64)["contenido_json"]
    from_browser = {"titulo": "Título corregido", "parrafos": ["Nuevo"], "imagen": {"url": "/api/herramientas/x/imagen?v=1", "provider": "openai", "is_placeholder": False}}

    merged = restore_stored_image(stored, from_browser)

    assert merged["titulo"] == "Título corregido"
    assert merged["imagen"] == stored["imagen"]
    assert merged["imagen"]["b64_data"] == b64


def test_una_imagen_nueva_completa_no_se_reemplaza_por_la_anterior() -> None:
    stored = material(png_b64())["contenido_json"]
    other = png_b64(color=(10, 200, 90, 255))
    incoming = {"titulo": "T", "imagen": {"b64_data": other, "is_placeholder": False}}

    assert restore_stored_image(stored, incoming)["imagen"]["b64_data"] == other
    # Sin imagen guardada no hay nada que restaurar.
    assert restore_stored_image({"titulo": "T"}, {"imagen": {"url": "x"}}) == {"imagen": {"url": "x"}}


def illustration_b64(size=(1024, 1024)) -> str:
    """Imagen con degradados suaves, como una ilustración generada."""
    image = Image.new("RGB", size)
    pixels = image.load()
    for x in range(size[0]):
        for y in range(size[1]):
            pixels[x, y] = ((x * 255) // size[0], (y * 255) // size[1], ((x + y) * 255) // (size[0] + size[1]))
    output = io.BytesIO()
    image.save(output, "PNG")
    return base64.b64encode(output.getvalue()).decode("ascii")


def test_la_imagen_se_entrega_en_webp_y_pesa_menos() -> None:
    b64 = illustration_b64()
    data, media_type = render_web_image(b64)

    assert media_type == "image/webp"
    assert len(data) < len(base64.b64decode(b64)) / 2
    with Image.open(io.BytesIO(data)) as image:
        assert image.size == (1024, 1024)
        assert image.mode == "RGB"


def test_nunca_se_entrega_algo_mas_pesado_que_lo_guardado() -> None:
    b64 = png_b64(size=(1024, 1024))
    raw = base64.b64decode(b64)
    data, media_type = render_web_image(b64)

    assert len(data) <= len(raw)
    assert (data, media_type) == (raw, "image/png")


def test_transparencia_sobre_blanco_y_tope_de_tamano() -> None:
    transparent = Image.new("RGBA", (2000, 1000), (0, 0, 0, 0))
    output = io.BytesIO()
    transparent.save(output, "PNG")
    data, media_type = render_web_image(base64.b64encode(output.getvalue()).decode("ascii"))

    assert media_type == "image/webp"
    with Image.open(io.BytesIO(data)) as image:
        assert image.size == (1280, 640)
        assert image.convert("RGB").getpixel((10, 10)) == (255, 255, 255)


def test_datos_que_no_son_imagen_se_entregan_tal_cual_y_vacios_fallan() -> None:
    raw = b"no es una imagen pero existe" * 4
    data, media_type = render_web_image(base64.b64encode(raw).decode("ascii"))
    assert data == raw and media_type == "application/octet-stream"
    with pytest.raises(ValueError):
        render_web_image("")


def request_with(headers: dict[str, str] | None = None) -> Request:
    raw = [(key.lower().encode(), value.encode()) for key, value in (headers or {}).items()]
    return Request({"type": "http", "method": "GET", "path": "/", "headers": raw, "query_string": b""})


def call_image(monkeypatch, found, headers=None):
    async def get_material_for_user(_db, _material_id, _user):
        return found

    monkeypatch.setattr(herramientas_router, "require_permission_now", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(herramientas_router.service, "get_material_for_user", get_material_for_user)
    return asyncio.run(herramientas_router.imagen_material(uuid4(), request_with(headers), SimpleNamespace(id="u"), None))


def test_el_endpoint_entrega_la_imagen_con_cache(monkeypatch) -> None:
    b64 = illustration_b64(size=(256, 256))
    response = call_image(monkeypatch, material(b64))

    assert response.status_code == 200
    assert response.media_type == "image/webp"
    assert response.headers["cache-control"] == "private, max-age=86400"
    assert response.headers["etag"] == f'"{image_version(b64)}"'
    assert response.body[:4] == b"RIFF"


def test_el_endpoint_responde_304_si_el_navegador_ya_la_tiene(monkeypatch) -> None:
    b64 = png_b64()
    response = call_image(monkeypatch, material(b64), {"If-None-Match": f'"{image_version(b64)}"'})

    assert response.status_code == 304
    assert response.body == b""


@pytest.mark.parametrize("found", [None, material(None), material(png_b64(), is_placeholder=True)])
def test_el_endpoint_responde_404_sin_recurso_o_sin_imagen(monkeypatch, found) -> None:
    with pytest.raises(HTTPException) as error:
        call_image(monkeypatch, found)
    assert error.value.status_code == 404
