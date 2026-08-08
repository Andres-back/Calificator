"""Router de analítica — dashboard operativo del docente."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_role
from app.db.session import get_db
from app.modules.analytics import service
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(tags=["analytics"])


class EventoCreate(BaseModel):
    tipo: str = Field(..., min_length=1, max_length=60)
    evaluacion_id: UUID | None = None
    calificacion_id: UUID | None = None
    metadata_json: dict = Field(default_factory=dict)


@router.post("/analytics/evento", status_code=201)
async def registrar_evento(
    payload: EventoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Registra un evento fire-and-forget desde el frontend."""
    max_tipo_len = 60
    if len(payload.tipo) > max_tipo_len:
        raise HTTPException(status_code=422, detail=f"tipo no puede exceder {max_tipo_len} caracteres")
    await service.registrar_evento(
        db, tipo=payload.tipo, actor_id=current_user.id,
        evaluacion_id=payload.evaluacion_id,
        calificacion_id=payload.calificacion_id,
        metadata_json=payload.metadata_json,
    )
    return {"status": "ok"}


@router.get("/analytics/overview")
async def analytics_overview(
    materia_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Resumen operativo del dashboard de analítica."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_overview(
        db, profesor_id=current_user.id, materia_id=materia_id,
        fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )


@router.get("/analytics/evaluaciones")
async def analytics_evaluaciones(
    materia_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Lista de evaluaciones con métricas agregadas."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_evaluaciones_list(
        db, profesor_id=current_user.id, materia_id=materia_id,
        fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )


