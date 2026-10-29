from hashlib import sha256
from io import BytesIO
from uuid import uuid4

import pytest
from PIL import Image, ImageDraw

from app.modules.calificaciones.evidence_preparation import inspect_scan_source
from app.modules.calificaciones.evidence_manifest import EvidenceAsset
from app.services.evidence_scan import ScanRecipe
from app.services.evidence_scan_process import EvidencePreparationError, preparation_environment, run_page_preparation
from app.services.storage_service import save_private_evidence_asset
from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture


def test_preparation_process_does_not_inherit_provider_or_database_credentials(monkeypatch):
    monkeypatch.setenv("OPEN_CODE_API_KEY", "synthetic-must-not-be-inherited")
    monkeypatch.setenv("DATABASE_URL", "synthetic-must-not-be-inherited")
    environment = preparation_environment()
    assert "OPEN_CODE_API_KEY" not in environment and "DATABASE_URL" not in environment
    assert environment["OPENBLAS_NUM_THREADS"] == "1"


async def source_asset(tmp_path, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    content = make_scan_fixture(bank_cases()[0]).content
    metadata = inspect_scan_source(content)
    key = await save_private_evidence_asset(content, "image/png", category="sources", asset_id=uuid4())
    return EvidenceAsset(key=key, sha256=sha256(content).hexdigest(), mime="image/png", size_bytes=len(content),
                         width=metadata.width, height=metadata.height), content


@pytest.mark.asyncio
async def test_real_isolated_preparation_matches_recorded_source_and_profile(tmp_path, monkeypatch):
    asset, content = await source_asset(tmp_path, monkeypatch)
    recipe = ScanRecipe(width=800, height=1100, corners=((0., 0.), (1., 0.), (1., 1.), (0., 1.)), profile="lectura_suave")
    result = await run_page_preparation(asset, recipe=recipe, rotation=0)
    assert result.source_sha256 == sha256(content).hexdigest()
    assert result.width == 800 and result.height == 1100
    assert result.mime == "image/jpeg" and len(result.content) <= 2_500_000
    assert len(result.source_to_prepared) == 3


@pytest.mark.asyncio
async def test_process_timeout_is_bounded_and_retains_original(tmp_path, monkeypatch):
    from app.services import evidence_scan_process
    from app.services.storage_service import resolve_private_upload_path
    asset, content = await source_asset(tmp_path, monkeypatch)
    monkeypatch.setattr(evidence_scan_process, "PAGE_TIMEOUT_SECONDS", 0.001)
    with pytest.raises(EvidencePreparationError, match="tardó"):
        await run_page_preparation(asset, recipe=None, rotation=0)
    assert resolve_private_upload_path(asset.key).read_bytes() == content


@pytest.mark.asyncio
@pytest.mark.parametrize("format,mode", [("JPEG", "RGB"), ("PNG", "RGB"), ("PNG", "RGBA")])
@pytest.mark.parametrize("profile", ["natural", "lectura_suave"])
async def test_16mp_preparation_fits_the_unchanged_process_budget(tmp_path, monkeypatch, format, mode, profile):
    from app.core.config import settings
    from app.services.storage_service import resolve_private_upload_path
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    output = BytesIO()
    with Image.new(mode, (4000, 4000), "white") as source:
        draw = ImageDraw.Draw(source)
        for row in range(80, 3900, 90):
            draw.text((80, row), "SYNTHETIC -0.5 + 1.25 = 0.75 A B (X) D", fill=(70, 70, 70), font_size=48)
            draw.line((80, row + 68, 3900, row + 68), fill=(155, 155, 155), width=2)
        if mode == "RGBA":
            draw.rectangle((20, 20, 60, 60), fill=(20, 70, 120, 128))
        source.save(output, format=format, **({"quality": 92} if format == "JPEG" else {}))
    content = output.getvalue()
    mime = "image/jpeg" if format == "JPEG" else "image/png"
    key = await save_private_evidence_asset(content, mime, category="sources", asset_id=uuid4())
    asset = EvidenceAsset(key=key, sha256=sha256(content).hexdigest(), mime=mime, size_bytes=len(content), width=4000, height=4000)
    recipe = ScanRecipe(width=4000, height=4000, corners=((0., 0.), (1., 0.), (1., 1.), (0., 1.)), profile=profile)
    result = await run_page_preparation(asset, recipe=recipe, rotation=0)
    assert (result.width, result.height) == (2200, 2200)
    assert len(result.content) <= 2_500_000
    assert result.source_sha256 == asset.sha256
    assert resolve_private_upload_path(key).read_bytes() == content
