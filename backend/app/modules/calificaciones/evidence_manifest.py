"""Closed private evidence manifests, independent of volatile grading JSON.

Only server-created storage metadata enters a manifest. Admission accepts
decisions/geometry, never file paths, derived bytes or transformation matrices.
"""
from __future__ import annotations

import hashlib
import json
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StrictBool, field_validator, model_validator

from app.services.evidence_scan import ALGORITHM, MAX_PREPARED_BYTES, ScanRecipe

PositiveInt = Annotated[int, Field(strict=True, ge=2)]
Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
MatrixValue = Annotated[float, Field(strict=True, allow_inf_nan=False)]
Matrix = tuple[tuple[MatrixValue, MatrixValue, MatrixValue], tuple[MatrixValue, MatrixValue, MatrixValue], tuple[MatrixValue, MatrixValue, MatrixValue]]
StorageKey = Annotated[str, Field(pattern=r"^\.private/evidence-scan/(?:sources|prepared|consultations)/[a-f0-9]{32}\.(?:jpg|png|webp|pdf)$")]


def scan_request_lock_key(request_id: UUID) -> int:
    return int.from_bytes(hashlib.sha256(("evidence-scan-request:" + str(request_id)).encode()).digest()[:8], "big", signed=True)


class EvidenceManifestError(ValueError):
    """Recoverable closed-contract failure, without private input in its message."""


class _Closed(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class _Rotation(_Closed):
    rotation: Literal[0, 90, 180, 270] = 0

    @field_validator("rotation", mode="before")
    @classmethod
    def integer_rotation(cls, value):
        if type(value) is not int:
            raise ValueError("Giro no admitido")
        return value


class ScanSubmissionPage(_Rotation):
    page_id: UUID
    revision: Annotated[int, Field(strict=True, ge=0, le=1_000_000)] = 0
    decision: Literal["original", "prepared"]
    recipe: ScanRecipe | None = None
    confirmed: StrictBool

    @model_validator(mode="after")
    def reviewed_recipe(self):
        if not self.confirmed:
            raise ValueError("Revisa la preparación antes de enviarla")
        if (self.decision == "prepared") != (self.recipe is not None):
            raise ValueError("La decisión no coincide con la preparación")
        if self.recipe is not None and self.recipe.rotation != self.rotation:
            raise ValueError("El giro no coincide con la preparación")
        return self


class ScanSubmission(_Closed):
    schema_version: Literal[1]
    pages: Annotated[tuple[ScanSubmissionPage, ...], Field(min_length=1, max_length=10)]

    @field_validator("schema_version", mode="before")
    @classmethod
    def version_is_integer(cls, value):
        if type(value) is not int:
            raise ValueError("Versión no admitida")
        return value

    @model_validator(mode="after")
    def unique_pages(self):
        if len({page.page_id for page in self.pages}) != len(self.pages):
            raise ValueError("No repitas una hoja en el paquete")
        return self


def parse_scan_submission(raw: str | None) -> ScanSubmission | None:
    if raw is None:
        return None
    if not isinstance(raw, str) or not raw or len(raw.encode("utf-8")) > 16_384:
        raise EvidenceManifestError("Revisa la preparación de las hojas antes de enviarlas.")
    try:
        return ScanSubmission.model_validate_json(raw)
    except ValueError as exc:
        raise EvidenceManifestError("La preparación no es válida. Revisa las hojas o usa las fotos originales.") from exc


class EvidenceAsset(_Closed):
    key: StorageKey
    sha256: Digest
    mime: Literal["image/jpeg", "image/png", "image/webp", "application/pdf"]
    size_bytes: Annotated[int, Field(strict=True, gt=0, le=40 * 1024 * 1024)]
    width: PositiveInt | None = None
    height: PositiveInt | None = None
    exif_orientation: Annotated[int, Field(strict=True, ge=1, le=8)] = 1

    @model_validator(mode="after")
    def valid_asset(self):
        suffix = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf"}[self.mime]
        if not self.key.endswith(suffix):
            raise ValueError("El tipo de archivo no coincide")
        if self.mime != "application/pdf" and (self.width is None or self.height is None):
            raise ValueError("Faltan dimensiones de la imagen")
        return self


class ManifestPage(_Rotation):
    page_id: UUID
    revision: Annotated[int, Field(strict=True, ge=0, le=1_000_000)] = 0
    source: EvidenceAsset
    decision: Literal["original", "prepared"]
    recipe: ScanRecipe | None = None
    prepared: EvidenceAsset | None = None
    source_to_prepared: Matrix | None = None

    @model_validator(mode="after")
    def consistent_page(self):
        if "/sources/" not in self.source.key or self.source.mime == "application/pdf" or self.source.size_bytes > 10 * 1024 * 1024:
            raise ValueError("Fuente de imagen no admitida")
        if (self.decision == "prepared") != (self.recipe is not None):
            raise ValueError("La preparación no coincide con su fuente")
        if self.recipe is not None and ((self.recipe.width, self.recipe.height) != (self.source.width, self.source.height) or self.recipe.rotation != self.rotation):
            raise ValueError("La preparación corresponde a otra foto o giro")
        if self.recipe is not None and self.recipe.width * self.recipe.height > 16_000_000:
            raise ValueError("La foto supera el presupuesto de escaneo")
        if self.prepared is not None:
            if "/prepared/" not in self.prepared.key or self.prepared.mime != "image/jpeg" or self.prepared.size_bytes > MAX_PREPARED_BYTES:
                raise ValueError("Derivado no admitido")
            if self.prepared.width is None or self.prepared.height is None or max(self.prepared.width, self.prepared.height) > 2200 or self.source_to_prepared is None:
                raise ValueError("Derivado incompleto")
        elif self.source_to_prepared is not None:
            raise ValueError("Transformación sin derivado")
        if self.source_to_prepared is not None:
            a, b, c = self.source_to_prepared
            determinant = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])
            if abs(determinant) < 1e-12:
                raise ValueError("Transformación degenerada")
        return self


