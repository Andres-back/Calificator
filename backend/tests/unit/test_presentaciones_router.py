import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.main import create_app
from PIL import Image, ImageDraw

from app.modules.presentaciones.local_export import (
    _fit_lines,
    build_local_export,
    extract_slides_for_export,
    pdf_has_minimal_content,
    pptx_has_slides_and_media,
)
from app.modules.presentaciones import presenton_service
from app.modules.presentaciones import service
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
        "presenton_id": "presenton-test",
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
    pres = _presentation(
        profesor_id=profesor.id, estado="queued", pptx_url=None, presenton_id=None
    )

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


def test_profesor_gets_editor_url_and_exports(monkeypatch) -> None:
    profesor = _user("profesor")
    pres = _presentation(profesor_id=profesor.id)

    async def ensure_can_manage_presentacion(*args, **kwargs):
        return pres

    async def export_presentacion(*args, **kwargs):
        return pres

    monkeypatch.setattr(
        service, "ensure_can_manage_presentacion", ensure_can_manage_presentacion
    )
    monkeypatch.setattr(service, "export_presentacion", export_presentacion)

    client = _client_with_user(profesor)

    editor_response = client.post(f"/api/presentaciones/{pres.id}/editor-url")
    export_response = client.post(
        f"/api/presentaciones/{pres.id}/exportar", json={"format": "pptx"}
    )

    assert editor_response.status_code == 200, editor_response.text
    assert editor_response.json()["url"].startswith(
        f"/api/presentaciones/{pres.id}/editor"
    )
    assert export_response.status_code == 200, export_response.text
    assert export_response.json()["pptx_url"]


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


def test_presenton_direct_slides_use_modern_image_layout() -> None:
    slides = [
        {
            "title": "Fotosintesis",
            "bullets": ["Las plantas producen alimento.", "Usan luz solar y agua."],
            "image": "escena educativa de una planta recibiendo luz solar",
            "image_asset": "/app_data/images/xcal/test.png",
            "notes": "Relacionar con plantas del entorno.",
        }
    ]

    direct = presenton_service._build_direct_slides("presentation-id", "modern", slides)

    assert direct[0]["layout_group"] == "modern"
    assert direct[0]["layout"] == "modern:image-and-description"
    assert set(direct[0]["content"]) == {"title", "content", "image"}
    assert (
        direct[0]["content"]["image"]["__image_url__"]
        == "/app_data/images/xcal/test.png"
    )


def test_local_export_builds_valid_files_from_xcal_slides() -> None:
    slides = [{"title": "Fotosintesis", "bullets": ["Idea clave"], "image": ""}]

    pptx = build_local_export("Fotosintesis", slides, "pptx")
    pdf = build_local_export("Fotosintesis", slides, "pdf")

    assert pptx_has_slides_and_media(pptx)
    assert pdf_has_minimal_content(pdf)


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
        max_lines=4,
        sizes=[32, 29, 26, 24, 22, 20],
    )

    assert "..." not in " ".join(lines)
    assert "progresiva" in " ".join(lines)



@pytest.mark.anyio
async def test_export_presentacion_uses_editable_pptx_as_primary(monkeypatch) -> None:
    pres = _presentation(
        presenton_id=None,
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
        presenton_id=None,
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
