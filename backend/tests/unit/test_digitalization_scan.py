"""Spec 157: escáner de hojas al digitalizar una evaluación desde fotos."""
from __future__ import annotations

from io import BytesIO
import json
import sys
from types import SimpleNamespace
from uuid import uuid4

from fastapi import HTTPException
from PIL import Image
import pytest
from starlette.datastructures import Headers, UploadFile

from app.core.config import settings
from app.modules.authorization.catalog import default_permissions_for_role
from app.modules.evaluaciones import router
from app.modules.materias import service as materias_service
from app.services import evidence_digitalization_scan as scan
from app.services.evidence_bundle_service import build_evidence_bundle
from app.services.evidence_scan import PreparedEvidenceScan, ScanRecipe
from app.services.evidence_scan_process import EvidencePreparationError
from app.shared.enums import EvaluacionModalidad, UserRole

CORNERS = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]]


def png(size: tuple[int, int], color: str = "white") -> bytes:
    output = BytesIO()
    Image.new("RGB", size, color).save(output, format="PNG")
    return output.getvalue()


def jpeg(size: tuple[int, int], color: str = "gray") -> bytes:
    output = BytesIO()
    Image.new("RGB", size, color).save(output, format="JPEG")
    return output.getvalue()


def upload(name: str, content: bytes, mime: str = "image/png") -> UploadFile:
    return UploadFile(file=BytesIO(content), filename=name, headers=Headers({"content-type": mime}))


def recipe(width: int = 400, height: int = 300, rotation: int = 0, profile: str = "natural") -> dict:
    return {"width": width, "height": height, "corners": CORNERS, "rotation": rotation,
            "profile": profile, "coordinate_frame": "exif_oriented_source"}


def prepared(size: tuple[int, int] = (123, 77)) -> PreparedEvidenceScan:
    content = jpeg(size)
    return PreparedEvidenceScan(content, "image/jpeg", size[0], size[1], "0" * 64,
                                [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]])


@pytest.fixture
def uploads_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    return tmp_path


# --- Recetas: lectura y validación (FR-002, FR-003) -------------------------

def test_without_recipes_nothing_is_parsed() -> None:
    assert scan.parse_scan_recipes(None, 2) is None
    assert scan.parse_scan_recipes("", 2) is None
    assert scan.parse_scan_recipes(object(), 2) is None  # Form() default in direct calls


def test_recipes_are_validated_with_the_grading_model() -> None:
    parsed = scan.parse_scan_recipes(json.dumps([recipe(), None]), 2)
    assert isinstance(parsed[0], ScanRecipe) and parsed[1] is None
    assert parsed[0].corners[0] == (0.1, 0.1)


@pytest.mark.parametrize("raw", [
    "{}", "[1]", "no-json", json.dumps([recipe()]),
    json.dumps([recipe(), {**recipe(), "corners": [[0, 0], [0, 0], [0, 0], [0, 0]]}]),
    json.dumps([recipe(), {**recipe(), "extra": 1}]),
    json.dumps([recipe(), {**recipe(), "rotation": 45}]),
])
def test_invalid_recipes_are_rejected_with_a_clear_message(raw) -> None:
    with pytest.raises(ValueError, match="Revisa la preparación de las hojas"):
        scan.parse_scan_recipes(raw, 2)


# --- Preparación por hoja antes de armar el documento (FR-004, FR-005, FR-006) ---

@pytest.mark.anyio
async def test_prepared_page_replaces_the_photo_in_the_bundle(uploads_dir, monkeypatch) -> None:
    seen: list = []

    async def fake_prepare(source, *, recipe, rotation):
        path = uploads_dir / source.key
        assert path.is_file() and source.key.startswith(".private/evidence-scan/sources/")
        seen.append((source.mime, recipe.profile, rotation))
        return prepared()

    monkeypatch.setattr(scan, "run_page_preparation", fake_prepare)
    recipes = scan.parse_scan_recipes(json.dumps([recipe(profile="lectura_suave"), None]), 2)
    bundle = await build_evidence_bundle([upload("a.png", png((400, 300))), upload("b.png", png((60, 80)))],
                                         rotations=[0, 0], scan_recipes=recipes)

    assert seen == [("image/png", "lectura_suave", 0)]
    assert bundle.mime == "application/pdf" and bundle.page_count == 2
    assert [item["preparada"] for item in bundle.metadata["archivos"]] == [True, False]
    assert bundle.warnings == ()
    # The temporary source never stays in private storage.
    assert not list((uploads_dir / ".private" / "evidence-scan" / "sources").glob("*"))


@pytest.mark.anyio
async def test_single_prepared_photo_is_the_reading_image(uploads_dir, monkeypatch) -> None:
    async def fake_prepare(source, *, recipe, rotation):
        return prepared((210, 297))

    monkeypatch.setattr(scan, "run_page_preparation", fake_prepare)
    bundle = await build_evidence_bundle([upload("a.png", png((400, 300)))], rotations=[90],
                                         scan_recipes=scan.parse_scan_recipes(json.dumps([recipe(rotation=90)]), 1))

    with Image.open(BytesIO(bundle.content)) as image:
        # The recipe already rotated it: the bundle does not turn it again.
        assert image.size == (210, 297)
    assert bundle.mime == "image/jpeg"


