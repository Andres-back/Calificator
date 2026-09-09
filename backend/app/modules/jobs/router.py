from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.jobs import service as jobs_service
from app.modules.jobs.schemas import (
    JobEstadoRead,
    JobItemsPage,
    JobRead,
    JobRetryRead,
    JobRetryRequest,
    PendingGradingJobsPage,
)
from app.modules.users.models import User
from app.shared.enums import JobEstado, UserRole

router = APIRouter(prefix="/jobs", tags=["jobs"])
_PRIVATE_RESULT_KEYS = {"claim_token", "checkpoint_v1", "_checkpoint_v1"}


def _owner_filter(current_user: User) -> UUID | None:
    return None if current_user.rol == UserRole.ADMIN.value else current_user.id


def _public_result(value: object) -> dict:
    """Oculta estado interno recuperable sin romper campos públicos existentes."""
    if not isinstance(value, dict):
        return {}
    return {
        key: item
        for key, item in value.items()
        if key not in _PRIVATE_RESULT_KEYS and not str(key).startswith("_")
    }


async def _get_job(db: AsyncSession, job_id: UUID, user_id: UUID | None) -> dict:
    row = await db.execute(
        text("SELECT * FROM ai_jobs WHERE id=:id AND (user_id=:u OR :u IS NULL)"),
        {"id": str(job_id), "u": str(user_id) if user_id else None},
    )
    r = row.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return dict(r._mapping)


