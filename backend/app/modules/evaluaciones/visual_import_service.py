"""Private, versioned import checkpoints. The caller owns each commit/lease.

Checkpoint data never contains file bytes/URLs. Original, page renders and crops
have separate immutable resources. Native source inventory is retained even when
its semantic association or clean publishable representation needs teacher review.
"""
from __future__ import annotations

import hashlib
from typing import Awaitable, Callable, Literal
from uuid import UUID, uuid5

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import settings
from app.modules.evaluaciones.digitalize_service import (
    DIGITALIZATION_VISION_PROMPT, _extract_image_text,
)
from app.modules.evaluaciones.document_visual_extractor import (
    EXTRACTOR_VERSION, SourceElement, extract_visual_document,
)
from app.modules.evaluaciones.models import EvaluacionRecurso
from app.modules.evaluaciones.visual_schemas import VisualCoverage, VisualManifest, VisualUploadRequest
from app.modules.evaluaciones.visual_service import read_resource_bytes, stage_resource

Persist = Callable[[dict], Awaitable[None]]
VISUAL_PAGE_PROMPT = DIGITALIZATION_VISION_PROMPT + """
Además conserva en texto_preguntas TODO el contexto impreso para responder:
pasajes compartidos, tablas con cada fila/columna, encabezados, unidades, fórmulas,
dibujos y gráficas con sus ejes, etiquetas y valores realmente legibles.
Describe estos estímulos separados de las preguntas. No conviertas un dibujo en
una pregunta adicional ni inventes valores o contenido oculto. No uses escritura,
marcas ni respuestas del estudiante para completar una tabla o una solución.
Si falta un detalle, indícalo en alertas para revisión; no lo adivines.
"""


class PageRead(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str
    warnings: list[str] = Field(default_factory=list)


class ConservedExtraction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pages: list[SourceElement]
    elements: list[SourceElement]
    asset_resources: dict[str, UUID]
    coverage: VisualCoverage


class VisualImportCheckpoint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal[1] = 1
    extractor_version: str = EXTRACTOR_VERSION
    job_id: UUID
    owner_id: UUID
    materia_id: UUID
    original_resource_id: UUID
    original_sha256: str = Field(min_length=64, max_length=64)
    extraction: ConservedExtraction | None = None
    page_reads: dict[str, PageRead] = Field(default_factory=dict)


def _parse_checkpoint(value: dict) -> VisualImportCheckpoint:
    try:
        return VisualImportCheckpoint.model_validate(value)
    except ValidationError:
        raise HTTPException(409, "El avance guardado no es compatible con esta lectura. Conserva el original y solicita revisión.") from None


async def _resource(db, checkpoint: VisualImportCheckpoint, resource_id: UUID) -> EvaluacionRecurso:
    item = await db.get(EvaluacionRecurso, resource_id)
    if item is None or (item.propietario_id, item.materia_id, item.job_id, item.borrador_id) != (
        checkpoint.owner_id, checkpoint.materia_id, checkpoint.job_id, checkpoint.job_id,
    ):
        raise HTTPException(409, "No pudimos comprobar el material guardado de este trabajo. Conserva el original y solicita revisión.")
    return item


async def prepare_visual_import(db, *, job_id: UUID, owner_id: UUID, materia_id: UUID,
                                content: bytes | None, checkpoint: dict | None, persist: Persist) -> dict:
    if checkpoint is not None:
        saved = _parse_checkpoint(checkpoint)
        if (saved.job_id, saved.owner_id, saved.materia_id) != (job_id, owner_id, materia_id):
            raise HTTPException(409, "El material guardado pertenece a otro trabajo.")
        original = await _resource(db, saved, saved.original_resource_id)
        if original.clase != "original" or original.sha256 != saved.original_sha256:
            raise HTTPException(409, "No pudimos comprobar el documento original guardado.")
        content = await read_resource_bytes(original)
        if saved.extractor_version != EXTRACTOR_VERSION:
            saved.extractor_version = EXTRACTOR_VERSION
            saved.extraction = None
            saved.page_reads = {}
    else:
        if not content:
            raise HTTPException(409, "Falta el documento original. Vuelve a cargarlo para continuar.")
        original = await stage_resource(db, propietario_id=owner_id,
            request=VisualUploadRequest(materia_id=materia_id, borrador_id=job_id, request_key=uuid5(job_id, "original")),
            content=content, clase="original", origen="importado", job_id=job_id,
            procedencia={"extractor_version": EXTRACTOR_VERSION})
        saved = VisualImportCheckpoint(job_id=job_id, owner_id=owner_id, materia_id=materia_id,
            original_resource_id=original.id, original_sha256=original.sha256)
        # A failed conversion/provider must not remove or require the temporary file.
        await persist(saved.model_dump(mode="json"))
    if saved.extraction is not None:
        for key, resource_id in saved.extraction.asset_resources.items():
            item = await _resource(db, saved, resource_id)
            data = await read_resource_bytes(item)
            safety = "privado_original" if item.clase == "pagina" else "pendiente_revision"
            if hashlib.sha256(safety.encode() + b"\0" + data).hexdigest() != key:
                raise HTTPException(409, "Una imagen guardada no corresponde al inventario del documento.")
        return saved.model_dump(mode="json")
    extracted = await extract_visual_document(content, original.mime)
    resources = {}
    for key, asset in extracted.assets.items():
        item = await stage_resource(db, propietario_id=owner_id,
            request=VisualUploadRequest(materia_id=materia_id, borrador_id=job_id, request_key=uuid5(job_id, "asset:" + key)),
            content=asset.content, clase="pagina" if asset.kind == "pagina" else "imagen", origen="importado", job_id=job_id,
            procedencia={"extractor_version": EXTRACTOR_VERSION, "asset_key": key})
        resources[key] = item.id
    saved.extraction = ConservedExtraction(pages=extracted.pages, elements=extracted.elements,
                                           asset_resources=resources, coverage=extracted.coverage)
    await persist(saved.model_dump(mode="json"))
    return saved.model_dump(mode="json")


def _manifest(saved: VisualImportCheckpoint) -> VisualManifest:
    extraction = saved.extraction
    if extraction is None:
        raise ValueError("Falta el inventario visual conservado.")
    coverage = extraction.coverage.model_dump(mode="json")
    for page in extraction.pages:
        for message in saved.page_reads.get(page.id, PageRead(text="")).warnings:
            coverage["avisos"].append({"pagina": page.page, "motivo": "formato_no_interpretable", "mensaje": message[:1000]})
    blocks = []
    # Pages remain private, including photos whose individual figures cannot yet
    # be separated. Native tables without a safe raster stay private source text;
    # never advertise that fallback as a clean editable/public table.
    for element in [*extraction.pages, *extraction.elements]:
        if not element.asset_key and element.kind != "tabla":
            continue
        if element.kind == "tabla" and not element.text.strip():
            continue  # The original/page and native inventory still retain empty/merged cells.
        block_id = str(uuid5(saved.job_id, "block:" + element.id))
        private = element.kind in {"pagina", "tabla"}
        block = {"id": block_id, "tipo": "texto" if element.kind == "tabla" else "imagen",
                 "orden": len(blocks), "pregunta_ids": [], "descripcion": "Página original" if element.kind == "pagina" else "Material conservado del documento",
                 "seguridad_contenido": "privado_original" if private else "pendiente_revision",
                 "procedencia": {"pagina": element.page, "region": element.region, "ancla_ooxml": element.anchor,
                                  "extractor_version": EXTRACTOR_VERSION}}
        if element.kind == "tabla":
            block["texto"] = element.text
        else:
            block["recurso_id"] = str(extraction.asset_resources[element.asset_key])
        blocks.append(block)
        coverage["avisos"].append({"bloque_id": block_id, "pagina": element.page, "motivo": "asociacion_pendiente",
                                   "mensaje": "Comprueba qué preguntas necesitan este material."})
        if not private:
            coverage["avisos"].append({"bloque_id": block_id, "pagina": element.page, "motivo": "publicacion_pendiente",
                                       "mensaje": "Confirma que la imagen no muestra respuestas del estudiante antes de publicarla."})
    coverage["estado"] = "requiere_revision"
    return VisualManifest.model_validate({"original_recurso_id": str(saved.original_resource_id),
        # JSONB can reorder object keys; resource inventory order must not
        # invalidate a valid structure cache after reading a checkpoint back.
        "recurso_ids": [str(saved.original_resource_id), *sorted({str(value) for value in extraction.asset_resources.values()})],
        "bloques": blocks, "cobertura": coverage})


async def read_visual_import(db, checkpoint: dict, *, user_id: UUID, ai_config: dict | None, persist: Persist) -> tuple[str, VisualManifest]:
    saved = _parse_checkpoint(checkpoint)
    if saved.extractor_version != EXTRACTOR_VERSION or saved.extraction is None:
        raise ValueError("El inventario visual necesita actualizarse antes de leer las páginas.")
    valid_page_ids = {page.id for page in saved.extraction.pages}
    if set(saved.page_reads) - valid_page_ids:
        raise HTTPException(409, "La lectura guardada no corresponde a las páginas del documento.")
    for page in saved.extraction.pages:
        if page.id in saved.page_reads:
            continue
        item = await _resource(db, saved, saved.extraction.asset_resources[page.asset_key])
        data = await read_resource_bytes(item)
        text, warnings = await _extract_image_text(data, item.mime, f"Página {page.page}", user_id,
                                                  ai_config=ai_config, prompt_override=VISUAL_PAGE_PROMPT)
        if len(text) + sum(len(item.text) for item in saved.page_reads.values()) > settings.PHOTO_GRADING_CONTEXT_BUDGET_CHARS:
            raise HTTPException(422, "El documento supera el límite de lectura. Divídelo para conservar todo el contenido.")
        saved.page_reads[page.id] = PageRead(text=text, warnings=warnings)
        await persist(saved.model_dump(mode="json"))
    text = "\n\n".join(f"Página {page.page}\n{saved.page_reads[page.id].text}" for page in saved.extraction.pages)
    if len(text) > settings.PHOTO_GRADING_CONTEXT_BUDGET_CHARS:
        raise HTTPException(422, "El documento supera el límite de lectura. Divídelo para conservar todo el contenido.")
    return text, _manifest(saved)
