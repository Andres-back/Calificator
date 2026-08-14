import asyncio
from datetime import datetime, timezone
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.main import create_app
from PIL import Image, ImageDraw

from app.modules.presentaciones.editable_pptx_service import build_editable_pptx
from app.modules.presentaciones.local_export import (
    _fit_lines,
    build_local_export,
    extract_slides_for_export,
    pdf_has_minimal_content,
    pptx_has_slides_and_media,
    render_slide_png,
)
from app.modules.presentaciones import assets_service
from app.modules.presentaciones import service
from app.modules.presentaciones.template_library import choose_layout, layout_family
from app.workers import tasks_presentations
from app.modules.users.models import User
from app.shared.enums import ImageProvider


def test_presentation_worker_detaches_stale_pool_before_generation(monkeypatch) -> None:
    events: list[str] = []

    class FakeEngine:
        async def dispose(self, close: bool = True) -> None:
            events.append("close" if close else "detach")

    async def fake_generate(_presentation_id) -> None:
        events.append("generate")

    monkeypatch.setattr("app.db.session.engine", FakeEngine())
    monkeypatch.setattr(
        tasks_presentations,
        "generate_presentacion_assets",
        fake_generate,
    )

    asyncio.run(tasks_presentations._run_and_dispose(uuid4()))

    assert events == ["detach", "generate", "close"]


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def _user(role: str) -> User:
    return User(
        id=uuid4(),
        nombre=f"Usuario {role}",
        email=f"{role}-{uuid4().hex[:8]}@example.com",
        password_hash="x",
        rol=role,
        estado="activo",
    )