@router.get("/pendientes", response_model=PendingGradingJobsPage)
async def get_pending_grading_jobs(
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Recupera monitores activos después de recargar o cambiar de dispositivo."""
    # Incluso un administrador recupera únicamente los monitores que inició.
    # La inspección global pertenece a las superficies administrativas auditadas.
    owner_id = current_user.id
    params = {
        "owner_id": str(owner_id),
        "limit": limit,
        "offset": offset,
    }
    where_sql = (
        "job.tipo='calificacion_lote' AND job.parent_job_id IS NULL "
        "AND job.estado IN ('queued','running','retrying') "
        "AND job.user_id=CAST(:owner_id AS uuid)"
    )
    total = await db.scalar(text(f"SELECT COUNT(*) FROM ai_jobs AS job WHERE {where_sql}"), params)
    rows = (
        await db.execute(
            text(
                "SELECT job.id AS job_id, evaluation.id AS evaluacion_id, "
                "evaluation.materia_id, first_delivery.estudiante_id, "
                "COALESCE(first_delivery.estudiante_nombre, '') AS estudiante_nombre, "
                "CASE WHEN COALESCE(children.total, 0) > 1 THEN 'batch' ELSE 'individual' END AS kind, "
                "GREATEST(COALESCE(children.total, 0), 1) AS total, "
                "job.estado, job.progreso, job.stage, "
                "GREATEST(0, EXTRACT(EPOCH FROM (NOW() - job.created_at)) * 1000)::bigint AS elapsed_ms, "
                "job.created_at "
                "FROM ai_jobs AS job "
                "JOIN evaluaciones AS evaluation "
                "ON evaluation.id=(job.input_json->>'evaluacion_id')::uuid "
                "LEFT JOIN LATERAL ("
                " SELECT COUNT(*)::int AS total FROM ai_jobs AS child "
                " WHERE child.parent_job_id=job.id"
                ") AS children ON TRUE "
                "LEFT JOIN LATERAL ("
                " SELECT delivery.estudiante_id, student.nombre AS estudiante_nombre "
                " FROM ai_jobs AS child "
                " JOIN entregas AS delivery ON delivery.id=child.entrega_id "
                " LEFT JOIN users AS student ON student.id=delivery.estudiante_id "
                " WHERE child.parent_job_id=job.id "
                " ORDER BY child.created_at, child.id LIMIT 1"
                ") AS first_delivery ON TRUE "
                f"WHERE {where_sql} "
                "ORDER BY job.created_at DESC, job.id DESC LIMIT :limit OFFSET :offset"
            ),
            params,
        )
    ).mappings().all()
    return {
        "items": [dict(row) for row in rows],
        "total": int(total or 0),
        "limit": limit,
        "offset": offset,
    }


@router.get("/{job_id}", response_model=JobRead)
async def get_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    job = await _get_job(db, job_id, _owner_filter(current_user))
    result = (
        job.get("resultado_json")
        if isinstance(job.get("resultado_json"), dict)
        else {}
    )
    job["resultado_json"] = _public_result(result)
    job["timings_ms"] = result.get("timings_ms", {})
    job["terminal_reason"] = result.get("terminal_reason")
    job["fallbacks"] = result.get("fallbacks", [])
    job["pipeline_run_id"] = result.get("pipeline_run_id")
    job["deadline_ms"] = result.get("deadline_ms")
    job["slow_after_ms"] = result.get("slow_after_ms")
    elapsed = await db.scalar(
        text(
            "SELECT GREATEST(0, EXTRACT(EPOCH FROM "
            "(COALESCE(finished_at, NOW()) - created_at)) * 1000) "
            "FROM ai_jobs WHERE id=CAST(:id AS uuid)"
        ),
        {"id": str(job_id)},
    )
    job["elapsed_ms"] = int(elapsed or 0)
    summary_row = (
        await db.execute(
            text(
                "SELECT COUNT(*) AS total, "
                "COUNT(*) FILTER (WHERE estado='queued') AS queued, "
                "COUNT(*) FILTER (WHERE estado='running') AS running, "
                "COUNT(*) FILTER (WHERE estado='retrying') AS retrying, "
                "COUNT(*) FILTER (WHERE estado='success') AS success, "
                "COUNT(*) FILTER (WHERE estado='requires_review') AS requires_review, "
                "COUNT(*) FILTER (WHERE estado IN ('failed','failed_permanent')) AS failed_permanent, "
                "COUNT(*) FILTER (WHERE estado='cancelled') AS cancelled "
                "FROM ai_jobs WHERE parent_job_id=CAST(:id AS uuid)"
            ),
            {"id": str(job_id)},
        )
    ).mappings().one()
    job["summary"] = (
        {key: int(summary_row[key] or 0) for key in summary_row.keys()}
        if int(summary_row["total"] or 0) > 0
        else None
    )
    return job


@router.get("/{job_id}/estado", response_model=JobEstadoRead)
async def get_estado(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    job = await _get_job(db, job_id, _owner_filter(current_user))
    return {"id": job["id"], "estado": job["estado"], "progreso": job["progreso"], "error": job["error"]}


@router.get("/{job_id}/items", response_model=JobItemsPage)
async def get_job_items(
    job_id: UUID,
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    estado: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _get_job(db, job_id, _owner_filter(current_user))
    allowed_states = {item.value for item in JobEstado}
    if estado is not None and estado not in allowed_states:
        raise HTTPException(status_code=422, detail="Estado de trabajo no valido")
    params = {
        "id": str(job_id),
        "estado": estado,
        "limit": limit,
        "offset": offset,
    }
    total = await db.scalar(
        text(
            "SELECT COUNT(*) FROM ai_jobs "
            "WHERE parent_job_id=CAST(:id AS uuid) "
            "AND (CAST(:estado AS text) IS NULL OR estado=:estado)"
        ),
        params,
    )
    rows = (
        await db.execute(
            text(
                "SELECT job.id AS job_id, job.entrega_id, entrega.estudiante_id, "
                "student.nombre AS estudiante_nombre, "
                "job.estado, job.stage, job.progreso, job.attempt_count, "
                "COALESCE(job.resultado_json->>'terminal_reason', "
                "job.resultado_json->>'error_code') AS error_code, "
                "job.resultado_json->'timings_ms' AS timings_ms, "
                "GREATEST(0, EXTRACT(EPOCH FROM "
                "(COALESCE(job.finished_at, NOW()) - job.created_at)) * 1000)::bigint AS elapsed_ms "
                "FROM ai_jobs AS job "
                "LEFT JOIN entregas AS entrega ON entrega.id=job.entrega_id "
                "LEFT JOIN users AS student ON student.id=entrega.estudiante_id "
                "WHERE job.parent_job_id=CAST(:id AS uuid) "
                "AND (CAST(:estado AS text) IS NULL OR job.estado=:estado) "
                "ORDER BY job.created_at, job.id LIMIT :limit OFFSET :offset"
            ),
            params,
        )
    ).mappings().all()
    return {
        "items": [dict(row) for row in rows],
        "total": int(total or 0),
        "limit": limit,
        "offset": offset,
    }


@router.post(
    "/{job_id}/reintentar",
    response_model=JobRetryRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def retry_job(
    job_id: UUID,
    payload: JobRetryRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    job = await _get_job(db, job_id, _owner_filter(current_user))
    children = (
        await db.execute(
            text(
                "SELECT * FROM ai_jobs WHERE parent_job_id=CAST(:id AS uuid) "
                "ORDER BY created_at, id"
            ),
            {"id": str(job_id)},
        )
    ).mappings().all()
    candidates = [dict(row) for row in children] if children else [job]

    requested_ids = set(payload.job_ids or []) if payload else set()
    available_ids = {UUID(str(row["id"])) for row in candidates}
    if requested_ids and not requested_ids.issubset(available_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uno o mas trabajos no pertenecen a este lote",
        )
    selected = [
        row for row in candidates
        if not requested_ids or UUID(str(row["id"])) in requested_ids
    ]
    retryable = {
        JobEstado.FAILED.value,
        JobEstado.FAILED_PERMANENT.value,
        JobEstado.REQUIRES_REVIEW.value,
    }
    enqueued_rows: list[dict] = []
    for row in selected:
        if row.get("estado") not in retryable:
            continue
        updated = (
            await db.execute(
                text(
                    "UPDATE ai_jobs SET estado=:retrying, progreso=0, "
                    "finished_at=NULL, error=NULL, claim_token=NULL, "
                    "lease_expires_at=NULL, "
                    "resultado_json=(COALESCE(resultado_json, '{}'::jsonb) "
                    "- 'claim_token' - 'terminal_reason') || "
                    "jsonb_build_object('pipeline_status','retrying') "
                    "WHERE id=CAST(:id AS uuid) AND estado IN "
                    "(:failed, :failed_permanent, :requires_review) "
                    "AND (entrega_id IS NULL OR NOT EXISTS ("
                    "SELECT 1 FROM calificaciones WHERE entrega_id=ai_jobs.entrega_id "
                    "AND revisado_por_docente IS TRUE)) RETURNING *"
                ),
                {
                    "id": str(row["id"]),
                    "retrying": JobEstado.RETRYING.value,
                    "failed": JobEstado.FAILED.value,
                    "failed_permanent": JobEstado.FAILED_PERMANENT.value,
                    "requires_review": JobEstado.REQUIRES_REVIEW.value,
                },
            )
        ).mappings().first()
        if not updated:
            continue
        updated_row = dict(updated)
        entrega_id = updated_row.get("entrega_id")
        if entrega_id:
            await db.execute(
                text(
                    "UPDATE entregas SET estado='procesando' "
                    "WHERE id=CAST(:id AS uuid)"
                ),
                {"id": str(entrega_id)},
            )
            await db.execute(
                text(
                    "UPDATE calificaciones SET estado='procesando', "
                    "nota_sugerida=NULL, nota_confirmada=NULL, confianza=NULL, "
                    "resultado_json=COALESCE(resultado_json, '{}'::jsonb) || "
                    "jsonb_build_object('pipeline_status','retrying') "
                    "WHERE entrega_id=CAST(:id AS uuid) "
                    "AND revisado_por_docente IS FALSE"
                ),
                {"id": str(entrega_id)},
            )
        enqueued_rows.append(updated_row)

    if not enqueued_rows:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No hay trabajos fallidos disponibles para reintentar o "
                "la nota ya fue decidida por el docente"
            ),
        )
    parent_ids = {
        UUID(str(row["parent_job_id"]))
        for row in enqueued_rows
        if row.get("parent_job_id")
    }
    if children:
        parent_ids.add(job_id)
    for parent_id in parent_ids:
        await jobs_service.aggregate_parent_job(db, parent_id)
    await db.commit()

    published = 0
    for row in enqueued_rows:
        try:
            if jobs_service.dispatch_persisted_job(row):
                published += 1
        except Exception:  # noqa: BLE001
            await jobs_service.mark_job_retrying(
                db,
                UUID(str(row["id"])),
                error="Publicacion pendiente; se reintentara automaticamente",
            )
    if published < len(enqueued_rows):
        await db.commit()
    return {
        "requested": len(selected),
        "enqueued": len(enqueued_rows),
        "skipped": len(selected) - len(enqueued_rows),
    }


@router.post("/{job_id}/cancelar", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def cancelar_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await db.execute(
        text(
            "UPDATE ai_jobs SET estado='cancelled' "
            "WHERE id=:id AND user_id=:u AND estado IN ('queued','running')"
        ),
        {"id": str(job_id), "u": str(current_user.id)},
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
