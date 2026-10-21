"""Private resource persistence. No public URLs or implicit publication.

Functions flush but do not commit; callers own the evaluation transaction.
Reading bytes is internal: HTTP callers must first authorize the specific
evaluation/revision or owner-only proposal, not just a resource identifier.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import warnings
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from uuid import UUID

import aiofiles
from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError
from sqlalchemy import exists, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.evaluaciones.document_archive import validate_docx as _inspect_docx
from app.modules.evaluaciones.models import Evaluacion, EvaluacionContenidoVersion, EvaluacionRecurso
from app.modules.evaluaciones.visual_schemas import VisualManifest, VisualUploadRequest
from app.modules.materias.models import Materia
from app.services.storage_service import resolve_private_upload_path, save_private_upload

MAX_RESOURCE_BYTES = 20 * 1024 * 1024
MAX_RESOURCE_PIXELS = 40_000_000
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
RESOURCE_CLASSES = {"original", "pagina", "imagen", "dibujo", "render_tabla", "render_grafica", "formula"}




def inspect_resource_bytes(content: bytes, *, clase: str) -> dict:
    """Validate actual data and dimensions before allocating persistent storage."""
    if clase not in RESOURCE_CLASSES or not content or len(content) > MAX_RESOURCE_BYTES:
        raise ValueError("El archivo no es válido o supera el límite de 20 MB.")
    if clase == "original" and content.startswith(b"PK"):
        _inspect_docx(content)
        return {"mime": DOCX_MIME, "ancho": None, "alto": None, "paginas": None}
    if clase == "original" and content.startswith(b"%PDF"):
        import fitz

        try:
            with fitz.open(stream=content, filetype="pdf") as document:
                if document.needs_pass or not 0 < document.page_count <= settings.MAX_GRADING_PDF_PAGES:
                    raise ValueError("El PDF está protegido o supera el límite de páginas; divídelo antes de cargarlo.")
                return {"mime": "application/pdf", "ancho": None, "alto": None, "paginas": document.page_count}
        except (RuntimeError, fitz.FileDataError) as exc:
            raise ValueError("No pudimos abrir el PDF.") from exc
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as image:
                mime = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}.get(image.format)
                if mime is None or image.width * image.height > MAX_RESOURCE_PIXELS or getattr(image, "n_frames", 1) != 1:
                    raise ValueError("Utiliza una imagen fija PNG, JPEG o WebP dentro de los límites.")
                result = {"mime": mime, "ancho": image.width, "alto": image.height, "paginas": None}
                image.verify()
            # verify() alone does not fully decode JPEG pixel data.
            with Image.open(BytesIO(content)) as image:
                image.load()
            return result
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ValueError("No pudimos leer la imagen. Vuelve a guardarla como PNG, JPEG o WebP.") from exc


async def _validate_owner_scope(db: AsyncSession, owner: UUID, request: VisualUploadRequest) -> None:
    subject = await db.scalar(select(Materia.id).where(Materia.id == request.materia_id, Materia.profesor_id == owner))
    if subject is None:
        raise HTTPException(404, "Materia no disponible")
    if request.evaluacion_id is not None:
        evaluation = await db.scalar(select(Evaluacion.id).where(
            Evaluacion.id == request.evaluacion_id, Evaluacion.profesor_id == owner,
            Evaluacion.materia_id == subject, Evaluacion.deleted_at.is_(None),
        ))
        if evaluation is None:
            raise HTTPException(404, "Evaluación no disponible")


async def stage_resource(
    db: AsyncSession, *, propietario_id: UUID, request: VisualUploadRequest,
    content: bytes, clase: str, origen: str, job_id: UUID | None = None,
    procedencia: dict | None = None,
) -> EvaluacionRecurso:
    await _validate_owner_scope(db, propietario_id, request)
    if origen not in {"importado", "subido", "ia"}:
        raise HTTPException(422, "El origen del material no es válido.")
    try:
        metadata = await asyncio.to_thread(inspect_resource_bytes, content, clase=clase)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    digest = hashlib.sha256(content).hexdigest()
    # Serialize retries before creating a file; uniqueness also protects SQL writers.
    lock_key = int.from_bytes(hashlib.sha256(propietario_id.bytes + request.request_key.bytes).digest()[:8], "big", signed=True)
    await db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock_key})
    existing = await db.scalar(select(EvaluacionRecurso).where(
        EvaluacionRecurso.propietario_id == propietario_id, EvaluacionRecurso.request_key == request.request_key,
    ).with_for_update())
    if existing is not None:
        same_scope = existing.evaluacion_id == request.evaluacion_id if request.evaluacion_id is not None else existing.borrador_id == request.borrador_id
        if not same_scope or (existing.sha256, existing.materia_id, existing.clase, existing.origen) != (
            digest, request.materia_id, clase, origen,
        ):
            raise HTTPException(409, "Esta carga ya corresponde a otro material. Inicia una nueva carga.")
        await read_resource_bytes(existing)
        return existing
    storage_key = await save_private_upload(content, metadata["mime"], subfolder="evaluation-visuals/" + str(propietario_id))
    resource = EvaluacionRecurso(
        propietario_id=propietario_id, materia_id=request.materia_id, evaluacion_id=request.evaluacion_id,
        borrador_id=request.borrador_id, request_key=request.request_key, job_id=job_id,
        clase=clase, origen=origen, storage_key=storage_key, sha256=digest,
        bytes_size=len(content), estado="staged", procedencia_json=procedencia or {},
        seguridad_contenido="privado_original" if clase in {"original", "pagina"} else "pendiente_revision", **metadata,
    )
    try:
        db.add(resource)
        await db.flush()
    except BaseException:
        resolve_private_upload_path(storage_key).unlink(missing_ok=True)
        raise
    return resource


async def read_resource_bytes(resource: EvaluacionRecurso) -> bytes:
    if resource.estado not in {"staged", "ready"}:
        raise HTTPException(409, "Este material ya no está disponible. Vuelve a cargarlo.")
    try:
        path = resolve_private_upload_path(resource.storage_key)
        if not path.is_file() or path.stat().st_size != resource.bytes_size or resource.bytes_size > MAX_RESOURCE_BYTES:
            raise ValueError("size")
        async with aiofiles.open(path, "rb") as source:
            content = await source.read(MAX_RESOURCE_BYTES + 1)
        if len(content) != resource.bytes_size or hashlib.sha256(content).hexdigest() != resource.sha256:
            raise ValueError("hash")
    except (OSError, ValueError) as exc:
        raise HTTPException(409, "No pudimos recuperar este material completo. Revisa el archivo o vuelve a cargarlo.") from exc
    return content


async def attach_staged_resource(db: AsyncSession, resource: EvaluacionRecurso, evaluation: Evaluacion) -> None:
    """Caller locks evaluation first; resource lock also excludes cleanup."""
    locked = await db.scalar(select(EvaluacionRecurso).where(EvaluacionRecurso.id == resource.id).with_for_update().execution_options(populate_existing=True))
    if locked is None or locked.propietario_id != evaluation.profesor_id or locked.materia_id != evaluation.materia_id or locked.evaluacion_id not in {None, evaluation.id}:
        raise HTTPException(404, "Material no disponible para esta evaluación")
    await read_resource_bytes(locked)
    locked.evaluacion_id = evaluation.id
    locked.estado = "ready"
    await db.flush()


async def cleanup_staged_resources(db: AsyncSession, *, before: datetime, limit: int = 100) -> int:
    """Retire expired unattached proposals only; historical references win."""
    referenced = exists(select(EvaluacionContenidoVersion.id).where(or_(
        EvaluacionContenidoVersion.source_resource_id == EvaluacionRecurso.id,
        EvaluacionContenidoVersion.recurso_ids.contains(text("jsonb_build_array(evaluacion_recursos.id::text)")),
    )))
    active_job = text("NOT EXISTS (SELECT 1 FROM ai_jobs WHERE ai_jobs.id = evaluacion_recursos.job_id AND ai_jobs.estado IN ('queued','running','retrying'))")
    resources = list(await db.scalars(select(EvaluacionRecurso).where(
        EvaluacionRecurso.estado.in_(["staged", "failed"]),
        EvaluacionRecurso.created_at < before, ~referenced, active_job,
    ).order_by(EvaluacionRecurso.created_at).limit(min(max(limit, 1), 1000)).with_for_update(skip_locked=True)))
    for resource in resources:
        resolve_private_upload_path(resource.storage_key).unlink(missing_ok=True)
        resource.estado = "retired"
    await db.flush()
    return len(resources)


def content_hash(snapshot: dict) -> str:
    return hashlib.sha256(json.dumps(snapshot, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")).hexdigest()


def _snapshot(evaluation: Evaluacion) -> dict:
    blueprint = evaluation.blueprint
    return deepcopy({
        "nombre": evaluation.nombre, "descripcion": evaluation.descripcion,
        "nota_maxima": str(evaluation.nota_maxima), "modalidad": evaluation.modalidad,
        "tipo_origen": evaluation.tipo_origen, "preguntas": evaluation.preguntas,
        "respuestas_esperadas": evaluation.respuestas_esperadas, "criterios": evaluation.criterios,
        "dba_ids": evaluation.dba_ids, "dba_personalizado_ids": evaluation.dba_personalizado_ids,
        "metas_profesor": evaluation.metas_profesor,
        "blueprint": {field: getattr(blueprint, field) for field in (
            "nivel_contexto", "dba", "metas", "criterios", "preguntas", "respuestas_esperadas",
            "errores_comunes", "contexto_rag", "reglas_feedback",
        )} if blueprint is not None else None,
    })


@dataclass(frozen=True)
class ContentEdit:
    evaluation: Evaluacion
    previous: EvaluacionContenidoVersion | None
    manifest: VisualManifest


async def prepare_content_edit(
    db: AsyncSession, evaluation_id: UUID, *, expected_version_id: UUID | None,
    expected_updated_at: datetime | None, manifest: VisualManifest | None = None,
) -> ContentEdit:
    """Run before mutating any evaluation fields, under its transaction lock."""
    evaluation = await db.scalar(select(Evaluacion).where(
        Evaluacion.id == evaluation_id, Evaluacion.deleted_at.is_(None),
    ).with_for_update().execution_options(populate_existing=True))
    if evaluation is None:
        raise HTTPException(404, "Evaluación no disponible")

    def utc_naive(value):
        return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value

    if expected_updated_at is None or evaluation.contenido_version_id != expected_version_id or utc_naive(evaluation.updated_at) != utc_naive(expected_updated_at):
        raise HTTPException(409, "La evaluación cambió. Conservamos tu edición; vuelve a abrir la versión actual antes de guardar.")
    legacy_delivery = await db.scalar(text("""
        SELECT EXISTS (SELECT 1 FROM entregas WHERE evaluacion_id=CAST(:evaluation AS uuid)
            AND contenido_version_id IS NULL AND estado IN ('en_progreso','recibida','procesando'))
    """), {"evaluation": str(evaluation_id)})
    legacy_job = await db.scalar(text("""
        SELECT EXISTS (SELECT 1 FROM ai_jobs j
        WHERE j.estado IN ('queued','running','retrying')
          AND NULLIF(j.input_json->>'contenido_version_id','') IS NULL
          AND (j.input_json->>'evaluacion_id' = :evaluation
               OR EXISTS (SELECT 1 FROM entregas e WHERE e.id=j.entrega_id
                   AND e.evaluacion_id=CAST(:evaluation AS uuid) AND e.contenido_version_id IS NULL)))
    """), {"evaluation": str(evaluation_id)})
    if legacy_delivery or legacy_job:
        raise HTTPException(409, "Hay entregas en proceso con la versión anterior. Espera a que terminen antes de cambiar el contenido.")
    previous = None
    if evaluation.contenido_version_id is not None:
        previous = await get_content_revision(db, evaluation.id, evaluation.contenido_version_id)
        if manifest is None:
            manifest = VisualManifest.model_validate(previous.snapshot_json["contenido_visual"])
    if manifest is None:
        raise HTTPException(422, "Indica el contenido visual que quieres guardar.")
    if previous is None:
        snapshot = _snapshot(evaluation)
        snapshot["contenido_visual"] = None
        snapshot["claves_pendientes_revision"] = []
        previous = EvaluacionContenidoVersion(
            evaluacion_id=evaluation.id, numero_version=1, autor_id=evaluation.profesor_id,
            content_hash=content_hash(snapshot), motivo="Estado observado antes de la primera edición visual",
            origen="estado_observado", snapshot_json=snapshot, legacy_baseline=True,
        )
        db.add(previous)
        await db.flush()
    return ContentEdit(evaluation=evaluation, previous=previous, manifest=manifest)


async def get_content_revision(db: AsyncSession, evaluation_id: UUID, version_id: UUID) -> EvaluacionContenidoVersion:
    revision = await db.scalar(select(EvaluacionContenidoVersion).where(
        EvaluacionContenidoVersion.id == version_id, EvaluacionContenidoVersion.evaluacion_id == evaluation_id,
    ))
    if revision is None:
        raise HTTPException(404, "Versión de evaluación no disponible")
    if revision.content_hash != content_hash(revision.snapshot_json):
        raise HTTPException(409, "No pudimos comprobar esta versión completa. Conserva la evidencia y solicita revisión.")
    return revision


def _question_visuals(manifest: dict | None) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for block in (manifest or {}).get("bloques", []):
        for question_id in block["pregunta_ids"]:
            grouped.setdefault(question_id, []).append(block)
    return grouped


async def save_content_revision(db: AsyncSession, edit: ContentEdit, *, reviewed_question_ids=()) -> EvaluacionContenidoVersion:
    evaluation, previous, manifest = edit.evaluation, edit.previous, edit.manifest
    if previous is None and evaluation.contenido_version_id is not None:
        raise HTTPException(409, "La evaluación ya tiene una versión. Abre la versión actual antes de guardar.")
    try:
        question_ids = [UUID(question["contenido_id"]) for question in evaluation.preguntas]
    except (KeyError, ValueError, TypeError) as exc:
        raise HTTPException(422, "Cada pregunta necesita su identificador de contenido antes de guardar imágenes.") from exc
    if len(set(question_ids)) != len(question_ids) or set(question_ids) != set(manifest.pregunta_ids):
        raise HTTPException(422, "Revisa qué material corresponde a cada pregunta antes de guardar.")
    resource_ids = set(manifest.recurso_ids)
    if manifest.original_recurso_id:
        resource_ids.add(manifest.original_recurso_id)
    resources = list(await db.scalars(select(EvaluacionRecurso).where(
        EvaluacionRecurso.id.in_(sorted(resource_ids)),
    ).order_by(EvaluacionRecurso.id).with_for_update().execution_options(populate_existing=True))) if resource_ids else []
    if len(resources) != len(resource_ids):
        raise HTTPException(404, "Falta material de esta evaluación. Vuelve a cargarlo antes de guardar.")
    for resource in resources:
        if resource.propietario_id != evaluation.profesor_id or resource.materia_id != evaluation.materia_id or resource.evaluacion_id not in {None, evaluation.id}:
            raise HTTPException(404, "Material no disponible para esta evaluación")
        if resource.id == manifest.original_recurso_id and resource.clase != "original":
            raise HTTPException(422, "El documento original debe conservarse por separado.")
        published = any(block.recurso_id == resource.id and block.seguridad_contenido == "publicable_confirmado" for block in manifest.bloques)
        if published and (resource.clase == "original" or resource.seguridad_contenido == "privado_original"):
            raise HTTPException(422, "El original privado no puede entregarse al estudiante. Utiliza una imagen limpia revisada.")
        await attach_staged_resource(db, resource, evaluation)
        # The authorized teacher explicitly confirms the manifest in this save.
        if published:
            resource.seguridad_contenido = "publicable_confirmado"
    snapshot = _snapshot(evaluation)
    manifest_json = manifest.model_dump(mode="json")
    snapshot["contenido_visual"] = manifest_json
    previous_snapshot = previous.snapshot_json if previous is not None else {}
    old_visuals = _question_visuals(previous_snapshot.get("contenido_visual"))
    new_visuals = _question_visuals(manifest_json)
    affected = {question for question in set(old_visuals) | set(new_visuals) if old_visuals.get(question) != new_visuals.get(question)}
    pending = set(previous_snapshot.get("claves_pendientes_revision", [])) | affected
    if previous is None:
        pending_numbers = set((snapshot.get("blueprint") or {}).get("reglas_feedback", {}).get("claves_pendientes", []))
        pending.update(str(question["contenido_id"]) for question in evaluation.preguntas if question.get("numero") in pending_numbers)
    reviewed = {str(value) for value in reviewed_question_ids}
    if not reviewed.issubset({str(value) for value in question_ids}):
        raise HTTPException(422, 'La revisión de respuestas contiene preguntas que no pertenecen a esta evaluación.')
    if reviewed:
        from app.modules.evaluaciones.blueprint_service import grading_answer_key_status
        selected_questions = [question for question in evaluation.preguntas if question['contenido_id'] in reviewed]
        complete, _ = grading_answer_key_status({'preguntas': selected_questions, 'respuestas_esperadas': evaluation.respuestas_esperadas})
        if not complete:
            raise HTTPException(422, 'Completa las respuestas correctas de las preguntas revisadas antes de guardar.')
        numbers = {question['numero'] for question in selected_questions}
        if snapshot['blueprint'] is not None:
            rules = dict(snapshot['blueprint']['reglas_feedback'] or {})
            rules['claves_pendientes'] = [number for number in rules.get('claves_pendientes', []) if number not in numbers]
            evaluation.blueprint.reglas_feedback = rules
            snapshot['blueprint']['reglas_feedback'] = rules
    snapshot["claves_pendientes_revision"] = sorted((pending - reviewed) & {str(value) for value in question_ids})
    snapshot["recursos"] = [{"id": str(resource.id), "sha256": resource.sha256, "mime": resource.mime,
                             "bytes_size": resource.bytes_size} for resource in resources]
    revision = EvaluacionContenidoVersion(
        evaluacion_id=evaluation.id, numero_version=previous.numero_version + 1 if previous is not None else 1, autor_id=evaluation.profesor_id,
        content_hash=content_hash(snapshot), previous_version_id=previous.id if previous is not None else None,
        source_resource_id=manifest.original_recurso_id, motivo="Edición docente de contenido" if previous is not None else "Contenido inicial conservado",
        origen="edicion" if previous is not None else "importado", snapshot_json=snapshot, coverage_json=manifest.cobertura.model_dump(mode="json"),
        recurso_ids=[str(resource.id) for resource in resources],
    )
    db.add(revision)
    await db.flush()
    evaluation.contenido_version_id = revision.id
    await db.flush()
    return revision
