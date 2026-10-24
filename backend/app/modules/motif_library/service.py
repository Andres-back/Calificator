from __future__ import annotations

import hashlib
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.core.config import settings
from app.modules.motif_library.schemas import Catalog, CollectionsRead, CollectionRead, MotifPage, MotifRead

ASSET_ROOT = Path(__file__).resolve().parents[2] / "assets" / "motif_library"


class AssetUnavailable(Exception):
    """Deliberately contains neither a filesystem path nor private identifiers."""


@dataclass(frozen=True)
class AssetContent:
    content: bytes
    media_type: str


@lru_cache(maxsize=4)
def load_catalog(root: Path = ASSET_ROOT) -> Catalog:
    # Metadata only. Never decode or load all original images to open a gallery.
    return Catalog.model_validate_json((root / "catalog.json").read_bytes())


def list_collections(catalog: Catalog) -> CollectionsRead:
    return CollectionsRead(catalog_version=catalog.version, collections=[
        CollectionRead(id=area.id, label=area.label, total=sum(item.collection_id == area.id for item in catalog.motifs))
        for area in catalog.collections
    ])


def list_motifs(catalog: Catalog, collection: str, *, offset: int = 0, limit: int = 12) -> MotifPage:
    if collection not in {item.id for item in catalog.collections} or offset < 0 or not 1 <= limit <= 12:
        raise ValueError("Colección o página no válida")
    items = [item for item in catalog.motifs if item.collection_id == collection]
    prefix = settings.API_PREFIX.rstrip("/") + "/biblioteca-motivos/archivos"
    return MotifPage(catalog_version=catalog.version, collection=collection, total=len(items), offset=offset, limit=limit, items=[
        MotifRead(id=item.id, collection_id=item.collection_id, label=item.label, description=item.description,
                  thumbnail_url=f"{prefix}/{item.id}/thumbnail/{item.thumbnail.sha256}",
                  full_url=f"{prefix}/{item.id}/full/{item.full.sha256}", width=item.full.width, height=item.full.height)
        for item in items[offset:offset + limit]
    ])


def read_asset(catalog: Catalog, motif_id: str, variant: str, digest: str, *, root: Path = ASSET_ROOT) -> AssetContent:
    item = next((item for item in catalog.motifs if item.id == motif_id), None)
    if item is None or variant not in {"full", "thumbnail"}:
        raise AssetUnavailable()
    asset = item.full if variant == "full" else item.thumbnail
    if digest != asset.sha256:
        raise AssetUnavailable()
    try:
        package_root = root.resolve(strict=True)
        path = (package_root / asset.filename).resolve(strict=True)
        if not path.is_relative_to(package_root) or not path.is_file() or path.stat().st_size != asset.size_bytes:
            raise AssetUnavailable()
        content = path.read_bytes()
    except (OSError, ValueError, RuntimeError) as exc:
        raise AssetUnavailable() from exc
    if hashlib.sha256(content).hexdigest() != asset.sha256:
        raise AssetUnavailable()
    return AssetContent(content=content, media_type=asset.mime)
