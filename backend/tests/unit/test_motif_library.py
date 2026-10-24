"""Curated assets only: no user paths, network calls or academic data."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest
from PIL import Image

from app.modules.motif_library import service


@pytest.fixture
def catalogue(tmp_path):
    image = tmp_path / "flower.png"
    picture = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    picture.putpixel((16, 16), (30, 160, 90, 255))
    picture.save(image)
    asset = {"filename": "flower.png", "sha256": hashlib.sha256(image.read_bytes()).hexdigest(), "size_bytes": image.stat().st_size, "width": 32, "height": 32, "mime": "image/png"}
    data = {"version": "test-1", "collections": [{"id": "general", "label": "Generales", "aliases": []}], "motifs": [{"id": "flower", "collection_id": "general", "label": "Flor", "description": "Una flor decorativa", "full": asset, "thumbnail": asset}]}
    (tmp_path / "catalog.json").write_text(json.dumps(data), encoding="utf-8")
    return tmp_path, data


def test_catalogue_pages_expose_only_curated_references(catalogue):
    root, _ = catalogue
    catalog = service.load_catalog(root)
    page = service.list_motifs(catalog, "general", offset=0, limit=12)
    assert page.total == 1 and page.limit == 12
    item = page.items[0]
    assert item.label == "Flor"
    assert item.full_url.startswith("/api/biblioteca-motivos/archivos/flower/full/")
    assert "filename" not in item.model_dump() and "source" not in item.model_dump()
    assert service.list_motifs(catalog, "general", offset=12, limit=12).items == []


@pytest.mark.parametrize("collection,offset,limit", [("unknown", 0, 12), ("general", -1, 12), ("general", 0, 13), ("general", 0, 0)])
def test_reject_invalid_page_bounds(catalogue, collection, offset, limit):
    with pytest.raises(ValueError):
        service.list_motifs(service.load_catalog(catalogue[0]), collection, offset=offset, limit=limit)


def test_asset_resolution_checks_id_variant_digest_and_integrity(catalogue):
    root, data = catalogue
    catalog = service.load_catalog(root)
    digest = data["motifs"][0]["full"]["sha256"]
    resolved = service.read_asset(catalog, "flower", "full", digest, root=root)
    assert resolved.content == (root / "flower.png").read_bytes()
    assert resolved.media_type == "image/png"
    for motif_id, variant, fingerprint in [("../../secret", "full", digest), ("flower", "../../secret", digest), ("flower", "full", "0" * 64)]:
        with pytest.raises(service.AssetUnavailable):
            service.read_asset(catalog, motif_id, variant, fingerprint, root=root)
    (root / "flower.png").write_bytes(b"not-the-reviewed-image")
    with pytest.raises(service.AssetUnavailable):
        service.read_asset(catalog, "flower", "full", digest, root=root)


@pytest.mark.parametrize("filename", ["../secret.png", "C:/secret.png", "/secret.png", "https://example.test/image.png", "file:///secret.png", "folder\\secret.png"])
def test_manifest_cannot_escape_package(catalogue, filename):
    root, data = catalogue
    data["motifs"][0]["full"]["filename"] = filename
    (root / "catalog.json").write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(ValueError):
        service.load_catalog(root)


def test_manifest_rejects_duplicate_ids_and_unknown_collections(catalogue):
    root, data = catalogue
    data["motifs"].append(data["motifs"][0])
    (root / "catalog.json").write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(ValueError):
        service.load_catalog(root)
    data["motifs"] = [data["motifs"][0] | {"collection_id": "unknown"}]
    (root / "catalog.json").write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(ValueError):
        service.load_catalog(root)


def test_missing_asset_does_not_expose_server_path(catalogue):
    root, data = catalogue
    catalog = service.load_catalog(root)
    (root / "flower.png").unlink()
    with pytest.raises(service.AssetUnavailable) as error:
        service.read_asset(catalog, "flower", "full", data["motifs"][0]["full"]["sha256"], root=root)
    assert str(root) not in str(error.value)


def test_existing_twenty_general_files_have_not_changed():
    files = Path(__file__).resolve().parents[3] / "frontend/public/assets/feedback-motifs"
    assert len(list(files.glob("*.png"))) == 20
    assert {path.stem for path in files.glob("*.png")} == {"libro", "lapices", "idea", "cohete", "planeta", "microscopio", "atomo", "calculadora", "geometria", "globo", "brote", "origami", "montana", "olas", "brujula", "cometa", "musica", "piezas", "telescopio", "arte"}


def test_packaged_generals_match_original_bytes():
    catalog = service.load_catalog()
    source = Path(__file__).resolve().parents[3] / "frontend/public/assets/feedback-motifs"
    general = [item for item in catalog.motifs if item.collection_id == "general"]
    assert len(general) == 20
    for item in general:
        assert (source / f"{item.id}.png").read_bytes() == service.read_asset(catalog, item.id, "full", item.full.sha256).content


def test_every_packaged_asset_has_real_alpha_integrity_and_bounded_size():
    catalog = service.load_catalog()
    for item in catalog.motifs:
        for variant in ("full", "thumbnail"):
            asset = item.full if variant == "full" else item.thumbnail
            resolved = service.read_asset(catalog, item.id, variant, asset.sha256)
            assert len(resolved.content) <= (61_440 if variant == "thumbnail" else 307_200)
            with Image.open(service.ASSET_ROOT / asset.filename) as picture:
                assert picture.mode == "RGBA"
                assert picture.getchannel("A").getextrema() == (0, 255)
                assert picture.size == (asset.width, asset.height)


def test_complete_catalogue_has_thirty_distinct_motifs_per_area():
    catalog = service.load_catalog()
    areas = {"naturales", "sociales", "matematicas", "castellana", "ingles", "tecnologia", "artistica", "fisica", "etica", "religiosa"}
    assert {item.id for item in catalog.collections} == areas | {"general"}
    assert len(catalog.motifs) == 320
    assert len({item.id for item in catalog.motifs}) == 320
    assert len({item.full.sha256 for item in catalog.motifs}) == 320
    for area in areas:
        motifs = [item for item in catalog.motifs if item.collection_id == area]
        assert len(motifs) == 30
        assert [item.id for item in motifs] == [f"{area}-{number:03d}" for number in range(1, 31)]
