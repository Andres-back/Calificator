"""Read-only catalogue routes, tested without a database or real accounts."""
from __future__ import annotations

from types import SimpleNamespace

import pytest
import pytest_asyncio
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from app.core.permissions import get_current_user
from app.modules.motif_library import service
from app.modules.motif_library.router import router, get_catalog
from app.modules.motif_library.schemas import Catalog


@pytest_asyncio.fixture
async def motif_client():
    app = FastAPI()
    app.include_router(router, prefix="/api")
    actor = {"role": "profesor"}

    async def current():
        if actor["role"] is None:
            raise HTTPException(401, "Sin sesión")
        return SimpleNamespace(rol=actor["role"])

    app.dependency_overrides[get_current_user] = current
    app.dependency_overrides[get_catalog] = lambda: Catalog(version="test", collections=[], motifs=[])
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        yield client, actor


@pytest.mark.asyncio
async def test_metadata_requires_teacher_or_admin(motif_client):
    client, actor = motif_client
    for role in ["profesor", "admin"]:
        actor["role"] = role
        assert (await client.get("/api/biblioteca-motivos/colecciones")).status_code == 200
    actor["role"] = "estudiante"
    assert (await client.get("/api/biblioteca-motivos/colecciones")).status_code == 403
    assert (await client.get("/api/biblioteca-motivos?coleccion=general")).status_code == 403
    actor["role"] = None
    assert (await client.get("/api/biblioteca-motivos/colecciones")).status_code == 401


@pytest.mark.asyncio
async def test_curated_art_is_public_but_never_private_files(motif_client, monkeypatch):
    client, actor = motif_client
    actor["role"] = None
    monkeypatch.setattr(service, "read_asset", lambda *args, **kwargs: service.AssetContent(content=b"reviewed-png", media_type="image/png"))
    result = await client.get("/api/biblioteca-motivos/archivos/flower/full/" + "a" * 64)
    assert result.status_code == 200 and result.content == b"reviewed-png"
    assert result.headers["x-content-type-options"] == "nosniff"
    assert "immutable" in result.headers["cache-control"]
    assert (await client.get("/api/biblioteca-motivos/archivos/flower/secret/" + "a" * 64)).status_code == 422
    assert (await client.get("/api/biblioteca-motivos/archivos/flower/full/invalid")).status_code == 422


@pytest.mark.asyncio
async def test_bad_asset_returns_generic_not_found(motif_client, monkeypatch):
    client, _ = motif_client

    def missing(*args, **kwargs):
        raise service.AssetUnavailable()

    monkeypatch.setattr(service, "read_asset", missing)
    result = await client.get("/api/biblioteca-motivos/archivos/private/full/" + "b" * 64)
    assert result.status_code == 404
    assert result.json() == {"detail": "Ilustración no disponible"}


@pytest.mark.asyncio
async def test_page_limits_and_unknown_collection_are_rejected(motif_client):
    client, _ = motif_client
    for query in ["coleccion=general&limit=13", "coleccion=general&offset=-1", "coleccion=missing"]:
        assert (await client.get("/api/biblioteca-motivos?" + query)).status_code == 422