@router.get("/analytics/evaluaciones/{evaluacion_id}")
async def analytics_evaluacion_detalle(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Detalle de una evaluación con distribución de notas."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    result = await service.get_evaluacion_detail(db, evaluacion_id, profesor_id=current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return result


@router.get("/analytics/criterios")
async def analytics_criterios(
    materia_id: UUID | None = Query(None),
    evaluacion_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Rendimiento agregado por criterio de evaluación."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_criterios(
        db, profesor_id=current_user.id, materia_id=materia_id,
        evaluacion_id=evaluacion_id, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )


@router.get("/analytics/preguntas")
async def analytics_preguntas(
    evaluacion_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Rendimiento por pregunta."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_preguntas(
        db, profesor_id=current_user.id, evaluacion_id=evaluacion_id,
        fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )


@router.get("/analytics/estudiantes")
async def analytics_estudiantes(
    materia_id: UUID | None = Query(None),
    evaluacion_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Lista de estudiantes con señales de atención."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_estudiantes(
        db, profesor_id=current_user.id, materia_id=materia_id,
        evaluacion_id=evaluacion_id, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )


@router.get("/analytics/estudiantes/{estudiante_id}")
async def analytics_estudiante_detalle(
    estudiante_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Detalle de un estudiante."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    result = await service.get_estudiante_detalle(db, estudiante_id, profesor_id=current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return result


@router.get("/analytics/sintesis")
async def analytics_sintesis(
    materia_id: UUID | None = Query(None),
    evaluacion_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Síntesis pedagógica determinística del grupo."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_sintesis(
        db, profesor_id=current_user.id, materia_id=materia_id,
        evaluacion_id=evaluacion_id, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )


@router.get("/analytics/export/criterios.csv")
async def export_criterios_csv(
    materia_id: UUID | None = Query(None),
    evaluacion_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exporta criterios a CSV."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    csv_content = await service.export_criterios_csv(
        db, profesor_id=current_user.id, materia_id=materia_id,
        evaluacion_id=evaluacion_id, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=criterios.csv"},
    )


@router.get("/analytics/export/estudiantes.csv")
async def export_estudiantes_csv(
    materia_id: UUID | None = Query(None),
    evaluacion_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exporta estudiantes a CSV."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    csv_content = await service.export_estudiantes_csv(
        db, profesor_id=current_user.id, materia_id=materia_id,
        evaluacion_id=evaluacion_id, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=estudiantes.csv"},
    )


@router.get("/analytics/ai-quality/concordancia")
async def ai_concordancia(
    materia_id: UUID | None = Query(None),
    evaluacion_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Concordancia entre IA y docente: MAE, Kappa, overrides."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_concordancia(
        db, profesor_id=current_user.id, materia_id=materia_id,
        evaluacion_id=evaluacion_id, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )


@router.get("/analytics/ai-quality/latency")
async def ai_latency(
    materia_id: UUID | None = Query(None),
    evaluacion_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Latencia del pipeline (P50, P90, P95) por etapa."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_latency(db, profesor_id=current_user.id, materia_id=materia_id, evaluacion_id=evaluacion_id, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)


@router.get("/analytics/ai-quality/errors")
async def ai_errors(
    materia_id: UUID | None = Query(None),
    evaluacion_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Errores del pipeline: tasa, tipos y alertas de modelo."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_errors(db, profesor_id=current_user.id, materia_id=materia_id, evaluacion_id=evaluacion_id, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)


@router.get("/analytics/ai-quality/confidence")
async def ai_confidence(
    materia_id: UUID | None = Query(None),
    evaluacion_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Distribución de confianza del modelo."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_confidence(db, profesor_id=current_user.id, materia_id=materia_id, evaluacion_id=evaluacion_id, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)


@router.get("/analytics/ai-quality/usage")
async def ai_usage(
    provider: str | None = Query(None),
    model: str | None = Query(None),
    feature: str | None = Query(None),
    stage: str | None = Query(None),
    status: str | None = Query(None),
    evaluacion_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Ledger de llamadas a proveedores de IA (solo admin ve todo, profesor solo suyo)."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    # El profesor solo ve sus evaluaciones; el admin ve todo
    from sqlalchemy import text
    params: dict = {"limit": limit, "offset": offset}
    where = []
    if provider:
        where.append("provider = :provider"); params["provider"] = provider
    if model:
        where.append("model = :model"); params["model"] = model
    if feature:
        where.append("feature = :feature"); params["feature"] = feature
    if stage:
        where.append("stage = :stage"); params["stage"] = stage
    if status:
        where.append("status = :status"); params["status"] = status
    if evaluacion_id:
        where.append("evaluacion_id = :evaluacion_id"); params["evaluacion_id"] = str(evaluacion_id)
    if fecha_desde:
        where.append("created_at >= :fecha_desde"); params["fecha_desde"] = fecha_desde
    if fecha_hasta:
        where.append("created_at <= :fecha_hasta"); params["fecha_hasta"] = fecha_hasta
    where_clause = " AND ".join(where) if where else "TRUE"

    count_sql = text(f"SELECT COUNT(*) FROM ai_usage_events WHERE {where_clause}")
    total = await db.scalar(count_sql, params) or 0

    query_sql = text(f"""
        SELECT id, request_id, feature, stage, provider, model, attempt_number,
               status, latency_ms, input_tokens, output_tokens, image_count, cost,
               error_code, started_at, completed_at
        FROM ai_usage_events
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """)
    rows = await db.execute(query_sql, params)
    eventos = []
    for row in rows:
        eventos.append(dict(row._mapping))
    return {"total": total, "limit": limit, "offset": offset, "eventos": eventos}


@router.get("/analytics/ai-quality/costs")
async def ai_costs(
    materia_id: UUID | None = Query(None),
    evaluacion_id: UUID | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Costos agregados de uso de IA: total, por proveedor, modelo, funcionalidad y serie mensual."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_costs_summary(
        db, profesor_id=current_user.id, materia_id=materia_id,
        evaluacion_id=evaluacion_id, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )


@router.get("/analytics/ai-quality/costs/provider-comparison")
async def ai_costs_provider_comparison(
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Comparación de costos y métricas entre proveedores."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.get_costs_by_provider_comparison(
        db, profesor_id=current_user.id,
        fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )
