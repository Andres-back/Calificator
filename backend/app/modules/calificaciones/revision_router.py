"""Acciones docentes explícitas; los snapshots nunca son públicos."""

from datetime import datetime
import json
import logging
import mimetypes
from types import SimpleNamespace
from uuid import UUID, uuid4
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Path as ApiPath, Query, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.permissions import get_current_user, require_permission_now
from app.db.session import get_db
from app.modules.calificaciones import answer_location_service, revision_service, service
from app.modules.calificaciones.models import (
    Calificacion,
    CalificacionRevision,
    Entrega,
)
from app.modules.calificaciones.evidence_manifest import EvidenceManifest, EvidenceManifestError, parse_scan_submission
from app.modules.calificaciones.evidence_preparation import validate_scan_sources
from app.modules.calificaciones.evidence_preparation import scan_limits
from app.modules.calificaciones.evidence_edit import read_editing_evidence, resolve_edited_pages
from app.modules.calificaciones.evidence_scan_admission import lock_scan_request, require_scan_enabled
from app.modules.calificaciones.evidence_scan_reads import EvidenceVariant, manifest_response, require_original_access
from app.modules.calificaciones.evidence_service import EvidencePageError, MAX_EVIDENCE_PAGES, _render_cached_evidence_page
from app.services.answer_evidence_regions import evidence_version
from app.modules.calificaciones.schemas import (
    AnswerLocationResult,
    BatchRegradeRequest,
    BatchResult,
    BatchResultItem,
    CalificacionRead,
    CalificacionRevisionRead,
    ReprocessingContextRead,
)
from app.modules.evaluaciones import service as evaluation_service
from app.modules.users.models import User
from app.services.evidence_bundle_service import (
    EvidenceBundleError,
    build_evidence_bundle,
)
from app.services.storage_service import resolve_upload_path

router = APIRouter()
logger = logging.getLogger(__name__)


async def owned_grade(db, grade_id, actor, *, lock=False):
    require_permission_now(actor, "grading.grade")
    grade = await service.get_calificacion_or_404(db, grade_id)
    evaluation = await evaluation_service.ensure_can_manage_evaluation(
        db, grade.evaluacion_id, actor
    )
    if lock:
        grade = await db.scalar(
            select(Calificacion)
            .options(selectinload(Calificacion.entrega))
            .where(Calificacion.id == grade_id)
            .with_for_update(of=Calificacion)
            .execution_options(populate_existing=True)
        )
        if grade is None:
            raise HTTPException(404, "Calificación no encontrada")
        if grade.entrega_id:
            await db.scalar(
                select(Entrega)
                .where(Entrega.id == grade.entrega_id)
                .with_for_update()
                .execution_options(populate_existing=True)
            )
    return grade, evaluation


async def _rollback_keeping_actor(db, actor) -> None:
    """Un rollback caduca al usuario ya cargado; se recarga para seguir con el lote."""
    await db.rollback()
    await db.refresh(actor)


