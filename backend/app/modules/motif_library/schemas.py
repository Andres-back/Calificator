from __future__ import annotations

from pathlib import PurePosixPath
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Asset(StrictModel):
    filename: str = Field(min_length=1, max_length=180, pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_./-]*$")
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    size_bytes: int = Field(gt=0, le=307_200)
    width: int = Field(gt=0, le=4096)
    height: int = Field(gt=0, le=4096)
    mime: Literal["image/png", "image/webp"]

    @field_validator("filename")
    @classmethod
    def package_relative_file(cls, value: str) -> str:
        path = PurePosixPath(value)
        if path.is_absolute() or any(part in {".", ".."} for part in value.split("/")):
            raise ValueError("Solo archivos internos del catálogo")
        if path.suffix.lower() not in {".png", ".webp"}:
            raise ValueError("Formato de ilustración no admitido")
        return value


class Collection(StrictModel):
    id: str = Field(pattern=r"^[a-z][a-z0-9-]{0,49}$")
    label: str = Field(min_length=1, max_length=100)
    aliases: tuple[str, ...] = ()


class Motif(StrictModel):
    id: str = Field(pattern=r"^[a-z][a-z0-9-]{0,69}$")
    collection_id: str
    label: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=1, max_length=600)
    full: Asset
    thumbnail: Asset


class Catalog(StrictModel):
    version: str = Field(min_length=1, max_length=80)
    collections: tuple[Collection, ...]
    motifs: tuple[Motif, ...]

    @model_validator(mode="after")
    def unique_and_bound(self) -> Catalog:
        areas = [item.id for item in self.collections]
        ids = [item.id for item in self.motifs]
        if len(areas) != len(set(areas)) or len(ids) != len(set(ids)):
            raise ValueError("Identificadores repetidos en el catálogo")
        if any(item.collection_id not in areas for item in self.motifs):
            raise ValueError("La ilustración debe pertenecer a una colección")
        if any(item.thumbnail.size_bytes > 61_440 for item in self.motifs):
            raise ValueError("Miniatura demasiado grande")
        return self


class CollectionRead(StrictModel):
    id: str
    label: str
    total: int


class CollectionsRead(StrictModel):
    catalog_version: str
    collections: list[CollectionRead]


class MotifRead(StrictModel):
    id: str
    collection_id: str
    label: str
    description: str
    thumbnail_url: str
    full_url: str
    width: int
    height: int


class MotifPage(StrictModel):
    catalog_version: str
    collection: str
    total: int
    offset: int
    limit: int
    items: list[MotifRead]


class ResourceDecoration(StrictModel):
    motif_id: str = Field(pattern=r"^[a-z][a-z0-9-]{0,69}$")
    placement: Literal["header"] = "header"