@pytest.mark.anyio
async def test_failed_preparation_falls_back_to_the_original_with_a_warning(uploads_dir, monkeypatch) -> None:
    async def failing(source, *, recipe, rotation):
        raise EvidencePreparationError("x")

    monkeypatch.setattr(scan, "run_page_preparation", failing)
    bundle = await build_evidence_bundle([upload("a.png", png((400, 300)))], rotations=[0],
                                         scan_recipes=scan.parse_scan_recipes(json.dumps([recipe()]), 1))

    with Image.open(BytesIO(bundle.content)) as image:
        assert image.size == (400, 300)
    assert bundle.metadata["archivos"][0]["preparada"] is False
    assert bundle.warnings == ("No pudimos preparar la hoja 1. Usamos su foto original.",)
    assert not list((uploads_dir / ".private" / "evidence-scan" / "sources").glob("*"))


@pytest.mark.anyio
async def test_unexpected_error_and_large_photo_also_fall_back(uploads_dir, monkeypatch) -> None:
    calls: list = []

    async def broken(source, *, recipe, rotation):
        calls.append(source.key)
        raise RuntimeError("boom")

    monkeypatch.setattr(scan, "run_page_preparation", broken)
    monkeypatch.setattr(scan, "MAX_SOURCE_BYTES", 2000)
    big = png((400, 300), "red")
    small = jpeg((40, 30))
    assert len(big) <= 2000 < len(jpeg((1200, 900)))
    bundle = await build_evidence_bundle(
        [upload("a.png", big), upload("b.jpg", jpeg((1200, 900)), "image/jpeg"), upload("c.jpg", small, "image/jpeg")],
        rotations=[0, 0, 0],
        scan_recipes=scan.parse_scan_recipes(json.dumps([recipe(), recipe(1200, 900), None]), 3),
    )
    assert len(calls) == 1  # the large photo is never sent to preparation
    assert bundle.warnings == ("No pudimos preparar la hoja 1. Usamos su foto original.",
                               "No pudimos preparar la hoja 2. Usamos su foto original.")


@pytest.mark.anyio
async def test_time_budget_stops_preparing_remaining_pages(uploads_dir, monkeypatch) -> None:
    calls: list = []
    clock = iter([0.0, 0.0, 100.0, 100.0, 100.0])

    async def fake_prepare(source, *, recipe, rotation):
        calls.append(source.key)
        return prepared()

    monkeypatch.setattr(scan, "run_page_preparation", fake_prepare)
    monkeypatch.setattr(scan, "_clock", lambda: next(clock))
    bundle = await build_evidence_bundle(
        [upload("a.png", png((400, 300))), upload("b.png", png((400, 300), "blue"))], rotations=[0, 0],
        scan_recipes=scan.parse_scan_recipes(json.dumps([recipe(), recipe()]), 2))
    assert len(calls) == 1
    assert bundle.warnings == ("No pudimos preparar la hoja 2. Usamos su foto original.",)


@pytest.mark.anyio
async def test_without_recipes_the_bundle_is_unchanged(uploads_dir, monkeypatch) -> None:
    async def never(*_args, **_kwargs):
        raise AssertionError("no preparation without recipes")

    monkeypatch.setattr(scan, "run_page_preparation", never)
    bundle = await build_evidence_bundle([upload("a.png", png((60, 80)))], rotations=[0])
    assert "preparada" not in bundle.metadata["archivos"][0]
    assert bundle.warnings == ()


@pytest.mark.anyio
@pytest.mark.skipif(sys.platform == "win32", reason="El proceso aislado usa límites de recursos de Linux")
async def test_real_isolated_preparation_crops_the_page(uploads_dir) -> None:
    source = Image.new("RGB", (400, 300), "white")
    source.paste((20, 20, 20), (40, 30, 360, 270))
    stream = BytesIO()
    source.save(stream, format="PNG")
    bundle = await build_evidence_bundle([upload("a.png", stream.getvalue())], rotations=[0],
                                         scan_recipes=scan.parse_scan_recipes(json.dumps([recipe()]), 1))
    assert bundle.warnings == ()
    with Image.open(BytesIO(bundle.content)) as image:
        assert image.size == (320, 240)


# --- Endpoint: permiso, giro y avisos (FR-001, FR-003, FR-007, FR-008) ---------

def teacher():
    return SimpleNamespace(id=uuid4(), rol=UserRole.PROFESOR.value,
                           _effective_permissions=default_permissions_for_role(UserRole.PROFESOR.value))


class FakeDB:
    async def commit(self):
        return None

    async def rollback(self):
        return None