def manifest_fingerprint(value: dict | EvidenceManifest) -> str:
    data = value if isinstance(value, dict) else value.model_dump(mode="json")
    payload = {name: str(data[name]) for name in ("actor_id", "evaluacion_id", "estudiante_id", "materia_id", "algorithm")}
    payload["pages"] = [{
        "page_id": str(page["page_id"]), "source_sha256": page["source"]["sha256"],
        "mime": page["source"]["mime"], "width": page["source"]["width"], "height": page["source"]["height"],
        "decision": page["decision"], "revision": page.get("revision", 0), "rotation": page.get("rotation", 0), "recipe": page.get("recipe"),
    } for page in data["pages"]]
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()


def canonical_pages_fingerprint(version_id: UUID, page_hashes: list[str]) -> str:
    payload = {"version": str(version_id), "algorithm": ALGORITHM, "pages": page_hashes}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


class EvidenceManifest(_Closed):
    schema_version: Literal[1]
    version_id: UUID
    request_id: UUID
    actor_id: UUID
    delivery_id: UUID
    evaluacion_id: UUID
    estudiante_id: UUID
    materia_id: UUID
    algorithm: Literal[ALGORITHM]
    fingerprint: Digest
    created_at: AwareDatetime
    state: Literal["admitted", "preparing", "prepared"]
    pages: Annotated[tuple[ManifestPage, ...], Field(min_length=1, max_length=10)]
    consultation: EvidenceAsset | None = None

    @field_validator("schema_version", mode="before")
    @classmethod
    def version_is_integer(cls, value):
        if type(value) is not int:
            raise ValueError("Versión no admitida")
        return value

    @model_validator(mode="after")
    def consistent_manifest(self):
        if len({page.page_id for page in self.pages}) != len(self.pages):
            raise ValueError("Identidad de hoja duplicada")
        if len({page.source.key for page in self.pages}) != len(self.pages):
            raise ValueError("Referencia de fuente duplicada")
        if sum(page.source.size_bytes for page in self.pages) > 40 * 1024 * 1024:
            raise ValueError("Paquete demasiado grande")
        if self.state == "prepared" and any(page.prepared is None for page in self.pages):
            raise ValueError("Faltan páginas preparadas")
        if self.consultation is not None and "/consultations/" not in self.consultation.key:
            raise ValueError("Referencia de consulta no admitida")
        if self.fingerprint != manifest_fingerprint(self):
            raise ValueError("La preparación cambió respecto a la fuente admitida")
        return self

    def require_delivery(self, delivery) -> None:
        if (str(self.delivery_id), str(self.evaluacion_id), str(self.estudiante_id), str(self.materia_id)) != (
            str(delivery.id), str(delivery.evaluacion_id), str(delivery.estudiante_id), str(delivery.materia_id)
        ):
            raise EvidenceManifestError("La evidencia no corresponde a esta entrega. Actualiza la vista.")

    @property
    def canonical_fingerprint(self) -> str:
        if self.state != "prepared" or any(page.prepared is None for page in self.pages):
            raise EvidenceManifestError("La evidencia todavía se está preparando.")
        return canonical_pages_fingerprint(self.version_id, [page.prepared.sha256 for page in self.pages])


def read_manifest(delivery) -> EvidenceManifest | None:
    raw = getattr(delivery, "evidencia_manifiesto", None)
    if raw is None:
        return None
    try:
        manifest = EvidenceManifest.model_validate(raw)
        manifest.require_delivery(delivery)
        return manifest
    except (ValueError, TypeError, AttributeError) as exc:
        # Never fall back to a legacy URL that could contain the private original.
        raise EvidenceManifestError("No pudimos comprobar la evidencia guardada. Conservamos sus archivos para revisarla.") from exc


def has_preserved_original(delivery) -> bool:
    if delivery is None:
        return False
    try:
        return read_manifest(delivery) is not None
    except EvidenceManifestError:
        return False
