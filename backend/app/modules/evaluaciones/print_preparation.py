"""Private deterministic print proposals. No model calls or academic writes."""

import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
import json
from types import SimpleNamespace
from uuid import UUID

from fastapi import HTTPException
from pydantic import Field, model_validator
from sqlalchemy import text

from app.modules.evaluaciones.print_settings import (
    PrintContract,
    PrintSettings,
    validate_print_scope,
)
from app.modules.evaluaciones.visual_schemas import VisualManifest
from app.modules.evaluaciones.document_schemas import EvaluationDocument

JOB_TYPE = "evaluacion_impresion"
TTL = timedelta(hours=24)


class PrintDraft(PrintContract):
    nombre: str | None = Field(default=None, min_length=2, max_length=220)
    descripcion: str | None = Field(default=None, max_length=60_000)
    lectura: str | None = Field(default=None, max_length=60_000)
    preguntas: list[dict] | None = Field(default=None, min_length=1, max_length=500)
    contenido_visual: VisualManifest | None = None
    estructura_documento: EvaluationDocument | None = None

    @model_validator(mode="after")
    def bounded(self):
        if len(self.model_dump_json()) > 300_000:
            raise ValueError(
                "El borrador es demasiado extenso para esta vista. Divide la evaluación."
            )
        return self


class PrintPreparationRequest(PrintContract):
    evaluacion_id: UUID
    expected_updated_at: datetime
    expected_content_version_id: UUID | None = None
    configuracion: PrintSettings
    borrador: PrintDraft | None = None


def _utc(value):
    return (
        value.replace(tzinfo=timezone.utc)
        if value.tzinfo is None
        else value.astimezone(timezone.utc)
    )


def validate_base(evaluation, request):
    if evaluation.contenido_version_id != request.expected_content_version_id or _utc(
        evaluation.updated_at
    ) != _utc(request.expected_updated_at):
        raise HTTPException(
            409,
            "La evaluación cambió. Conservamos tu edición; abre su versión actual para preparar la impresión.",
        )