@pytest.fixture
def digitalization(monkeypatch):
    captured: dict = {}

    async def can_manage(*_args, **_kwargs):
        return SimpleNamespace(id=uuid4())

    async def save_private(*_args, **_kwargs):
        return ".private/digitalizaciones/doc.pdf"

    async def create_job(_db, **kwargs):
        captured["job"] = kwargs
        return uuid4()

    async def bundle(files, **kwargs):
        captured["bundle"] = kwargs
        return SimpleNamespace(content=b"%PDF", mime="application/pdf", filename="evidencia-multihoja.pdf",
                               metadata={"paginas": len(files)}, warnings=("No pudimos preparar la hoja 2. Usamos su foto original.",))

    monkeypatch.setattr(materias_service, "ensure_can_manage_materia", can_manage)
    monkeypatch.setattr(router, "save_private_upload", save_private)
    monkeypatch.setattr(router.jobs_service, "create_job", create_job)
    monkeypatch.setattr(router, "build_evidence_bundle", bundle)
    monkeypatch.setattr(router, "digitalize_evaluation", SimpleNamespace(apply_async=lambda **_kwargs: None))
    monkeypatch.setattr(settings, "EVIDENCE_SCAN_ENABLED", True)
    monkeypatch.setattr(settings, "EVIDENCE_SCAN_TEACHER_IDS", "")
    return captured


async def call(user, recetas, rotaciones="[0, 0]"):
    return await router.digitalize_from_file(
        materia_id=uuid4(), nombre="Evaluación", descripcion=None, nota_maxima=5, modalidad=EvaluacionModalidad.FISICA,
        file=[upload("a.png", png((400, 300))), upload("b.png", png((400, 300)))], rotaciones=rotaciones,
        recetas=recetas, current_user=user, db=FakeDB(), _=None)


@pytest.mark.anyio
async def test_endpoint_passes_recipes_and_returns_warnings(digitalization) -> None:
    response = await call(teacher(), json.dumps([recipe(), None]))
    recipes = digitalization["bundle"]["scan_recipes"]
    assert isinstance(recipes[0], ScanRecipe) and recipes[1] is None
    assert response["avisos"] == ["No pudimos preparar la hoja 2. Usamos su foto original."]


@pytest.mark.anyio
async def test_endpoint_without_recipes_keeps_todays_flow(digitalization) -> None:
    await call(teacher(), None)
    assert digitalization["bundle"]["scan_recipes"] is None


@pytest.mark.anyio
async def test_endpoint_rejects_recipes_when_scanning_is_disabled(digitalization, monkeypatch) -> None:
    monkeypatch.setattr(settings, "EVIDENCE_SCAN_ENABLED", False)
    with pytest.raises(HTTPException) as caught:
        await call(teacher(), json.dumps([recipe(), None]))
    assert caught.value.status_code == 409
    assert "bundle" not in digitalization


@pytest.mark.anyio
async def test_endpoint_rejects_recipe_with_different_rotation(digitalization) -> None:
    with pytest.raises(HTTPException) as caught:
        await call(teacher(), json.dumps([recipe(rotation=90), None]), rotaciones="[0, 0]")
    assert caught.value.status_code == 400
    assert "giro" in caught.value.detail


@pytest.mark.anyio
async def test_endpoint_rejects_invalid_recipes(digitalization) -> None:
    with pytest.raises(HTTPException) as caught:
        await call(teacher(), "[1, 2]")
    assert caught.value.status_code == 400


@pytest.mark.anyio
async def test_capability_does_not_need_an_evaluation(monkeypatch) -> None:
    monkeypatch.setattr(settings, "EVIDENCE_SCAN_ENABLED", True)
    monkeypatch.setattr(settings, "EVIDENCE_SCAN_TEACHER_IDS", "")
    monkeypatch.setattr(settings, "EVIDENCE_CORNER_ASSISTANCE_ENABLED", True)
    result = await router.digitalization_scan_capability(current_user=teacher())
    assert result["enabled"] is True and result["schema_version"] == 1
    assert result["corner_assistance_enabled"] is False
    monkeypatch.setattr(settings, "EVIDENCE_SCAN_ENABLED", False)
    assert (await router.digitalization_scan_capability(current_user=teacher()))["enabled"] is False


@pytest.mark.anyio
async def test_capability_requires_creating_evaluations() -> None:
    student = SimpleNamespace(id=uuid4(), rol=UserRole.ESTUDIANTE.value,
                              _effective_permissions=default_permissions_for_role(UserRole.ESTUDIANTE.value))
    with pytest.raises(HTTPException) as caught:
        await router.digitalization_scan_capability(current_user=student)
    assert caught.value.status_code == 403


@pytest.mark.anyio
async def test_endpoint_rejects_recipes_with_a_document(digitalization) -> None:
    with pytest.raises(HTTPException) as caught:
        await router.digitalize_from_file(
            materia_id=uuid4(), nombre="Evaluación", descripcion=None, nota_maxima=5, modalidad=EvaluacionModalidad.FISICA,
            file=[upload("doc.pdf", b"%PDF-1.7\n%%EOF", "application/pdf")], rotaciones="[0]",
            recetas=json.dumps([recipe()]), current_user=teacher(), db=FakeDB(), _=None)
    assert caught.value.status_code == 400
    assert "solo se aplica a fotografías" in caught.value.detail
