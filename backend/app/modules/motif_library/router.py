from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response

from app.core.permissions import get_current_user, require_role
from app.modules.motif_library import service
from app.modules.motif_library.schemas import Catalog, CollectionsRead, MotifPage
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/biblioteca-motivos", tags=["biblioteca-motivos"])


def get_catalog() -> Catalog:
    try:
        return service.load_catalog()
    except (OSError, ValueError) as exc:
        raise HTTPException(503, "La biblioteca no está disponible. Puedes continuar sin decoración.") from exc


def require_catalog_editor(current_user: User = Depends(get_current_user)) -> User:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return current_user


@router.get("/colecciones", response_model=CollectionsRead)
def collections(_current_user: User = Depends(require_catalog_editor), catalog: Catalog = Depends(get_catalog)) -> CollectionsRead:
    return service.list_collections(catalog)


@router.get("", response_model=MotifPage)
def motifs(
    coleccion: str = Query(min_length=1, max_length=50),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=12, ge=1, le=12),
    _current_user: User = Depends(require_catalog_editor),
    catalog: Catalog = Depends(get_catalog),
) -> MotifPage:
    try:
        return service.list_motifs(catalog, coleccion, offset=offset, limit=limit)
    except ValueError as exc:
        raise HTTPException(422, "Elige un área de la biblioteca") from exc


@router.get("/archivos/{motif_id}/{variant}/{digest}")
def image(
    motif_id: Annotated[str, Path(pattern=r"^[a-z][a-z0-9-]{0,69}$")],
    variant: Literal["thumbnail", "full"],
    digest: Annotated[str, Path(pattern=r"^[a-f0-9]{64}$")],
    catalog: Catalog = Depends(get_catalog),
) -> Response:
    # Public by design: these are packaged illustrations, never private uploads.
    try:
        asset = service.read_asset(catalog, motif_id, variant, digest)
    except service.AssetUnavailable as exc:
        raise HTTPException(404, "Ilustración no disponible") from exc
    return Response(content=asset.content, media_type=asset.media_type, headers={
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
    })