def _presentation(**overrides):
    now = datetime.now(timezone.utc)
    data = {
        "id": uuid4(),
        "profesor_id": uuid4(),
        "materia_id": None,
        "titulo": "Presentacion test",
        "estado": "success",
        "pptx_url": "/api/presentaciones/test/archivo/pptx",
        "pdf_url": None,
        "error": None,
        "created_at": now,
        "updated_at": now,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


async def _db_override():
    yield object()


def _client_with_user(user: User) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = _db_override
    return TestClient(app, base_url="http://localhost")


def test_generated_asset_uses_writable_presentation_directory(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setattr(assets_service.settings, "UPLOADS_DIR", str(tmp_path))
    path, url = assets_service._ai_slide_asset("Fracciones", "Pizzas iguales")

    assert path.parent == tmp_path / "presentaciones"
    assert url.startswith("/api/presentaciones/assets/")

    path.parent.mkdir(parents=True)
    Image.new("RGB", (8, 8), "blue").save(path, "PNG")
    assert assets_service._data_uri_from_asset_url(url).startswith(
        "data:image/png;base64,"
    )
    assert assets_service.resolve_asset_path(url) == path.resolve()

    client = _client_with_user(_user("profesor"))
    response = client.get(url)
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert client.get("/api/presentaciones/assets/../../secreto.png").status_code == 404


def test_unauthenticated_user_cannot_access_presentaciones() -> None:
    client = TestClient(create_app(), base_url="http://localhost")
    response = client.get("/api/presentaciones")
    assert response.status_code == 401


def test_profesor_creates_presentacion(monkeypatch) -> None:
    from unittest.mock import MagicMock

    fake_task = MagicMock()
    monkeypatch.setattr(
        "app.modules.presentaciones.router.generate_presentation", fake_task
    )

    profesor = _user("profesor")
    pres = _presentation(profesor_id=profesor.id, estado="queued", pptx_url=None)

    async def create_presentacion(*args, **kwargs):
        return pres

    async def generate_presentacion_assets(*args, **kwargs):
        return None

    monkeypatch.setattr(service, "create_presentacion", create_presentacion)
    monkeypatch.setattr(
        service, "generate_presentacion_assets", generate_presentacion_assets
    )

    client = _client_with_user(profesor)
    response = client.post(
        "/api/presentaciones",
        json={"titulo": "Ciclo del agua", "tema": "Evaporacion", "cantidad_slides": 5},
    )

    assert response.status_code == 201, response.text
    assert response.json()["estado"] == "queued"


def test_student_cannot_create_or_export_presentacion(monkeypatch) -> None:
    estudiante = _user("estudiante")
    client = _client_with_user(estudiante)

    create_response = client.post(
        "/api/presentaciones",
        json={"titulo": "Ciclo del agua", "tema": "Evaporacion", "cantidad_slides": 5},
    )
    export_response = client.post(
        f"/api/presentaciones/{uuid4()}/exportar", json={"format": "pptx"}
    )

    assert create_response.status_code == 403
    assert export_response.status_code == 403


def test_profesor_previews_and_exports(monkeypatch) -> None:
    profesor = _user("profesor")
    pres = _presentation(profesor_id=profesor.id)

    async def ensure_can_manage_presentacion(*args, **kwargs):
        return pres

    async def export_presentacion(*args, **kwargs):
        return pres

    monkeypatch.setattr(
        service, "ensure_can_manage_presentacion", ensure_can_manage_presentacion
    )
    monkeypatch.setattr(
        service, "ensure_can_read_presentacion", ensure_can_manage_presentacion
    )
    monkeypatch.setattr(service, "export_presentacion", export_presentacion)

    client = _client_with_user(profesor)

    monkeypatch.setattr(
        service,
        "build_preview_metadata",
        lambda _pres: {
            "id": pres.id,
            "titulo": pres.titulo,
            "total": 1,
            "slides": [
                {
                    "numero": 1,
                    "titulo": "Portada",
                    "image_url": f"/api/presentaciones/{pres.id}/preview/1.png",
                }
            ],
        },
    )
    preview_response = client.get(f"/api/presentaciones/{pres.id}/preview")
    export_response = client.post(
        f"/api/presentaciones/{pres.id}/exportar", json={"format": "pptx"}
    )

    assert preview_response.status_code == 200, preview_response.text
    assert preview_response.json()["total"] == 1
    assert export_response.status_code == 200, export_response.text
    assert export_response.json()["pptx_url"]


def test_pdf_download_streams_with_mobile_safe_headers(monkeypatch, tmp_path) -> None:
    profesor = _user("profesor")
    pres = _presentation(profesor_id=profesor.id, titulo="Clase para iPhone")
    pdf_path = tmp_path / "clase-iphone.pdf"
    pdf_path.write_bytes(b"%PDF-1.4\n%%EOF")

    async def ensure_can_read_presentacion(*args, **kwargs):
        return pres

    monkeypatch.setattr(
        service,
        "ensure_can_read_presentacion",
        ensure_can_read_presentacion,
    )
    monkeypatch.setattr(service, "get_download_path", lambda *_args: pdf_path)

    client = _client_with_user(profesor)
    response = client.get(f"/api/presentaciones/{pres.id}/archivo/pdf")

    assert response.status_code == 200, response.text
    assert response.content == pdf_path.read_bytes()
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"].startswith("attachment;")
    assert response.headers["cache-control"] == "private, no-store"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_presentation_images_force_openai_for_all_strategies() -> None:
    eligible_order = {0: 0, 2: 1, 4: 2, 6: 3}

    for strategy in ["economico", "mixto", "premium"]:
        providers = [
            service._image_provider_for_slide(
                index=index,
                eligible_order=eligible_order,
                strategy=strategy,
                title="Fotosintesis",
                prompt="ilustracion educativa premium",
            )
            for index in eligible_order
        ]
        assert providers == [ImageProvider.OPENAI] * len(eligible_order)


def test_native_template_library_preserves_visual_alternation() -> None:
    left = choose_layout(role="concept", index=1, layout_hint="", has_visual=True)
    right = choose_layout(role="concept", index=2, layout_hint="", has_visual=True)

    assert left == "split-left"
    assert right == "split-right"
    assert layout_family(left) == "image-and-description"
    assert (
        choose_layout(role="concept", index=3, layout_hint="", has_visual=False)
        == "text"
    )


def test_local_export_builds_valid_files_from_xcal_slides() -> None:
    slides = [{"title": "Fotosintesis", "bullets": ["Idea clave"], "image": ""}]

    pptx = build_local_export("Fotosintesis", slides, "pptx")
    pdf = build_local_export("Fotosintesis", slides, "pdf")

    assert pptx_has_slides_and_media(pptx)
    assert pdf_has_minimal_content(pdf)


def test_editable_pptx_embeds_generated_asset(monkeypatch, tmp_path) -> None:
    asset_id = "1234567890abcdef12"
    asset_dir = tmp_path / "presentaciones"
    asset_dir.mkdir()
    Image.new("RGB", (640, 480), "teal").save(asset_dir / f"slide-{asset_id}.png")
    monkeypatch.setattr(assets_service.settings, "UPLOADS_DIR", str(tmp_path))

    canonical = {
        "meta": {"titulo": "Ciclo del agua"},
        "slides": [
            {
                "tipo": "concepto",
                "layout": "split-left",
                "titulo": "Evaporación",
                "bullets": [{"texto": "El agua cambia de líquido a vapor."}],
                "imagen": {"url": f"/api/presentaciones/assets/{asset_id}"},
            }
        ],
    }

    content = build_editable_pptx(canonical)
    rendered = Image.open(
        BytesIO(
            render_slide_png(
                "Ciclo del agua",
                {
                    "title": "Evaporación",
                    "bullets": ["El agua cambia de líquido a vapor."],
                    "image_asset": f"/api/presentaciones/assets/{asset_id}",
                    "image": "Ilustración del ciclo del agua",
                    "role": "concept",
                    "layout": "split-left",
                },
                1,
                2,
            )
        )
    ).convert("RGB")
    teal_pixels = sum(
        1
        for red, green, blue in rendered.getdata()
        if red < 30 and 90 < green < 160 and 90 < blue < 160
    )

    assert pptx_has_slides_and_media(content)
    assert teal_pixels > 1_000


def test_cover_title_wrapping_keeps_long_words() -> None:
    image = Image.new("RGB", (1600, 900))
    draw = ImageDraw.Draw(image)

    _, lines = _fit_lines(
        draw,
        "Ecosistemas de mi entorno",
        max_width=624,
        max_lines=4,
        sizes=[92, 80, 70, 60, 52],
        bold=True,
    )

    rendered = " ".join(lines)
    assert "Ecosistemas" in rendered
    assert "entorno" in rendered


def test_text_card_wrapping_keeps_complete_explanation() -> None:
    image = Image.new("RGB", (1600, 900))
    draw = ImageDraw.Draw(image)
    explanation = (
        "Relaciona fracciones equivalentes con ejemplos visuales y situaciones "
        "cotidianas mediante una explicacion concreta y progresiva."
    )

    _, lines = _fit_lines(
        draw,
        explanation,
        max_width=778,
        max_lines=5,
        sizes=[32, 29, 26, 24, 22, 20, 18],
    )

    assert "..." not in " ".join(lines)
    assert "progresiva" in " ".join(lines)


@pytest.mark.anyio
async def test_legacy_text_only_pptx_is_regenerated_on_download(
    monkeypatch, tmp_path
) -> None:
    pres = _presentation(
        slides_json={
            "slides": [
                {
                    "title": "Evaporación",
                    "bullets": ["El agua cambia de estado."],
                    "image_asset": "/api/presentaciones/assets/1234567890abcdef12",
                }
            ]
        }
    )
    path = tmp_path / "legacy.pptx"
    path.write_bytes(b"text-only-export")
    replacement = build_local_export(
        "Ciclo del agua",
        [{"title": "Evaporación", "bullets": ["El agua cambia de estado."]}],
        "pptx",
    )
    calls = 0

    async def store(_db, _pres, export_as):
        nonlocal calls
        calls += 1
        assert export_as == "pptx"
        path.write_bytes(replacement)

    monkeypatch.setattr(service, "get_download_path", lambda *_args: path)
    monkeypatch.setattr(service, "_store_local_export_result", store)

    result = await service.ensure_current_pptx_download(object(), pres)

    assert result == path
    assert calls == 1
    assert pptx_has_slides_and_media(path.read_bytes())


@pytest.mark.anyio
async def test_export_presentacion_uses_editable_pptx_as_primary(monkeypatch) -> None:
    pres = _presentation(
        slides_json={
            "slides": [
                {"title": "Ecosistemas", "bullets": ["Idea clave"], "image": ""}
            ],
        },
    )
    saved: dict[str, object] = {}
    calls = {"editable": 0, "local": 0}

    def build_editable_pptx(canonical):
        calls["editable"] += 1
        assert canonical["slides"]
        return b"editable-pptx"

    def build_local_export(*args, **kwargs):
        calls["local"] += 1
        return b"local-pptx"

    async def save_export_file(content, presentation_id, export_as):
        saved["content"] = content
        saved["presentation_id"] = presentation_id
        saved["export_as"] = export_as
        return f"/api/presentaciones/{presentation_id}/archivo/{export_as}"

    class FakeDb:
        async def commit(self):
            return None

        async def refresh(self, _pres):
            return None

    monkeypatch.setattr(service, "build_editable_pptx", build_editable_pptx)
    monkeypatch.setattr(service, "build_local_export", build_local_export)
    monkeypatch.setattr(service, "save_export_file", save_export_file)

    result = await service.export_presentacion(FakeDb(), pres, "pptx")  # type: ignore[arg-type]

    assert result.pptx_url == f"/api/presentaciones/{pres.id}/archivo/pptx"
    assert saved["presentation_id"] == pres.id
    assert saved["export_as"] == "pptx"
    assert saved["content"] == b"editable-pptx"
    assert calls == {"editable": 1, "local": 0}
    assert pres.slides_json["canonical"]["exports"]["pptx"]["editable"] is True
    assert extract_slides_for_export(pres.slides_json)


@pytest.mark.anyio
async def test_export_presentacion_falls_back_to_local_export_when_editable_fails(
    monkeypatch,
) -> None:
    pres = _presentation(
        slides_json={
            "slides": [
                {"title": "Ecosistemas", "bullets": ["Idea clave"], "image": ""}
            ],
        },
    )
    saved: dict[str, object] = {}
    calls = {"editable": 0, "local": 0}

    def build_editable_pptx(_canonical):
        calls["editable"] += 1
        raise RuntimeError("editable export failed")

    def build_local_export(title, slides, export_as):
        calls["local"] += 1
        assert title == pres.titulo
        assert slides
        assert export_as == "pptx"
        return b"local-pptx"

    async def save_export_file(content, presentation_id, export_as):
        saved["content"] = content
        saved["presentation_id"] = presentation_id
        saved["export_as"] = export_as
        return f"/api/presentaciones/{presentation_id}/archivo/{export_as}"

    class FakeDb:
        async def commit(self):
            return None

        async def refresh(self, _pres):
            return None

    monkeypatch.setattr(service, "build_editable_pptx", build_editable_pptx)
    monkeypatch.setattr(service, "build_local_export", build_local_export)
    monkeypatch.setattr(service, "save_export_file", save_export_file)

    result = await service.export_presentacion(FakeDb(), pres, "pptx")  # type: ignore[arg-type]

    assert result.pptx_url == f"/api/presentaciones/{pres.id}/archivo/pptx"
    assert saved["presentation_id"] == pres.id
    assert saved["export_as"] == "pptx"
    assert saved["content"] == b"local-pptx"
    assert calls == {"editable": 1, "local": 1}
    assert pres.slides_json["canonical"]["exports"]["pptx"]["editable"] is False