# Declarada antes de la ruta por calificación: «lote» no debe leerse como un identificador.
@router.post("/calificaciones/{calificacion_id}/ubicar-respuestas", response_model=AnswerLocationResult)
async def ubicar_respuestas(
    calificacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Spec 175: guarda dónde está cada respuesta en la foto. No cambia la nota."""
    grade, evaluation = await owned_grade(db, calificacion_id, current_user)
    return await answer_location_service.locate_answers(
        db, grade=grade, evaluation=evaluation, actor=current_user
    )


@router.post("/calificaciones/lote/recalificar", response_model=BatchResult, status_code=202)
async def recalificar_lote(
    payload: BatchRegradeRequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Vuelve a calificar varias entregas que el docente aún no ha decidido.

    Cada entrega usa la misma reapertura que la acción individual: conserva su
    historial y su evidencia. Una nota revisada, confirmada o publicada no entra
    en un lote; reabrirla es una decisión de una en una.
    """
    require_permission_now(current_user, "grading.grade")
    from app.modules.materias.service import ensure_active_materia

    results: list[BatchResultItem] = []
    for grade_id in dict.fromkeys(payload.calificacion_ids):
        try:
            await owned_grade(db, grade_id, current_user)
            request_id = uuid4()
            await lock_scan_request(db, request_id)
            grade, evaluation = await owned_grade(db, grade_id, current_user, lock=True)
            await ensure_active_materia(db, evaluation.materia_id)
            service.ensure_evaluation_active(evaluation)
            if revision_service.teacher_decided(grade):
                raise HTTPException(409, "Ya revisaste esta nota. Para volver a calificarla, ábrela y usa «Recalificar».")
            await revision_service.reprocess_grade(
                db,
                grade=grade,
                evaluation=evaluation,
                actor_id=current_user.id,
                request_id=request_id,
                expected_version=grade.updated_at,
                confirmed=False,
                reason="Recalificación en lote",
            )
            results.append(BatchResultItem(calificacion_id=grade_id, success=True))
        except HTTPException as exc:
            await _rollback_keeping_actor(db, current_user)
            results.append(BatchResultItem(calificacion_id=grade_id, success=False, error=str(exc.detail)))
        except Exception:  # noqa: BLE001
            await _rollback_keeping_actor(db, current_user)
            logger.exception("batch_regrade_failed")
            results.append(BatchResultItem(calificacion_id=grade_id, success=False, error="No se pudo volver a calificar esta entrega."))
    succeeded = sum(1 for item in results if item.success)
    return BatchResult(results=results, total=len(results), exitosos=succeeded, fallidos=len(results) - succeeded)


@router.post(
    "/calificaciones/{calificacion_id}/recalificar",
    response_model=CalificacionRead,
    status_code=202,
)
async def recalificar_entrega(
    calificacion_id: UUID,
    solicitud_id: UUID = Form(...),
    version_esperada: datetime = Form(...),
    confirmar_reapertura: bool = Form(False),
    motivo: str | None = Form(None, max_length=1000),
    foto: list[UploadFile] | None = File(None),
    rotaciones: str | None = Form(None),
    escaneo: Annotated[str | None, Form(max_length=16384)] = None,
    edicion_evidencia: Annotated[str | None, Form(max_length=16384)] = None,
    usar_puntajes_actuales: bool = Form(False),
    version_puntajes_objetivo: UUID | None = Form(None),
    contexto_puntajes_fingerprint: str | None = Form(None, min_length=64, max_length=64, pattern=r'^[a-f0-9]{64}$'),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_permission_now(current_user, "grading.grade")
    if escaneo is not None or edicion_evidencia is not None:
        require_scan_enabled(current_user)
    await owned_grade(db, calificacion_id, current_user)
    # Serialize an idempotency key across both evidence modes and grades.
    # Always acquire this before grade/delivery/evaluation row locks.
    await lock_scan_request(db, solicitud_id)
    grade, evaluation = await owned_grade(db, calificacion_id, current_user, lock=True)
    from app.modules.materias.service import ensure_active_materia
    await ensure_active_materia(db, evaluation.materia_id)
    service.ensure_evaluation_active(evaluation)
    bundle = None
    scan_replacement = None
    reused_scan_pages = None
    if edicion_evidencia is not None:
        if escaneo is not None or rotaciones is not None:
            raise HTTPException(422, "Elige una sola forma de cambiar la evidencia.")
        if not confirmar_reapertura:
            raise HTTPException(409, "Confirma que quieres guardar las hojas y volver a calificar.")
        delivery = grade.entrega
        previous = await db.get(CalificacionRevision, solicitud_id)
        if previous is not None:
            if previous.calificacion_id != grade.id or previous.actor_id != current_user.id or delivery is None:
                raise HTTPException(409, "Esta solicitud ya corresponde a otra operación.")
            previous_delivery = (previous.snapshot_json or {}).get("entrega", {})
            delivery = SimpleNamespace(
                id=delivery.id, evaluacion_id=delivery.evaluacion_id, estudiante_id=delivery.estudiante_id,
                materia_id=delivery.materia_id, archivo_url=previous_delivery.get("archivo_url"),
                evidencia_manifiesto=previous_delivery.get("evidencia_manifiesto"),
            )
        else:
            revision_service.ensure_reprocessing_allowed(grade, version_esperada, confirmar_reapertura)
        base = await read_editing_evidence(delivery)
        submission, sources, reused_scan_pages = await resolve_edited_pages(edicion_evidencia, foto or [], base, solicitud_id)
        scan_replacement = (submission, sources)
    elif escaneo is not None:
        if not foto or rotaciones:
            raise HTTPException(400, "La preparación necesita sus fotos originales y una sola receta por hoja.")
        try:
            submission = parse_scan_submission(escaneo)
            scan_replacement = (submission, await validate_scan_sources(foto, submission))
        except EvidenceManifestError as exc:
            raise HTTPException(400, str(exc)) from exc
    elif foto:
        try:
            turns = json.loads(rotaciones) if rotaciones else None
            if turns is not None and (
                not isinstance(turns, list)
                or any(type(turn) is not int for turn in turns)
            ):
                raise EvidenceBundleError("La rotación de las hojas no es válida.")
            bundle = await build_evidence_bundle(foto, rotations=turns)
        except (EvidenceBundleError, ValueError, TypeError) as exc:
            raise HTTPException(400, "Revisa las fotos o el PDF: " + str(exc)) from exc
    return await revision_service.reprocess_grade(
        db,
        grade=grade,
        evaluation=evaluation,
        actor_id=current_user.id,
        request_id=solicitud_id,
        expected_version=version_esperada,
        confirmed=confirmar_reapertura,
        reason=motivo,
        bundle=bundle,
        scan_replacement=scan_replacement,
        reused_scan_pages=reused_scan_pages,
        usar_puntajes_actuales=usar_puntajes_actuales,
        version_puntajes_objetivo=version_puntajes_objetivo,
        contexto_puntajes_fingerprint=contexto_puntajes_fingerprint,
    )


async def owned_editable_evidence(db, calificacion_id, actor):
    from app.modules.materias.service import get_materia_or_404
    from app.shared.enums import MateriaEstado

    grade, evaluation = await owned_grade(db, calificacion_id, actor)
    require_scan_enabled(actor)
    materia = await get_materia_or_404(db, evaluation.materia_id)
    if materia.estado == MateriaEstado.ARCHIVADA.value:
        raise HTTPException(409, "Esta materia está archivada.")
    service.ensure_evaluation_active(evaluation)
    if grade.estado in {"procesando", "anulada"}:
        raise HTTPException(409, "Esta calificación no admite cambios en este momento.")
    return grade, await read_editing_evidence(grade.entrega)


@router.get("/calificaciones/{calificacion_id}/evidencia/edicion")
async def consultar_edicion_evidencia(
    calificacion_id: UUID,
    response: Response,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    grade, editable = await owned_editable_evidence(db, calificacion_id, current_user)
    count, per_file, total = scan_limits()
    response.headers["Cache-Control"] = "private, no-store"
    base = f"/api/calificaciones/{calificacion_id}/evidencia/edicion"
    return {
        "version_esperada": grade.updated_at,
        "fingerprint": editable.fingerprint,
        "limites": {"max_pages": count, "max_file_bytes": per_file, "max_total_bytes": total},
        "paginas": [
            {
                "referencia": page.ref,
                "numero": index,
                "preview_url": f"{base}/{page.ref}?fingerprint={editable.fingerprint}",
                "fuente_url": f"{base}/{page.ref}?fingerprint={editable.fingerprint}",
                "rotacion": page.manifest_page.rotation if page.manifest_page else 0,
                "receta": page.manifest_page.recipe if page.manifest_page else None,
                "ancho": page.manifest_page.source.width if page.manifest_page else page.legacy_source.width,
                "alto": page.manifest_page.source.height if page.manifest_page else page.legacy_source.height,
                "marco": "original_orientado",
                "original_disponible": page.manifest_page is not None,
            }
            for index, page in enumerate(editable.pages, 1)
        ],
    }


@router.get("/calificaciones/{calificacion_id}/evidencia/edicion/{referencia}")
async def consultar_fuente_edicion_evidencia(
    calificacion_id: UUID,
    referencia: UUID,
    fingerprint: Annotated[str, Query(pattern=r"^[a-f0-9]{64}$")],
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    _, editable = await owned_editable_evidence(db, calificacion_id, current_user)
    if fingerprint != editable.fingerprint:
        raise HTTPException(409, "La evidencia cambió. Abre de nuevo el editor de hojas.")
    page = next((page for page in editable.pages if page.ref == referencia), None)
    if page is None:
        raise HTTPException(404, "Hoja no encontrada.")
    try:
        source = await page.source()
    except EvidenceManifestError as exc:
        raise HTTPException(409, "No pudimos comprobar esta hoja guardada.") from exc
    return Response(source.content, media_type=source.mime, headers={
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    })


@router.get(
    '/calificaciones/{calificacion_id}/recalificacion-contexto',
    response_model=ReprocessingContextRead,
)
async def consultar_contexto_recalificacion(
    calificacion_id: UUID,
    response: Response,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    from app.modules.calificaciones.reprocessing_context import read_reprocessing_context
    from app.modules.materias.service import get_materia_or_404
    from app.shared.enums import MateriaEstado
    grade, evaluation = await owned_grade(db, calificacion_id, current_user)
    # A preview is read-only. The POST retains the exclusive admission gate.
    materia = await get_materia_or_404(db, evaluation.materia_id)
    if materia.estado == MateriaEstado.ARCHIVADA.value:
        raise HTTPException(409, 'Esta materia está archivada. Puedes consultar su historial o restaurarla desde Materias.')
    service.ensure_evaluation_active(evaluation)
    response.headers['Cache-Control'] = 'private, no-store'
    return await read_reprocessing_context(db, evaluation, grade, actor_id=current_user.id)


@router.get(
    "/calificaciones/{calificacion_id}/revisiones",
    response_model=list[CalificacionRevisionRead],
)
async def listar_revisiones(
    calificacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_permission_now(current_user, "grading.grade")
    await owned_grade(db, calificacion_id, current_user)
    rows = (
        await db.execute(
            select(CalificacionRevision, User.nombre)
            .join(User, User.id == CalificacionRevision.actor_id)
            .where(CalificacionRevision.calificacion_id == calificacion_id)
            .order_by(
                CalificacionRevision.created_at.desc(), CalificacionRevision.id.desc()
            )
            .limit(100)
        )
    ).all()
    return [
        {
            "id": row.id,
            "created_at": row.created_at,
            "actor_nombre": actor,
            "accion": row.accion,
            "motivo": row.motivo,
            "estado_anterior": row.snapshot_json.get("estado"),
            "nota_anterior": row.snapshot_json.get("nota_confirmada")
            if row.snapshot_json.get("nota_confirmada") is not None
            else row.snapshot_json.get("nota_sugerida"),
            "feedback_anterior": row.snapshot_json.get("feedback"),
            "evidencia_url": f"/api/calificaciones/{calificacion_id}/revisiones/{row.id}/evidencia"
            if row.archivo_url
            else None,
            "originales_paginas": revision_original_count(row),
        }
        for row, actor in rows
    ]


def revision_original_count(revision) -> int:
    raw = (revision.snapshot_json or {}).get("entrega", {}).get("evidencia_manifiesto")
    if raw is None:
        return 0
    try:
        return len(EvidenceManifest.model_validate(raw).pages)
    except (ValueError, TypeError):
        return 0


async def owned_evidence_revision(db, calificacion_id, revision_id, current_user):
    require_permission_now(current_user, "grading.grade")
    grade, _ = await owned_grade(db, calificacion_id, current_user)
    revision = await db.scalar(
        select(CalificacionRevision).where(
            CalificacionRevision.id == revision_id,
            CalificacionRevision.calificacion_id == calificacion_id,
        )
    )
    if revision is None or not revision.archivo_url:
        raise HTTPException(404, "Evidencia anterior no encontrada")
    return grade, revision


def revision_manifest(grade, revision):
    raw_manifest = (revision.snapshot_json or {}).get("entrega", {}).get("evidencia_manifiesto")
    if raw_manifest is None:
        return None
    try:
        manifest = EvidenceManifest.model_validate(raw_manifest)
        manifest.require_delivery(grade.entrega)
        return manifest
    except (ValueError, TypeError, AttributeError) as exc:
        raise HTTPException(409, "No pudimos comprobar la evidencia anterior. Conservamos sus archivos.") from exc


@router.get("/calificaciones/{calificacion_id}/revisiones/{revision_id}/evidencia")
async def evidencia_revision(
    calificacion_id: UUID,
    revision_id: UUID,
    version: EvidenceVariant = "preparada",
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    grade, revision = await owned_evidence_revision(db, calificacion_id, revision_id, current_user)
    if version == "original":
        require_original_access(current_user, is_owner_student=False)
    manifest = revision_manifest(grade, revision)
    if manifest is not None:
        return await manifest_response(manifest, variant=version)
    if version == "original":
        raise HTTPException(404, "Esta revisión no conserva un original de cámara separado.")
    try:
        path = resolve_upload_path(revision.archivo_url)
        if not path.is_file():
            raise ValueError("missing")
    except (OSError, ValueError) as exc:
        raise HTTPException(404, "Evidencia anterior no disponible") from exc
    return FileResponse(
        path,
        media_type=mimetypes.guess_type(path.name)[0] or "application/octet-stream",
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": f'inline; filename="evidencia-anterior{path.suffix}"',
        },
    )


@router.get("/calificaciones/{calificacion_id}/revisiones/{revision_id}/evidencia/paginas/{numero}")
async def evidencia_revision_page(
    calificacion_id: UUID,
    revision_id: UUID,
    numero: int = ApiPath(ge=1, le=MAX_EVIDENCE_PAGES),
    evidencia_version: Annotated[str | None, Query(pattern=r"^[a-f0-9]{32}$")] = None,
    version: EvidenceVariant = "preparada",
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    grade, revision = await owned_evidence_revision(db, calificacion_id, revision_id, current_user)
    if version == "original":
        require_original_access(current_user, is_owner_student=False)
    manifest = revision_manifest(grade, revision)
    if manifest is not None:
        return await manifest_response(manifest, variant=version, page_number=numero, requested_version=evidencia_version)
    if version == "original":
        raise HTTPException(404, "Esta revisión no conserva un original de cámara separado.")
    try:
        path = resolve_upload_path(revision.archivo_url)
        rendered, total, fingerprint = await run_in_threadpool(_render_cached_evidence_page, path, numero)
    except EvidencePageError as exc:
        raise HTTPException(404 if exc.not_found else 422, exc.detail) from exc
    except (OSError, ValueError) as exc:
        raise HTTPException(404, "Evidencia anterior no disponible") from exc
    token = evidence_version(grade.entrega_id, fingerprint)
    if evidencia_version is not None and evidencia_version != token:
        raise HTTPException(409, "Esta referencia no corresponde a la evidencia anterior solicitada.")
    return FileResponse(rendered, media_type="image/png", headers={
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
        "X-Evidence-Page": str(numero), "X-Evidence-Pages": str(total), "X-Evidence-Version": token,
    })