def fingerprint(owner, request):
    return hashlib.sha256(
        json.dumps(
            {"owner": str(owner), "request": request.model_dump(mode="json")},
            sort_keys=True,
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode()
    ).hexdigest()


def candidates(settings):
    """At most four candidates; explicit per-question spaces and materials survive."""
    result = [settings]
    if settings.meta_paginas is not None:
        for mode, font in [("media", None), ("compacta", None), ("compacta", 10)]:
            candidate = settings.model_copy(
                deep=True, update={"distribucion": mode, "fuente_pt": font}
            )
            if candidate not in result:
                result.append(candidate)
    return result[:4]


async def authorize(db, user, request):
    from app.core.permissions import require_permission_now
    from app.modules.evaluaciones.service import ensure_can_manage_evaluation

    require_permission_now(user, "evaluations.update")
    evaluation = await ensure_can_manage_evaluation(db, request.evaluacion_id, user)
    validate_base(evaluation, request)
    if evaluation.material_origen_id:
        raise HTTPException(422, "Este material se prepara desde su recurso original.")
    return evaluation


async def material_for_request(db, evaluation, request):
    from app.modules.evaluaciones.export_service import build_evaluation_material
    from app.modules.evaluaciones.models import EvaluacionRecurso
    from app.modules.evaluaciones.visual_render import (
        ResolvedVisualBlock,
        render_structured_visual,
        resolve_visual_material,
    )
    from app.modules.evaluaciones.visual_service import (
        get_content_revision,
        read_resource_bytes,
    )

    revision = (
        await get_content_revision(db, evaluation.id, evaluation.contenido_version_id)
        if evaluation.contenido_version_id
        else None
    )
    snapshot = (
        deepcopy(revision.snapshot_json)
        if revision
        else {
            "nombre": evaluation.nombre,
            "descripcion": evaluation.descripcion,
            "preguntas": deepcopy(evaluation.preguntas),
            "respuestas_esperadas": [],
            "nota_maxima": evaluation.nota_maxima,
            "blueprint": evaluation.blueprint,
            **({'estructura_documento': evaluation.estructura_documento}
               if getattr(evaluation, 'estructura_documento', None) is not None else {}),
        }
    )
    blocks = []
    if request.borrador is None:
        if revision:
            blocks = await resolve_visual_material(db, evaluation.id, revision)
    else:
        draft = request.borrador.model_dump(mode="json", exclude_unset=True)
        snapshot.update(draft)
        if "lectura" in draft:
            snapshot["blueprint"] = {"reglas_feedback": {"lectura": draft["lectura"]}}
        raw = snapshot.get("contenido_visual")
        if raw:
            manifest = VisualManifest.model_validate(raw)
            if manifest.cobertura.estado != "completa":
                raise ValueError(
                    "Revisa las figuras pendientes antes de preparar la impresión completa."
                )
            for block in sorted(manifest.bloques, key=lambda value: value.orden):
                if block.seguridad_contenido == "privado_original":
                    continue
                data = None
                if block.recurso_id:
                    resource = await db.get(EvaluacionRecurso, block.recurso_id)
                    # A draft may use a staged figure for this evaluation, but
                    # never attaches, publishes or changes its original bytes.
                    if (
                        resource is None
                        or resource.propietario_id != evaluation.profesor_id
                        or resource.materia_id != evaluation.materia_id
                        or resource.evaluacion_id != evaluation.id
                        or resource.estado not in {"staged", "ready"}
                        or resource.clase in {"original", "pagina"}
                        or resource.seguridad_contenido == "privado_original"
                    ):
                        raise ValueError(
                            "El material no está disponible en esta evaluación. Conservamos tu borrador."
                        )
                    data = await read_resource_bytes(resource)
                    if (
                        block.tabla or block.grafica
                    ) and data != await asyncio.to_thread(
                        render_structured_visual, block.tabla or block.grafica
                    ):
                        raise ValueError(
                            "Los datos no coinciden con la figura. Revisa el material."
                        )
                blocks.append(ResolvedVisualBlock(block, data))
    manifest = snapshot.get("contenido_visual")
    validate_print_scope(
        request.configuracion, snapshot.get("preguntas") or [], manifest
    )
    snapshot["configuracion_impresion"] = request.configuracion.model_dump(mode="json")
    snapshot.setdefault("respuestas_esperadas", [])
    source = SimpleNamespace(**snapshot, created_at=evaluation.created_at)
    return build_evaluation_material(source, soluciones=False, visual_blocks=blocks)


async def create_preparation(db, user, request):
    from app.modules.jobs import service as jobs

    evaluation = await authorize(db, user, request)
    # Validate before creating a durable job; this does not render or save content.
    await material_for_request(db, evaluation, request)
    key = fingerprint(user.id, request)
    await db.execute(
        text("SELECT pg_advisory_xact_lock(:key)"), {"key": int(key[:15], 16)}
    )
    existing = await db.scalar(
        text(
            "SELECT id FROM ai_jobs WHERE user_id=:owner AND tipo=:tipo "
            "AND input_json->>'_print_fingerprint'=:key AND created_at>NOW()-INTERVAL '24 hours' "
            "AND estado IN ('queued','running','retrying','success') ORDER BY created_at DESC LIMIT 1"
        ),
        {"owner": user.id, "tipo": JOB_TYPE, "key": key},
    )
    if existing:
        await db.commit()
        return {"job_id": existing}
    job_id = await jobs.create_job(
        db,
        user_id=user.id,
        tipo=JOB_TYPE,
        input_json={
            "request": request.model_dump(mode="json"),
            "_print_fingerprint": key,
        },
    )
    await db.commit()
    try:
        jobs.dispatch_persisted_job(
            {
                "id": job_id,
                "tipo": JOB_TYPE,
                "user_id": user.id,
                "input_json": {"request": {}},
            }
        )
    except Exception:
        await jobs.mark_job_retrying(
            db,
            job_id,
            error="La preparación está guardada y se iniciará en segundo plano.",
        )
        await db.commit()
    return {"job_id": job_id}


async def reserve_render(db, job_id, token):
    """Durable budget shared across duplicate deliveries, crashes and recovery."""
    value = await db.scalar(
        text(
            "UPDATE ai_jobs SET resultado_json=jsonb_set(COALESCE(resultado_json,'{}'::jsonb), "
            "'{_print_renders}', to_jsonb(COALESCE((resultado_json->>'_print_renders')::int,0)+1)) "
            "WHERE id=:id AND estado='running' AND claim_token=:token "
            "AND COALESCE((resultado_json->>'_print_renders')::int,0)<4 RETURNING id"
        ),
        {"id": job_id, "token": token},
    )
    await db.commit()
    if value is None:
        raise ValueError(
            "La preparación se interrumpió. Conservamos tus ajustes; puedes iniciar una nueva vista."
        )


def render_candidate(material):
    from app.modules.herramientas.pdf_render import render_material_pdf
    import fitz

    data = render_material_pdf(material, soluciones=False)
    with fitz.open(stream=data, filetype='pdf') as document:
        return data, len(document)


async def prepare_job(db, job_id, token):
    from app.modules.jobs import service as jobs
    from app.modules.users.models import User
    from app.modules.authorization.service import effective_permissions
    from app.modules.evaluaciones.print_layout import prepare_print_material
    from app.services.storage_service import (
        save_private_upload,
        resolve_private_upload_path,
    )

    row = (
        (
            await db.execute(
                text(
                    "SELECT user_id, created_at, input_json FROM ai_jobs WHERE id=:id"
                ),
                {"id": job_id},
            )
        )
        .mappings()
        .one()
    )
    if _utc(row["created_at"]) + TTL <= datetime.now(timezone.utc):
        raise ValueError(
            "Esta preparación venció. Puedes preparar otra sin cambiar tu evaluación."
        )
    user = await db.get(User, row["user_id"])
    if user is None or user.estado != "activo":
        raise ValueError("La cuenta no está disponible para preparar este documento.")
    user._effective_permissions = await effective_permissions(db, user)
    request = PrintPreparationRequest.model_validate(row["input_json"]["request"])
    evaluation = await authorize(db, user, request)
    material = await material_for_request(db, evaluation, request)
    best = None
    for candidate in candidates(request.configuracion):
        await reserve_render(db, job_id, token)
        current = deepcopy(material)
        current["contenido_json"]["configuracion_impresion"] = candidate.model_dump(
            mode="json"
        )
        data, pages = await asyncio.to_thread(render_candidate, current)
        warnings = prepare_print_material(current)["contenido_json"].get(
            "advertencias_impresion", []
        )
        if best is None or pages < best[1]:
            best = (data, pages, candidate, warnings)
        if (
            request.configuracion.meta_paginas is None
            or pages <= request.configuracion.meta_paginas
        ):
            break
    await jobs.lock_owned_job(db, job_id, token)
    # Recheck after rendering: neither a stale result nor late cancellation is served.
    db.expire(evaluation)
    evaluation = await authorize(db, user, request)
    data, pages, candidate, warnings = best
    key = await save_private_upload(data, "application/pdf", subfolder="impresion")
    try:
        await jobs.lock_owned_job(db, job_id, token)
        reached = (
            request.configuracion.meta_paginas is None
            or pages <= request.configuracion.meta_paginas
        )
        if not reached:
            warnings.append(
                f"Con estos espacios necesita {pages} páginas. No quitamos preguntas ni figuras para alcanzar la meta."
            )
        result = {
            "claim_token": token,
            "_file_key": key,
            "configuracion": candidate.model_dump(mode="json"),
            "paginas_reales": pages,
            "meta_alcanzada": reached,
            "advertencias": list(dict.fromkeys(warnings)),
            "mensaje": "Vista lista. Todavía no se ha guardado este formato.",
            "expires_at": (_utc(row["created_at"]) + TTL).isoformat(),
        }
        await jobs.finish_job(db, job_id, estado="success", resultado_json=result)
        await db.commit()
    except BaseException:
        resolve_private_upload_path(key).unlink(missing_ok=True)
        raise
    return {"status": "success"}


async def download_preparation(db, user, job_id):
    from app.services.storage_service import resolve_private_upload_path

    row = (
        (
            await db.execute(
                text(
                    "SELECT * FROM ai_jobs WHERE id=:id AND user_id=:owner AND tipo=:tipo"
                ),
                {"id": job_id, "owner": user.id, "tipo": JOB_TYPE},
            )
        )
        .mappings()
        .first()
    )
    if row is None:
        raise HTTPException(404, "Documento no disponible")
    request = PrintPreparationRequest.model_validate(row["input_json"]["request"])
    await authorize(db, user, request)
    if _utc(row["created_at"]) + TTL <= datetime.now(timezone.utc):
        raise HTTPException(
            410, "Esta vista venció. Prepara otra con tus ajustes actuales."
        )
    if row["estado"] != "success" or not row["resultado_json"].get("_file_key"):
        raise HTTPException(409, "La vista todavía no está disponible.")
    path = resolve_private_upload_path(row["resultado_json"]["_file_key"])
    if not path.is_file():
        raise HTTPException(
            410, "Esta vista ya no está disponible. Puedes preparar otra."
        )
    return await asyncio.to_thread(path.read_bytes)


async def cleanup(db):
    from app.services.storage_service import resolve_private_upload_path

    rows = (
        (
            await db.execute(
                text(
                    "SELECT id,resultado_json->>'_file_key' AS key FROM ai_jobs "
                    "WHERE tipo=:tipo AND created_at<NOW()-INTERVAL '24 hours' "
                    "AND resultado_json ? '_file_key' LIMIT 100 FOR UPDATE SKIP LOCKED"
                ),
                {"tipo": JOB_TYPE},
            )
        )
        .mappings()
        .all()
    )
    for row in rows:
        resolve_private_upload_path(row["key"]).unlink(missing_ok=True)
        await db.execute(
            text(
                "UPDATE ai_jobs SET resultado_json=resultado_json-'_file_key' WHERE id=:id"
            ),
            {"id": row["id"]},
        )
    # A hard worker exit between file creation and result commit can leave an
    # orphan. Only this private, UUID-named PDF directory is swept, never uploads.
    from itertools import islice
    import re

    folder = resolve_private_upload_path('.private/impresion')
    cutoff = (datetime.now(timezone.utc) - TTL).timestamp()
    if folder.is_dir():
        for candidate in islice(folder.iterdir(), 1000):
            if re.fullmatch(r'[0-9a-f]{32}\.pdf', candidate.name):
                path = resolve_private_upload_path('.private/impresion/' + candidate.name)
                if path.is_file() and path.stat().st_mtime < cutoff:
                    path.unlink(missing_ok=True)
    return len(rows)
