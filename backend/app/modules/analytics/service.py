"""Servicio de analítica — consultas desde datos canónicos."""
from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select, case, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.modules.calificaciones.models import Calificacion
from app.modules.evaluaciones.models import Evaluacion
from app.modules.calificaciones.incidencia_models import CalificacionIncidencia
from app.modules.analytics.models import AnalyticsEvento
from app.modules.materias.models import Materia
from app.shared.enums import CalificacionEstado

logger = get_logger(__name__)


def _default_date_range() -> tuple[datetime, datetime]:
    hasta = datetime.utcnow()
    desde = hasta - timedelta(days=30)
    return desde, hasta


async def get_overview(
    db: AsyncSession,
    profesor_id: UUID,
    materia_id: UUID | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> dict:
    """Resumen operativo del dashboard de analítica."""
    desde, hasta = _default_date_range()
    if fecha_desde:
        desde = fecha_desde
    if fecha_hasta:
        hasta = fecha_hasta

    # ── Filtro base: evaluaciones del profesor ──
    eval_filter = [Evaluacion.profesor_id == profesor_id]
    if materia_id:
        eval_filter.append(Evaluacion.materia_id == materia_id)

    # Total evaluaciones activas
    total_evals = await db.scalar(
        select(func.count(Evaluacion.id))
        .where(*eval_filter, Evaluacion.estado.in_(["publicada", "en_calificacion", "pendiente_revision"]))
    )

    # ── Calificaciones ──
    cal_join = Calificacion.evaluacion_id == Evaluacion.id
    cal_filter = [
        Evaluacion.profesor_id == profesor_id,
        Calificacion.created_at >= desde,
        Calificacion.created_at <= hasta,
    ]
    if materia_id:
        cal_filter.append(Evaluacion.materia_id == materia_id)

    # Conteo por estado
    estado_counts = await db.execute(
        select(
            Calificacion.estado,
            func.count(Calificacion.id),
        )
        .join(Evaluacion, cal_join)
        .where(*cal_filter)
        .group_by(Calificacion.estado)
    )
    counts: dict[str, int] = {"sugerida": 0, "confirmada": 0, "ajustada": 0, "publicada": 0, "requiere_revision": 0, "anulada": 0}
    for row in estado_counts:
        counts[row[0]] = row[1]

    total = sum(counts.values())
    pendientes = counts.get("sugerida", 0) + counts.get("requiere_revision", 0)
    confirmadas = counts.get("confirmada", 0) + counts.get("ajustada", 0)
    publicadas = counts.get("publicada", 0)

    # ── IA: tasa de modificación docente ──
    confirmadas_o_ajustadas = counts.get("confirmada", 0) + counts.get("ajustada", 0) + counts.get("publicada", 0)
    ajustadas = counts.get("ajustada", 0)
    tasa_ajustes = ajustadas / confirmadas_o_ajustadas if confirmadas_o_ajustadas > 0 else 0
    coincidencia_exacta = 1 - tasa_ajustes

    # ── Confianza promedio ──
    conf_row = await db.execute(
        select(func.avg(Calificacion.confianza))
        .join(Evaluacion, cal_join)
        .where(*cal_filter, Calificacion.confianza.is_not(None))
    )
    confianza_promedio = float(conf_row.scalar() or 0)

    # ── Tiempo de revisión (desde analytics_eventos) ──
    time_data = await _calculate_review_time(db, profesor_id, desde, hasta, materia_id)

    # ── Incidencias abiertas ──
    inc_filter = [CalificacionIncidencia.estado == "abierta"]
    if materia_id:
        inc_filter.append(CalificacionIncidencia.calificacion_id.in_(
            select(Calificacion.id).join(Evaluacion).where(Evaluacion.materia_id == materia_id)
        ))
    inc_count = await db.scalar(
        select(func.count(CalificacionIncidencia.id)).where(*inc_filter)
    )

    # ── Tiempo ahorrado estimado ──
    # Línea base: 3 min por entrega manual (estimado docente)
    TIEMPO_MANUAL_POR_ENTREGA = 180  # segundos
    tiempo_real = time_data.get("total_segundos", 0)
    tiempo_manual = total * TIEMPO_MANUAL_POR_ENTREGA
    tiempo_ahorrado = max(0, tiempo_manual - tiempo_real)

    return {
        "periodo": {"desde": desde.isoformat(), "hasta": hasta.isoformat()},
        "evaluaciones_activas": total_evals or 0,
        "entregas": {
            "total": total,
            "pendientes_revision": pendientes,
            "confirmadas": confirmadas,
            "publicadas": publicadas,
        },
        "ia": {
            "coincidencia_exacta": round(coincidencia_exacta, 4),
            "tasa_ajustes": round(tasa_ajustes, 4),
            "confianza_promedio": round(confianza_promedio, 4),
            "incidencias_abiertas": inc_count or 0,
        },
        "productividad": {
            "tiempo_revision_segundos": time_data.get("total_segundos", 0),
            "tiempo_promedio_por_entrega": round(time_data.get("promedio_segundos", 0), 1),
            "tiempo_estimado_ahorrado_segundos": tiempo_ahorrado,
            "entregas_con_tiempo": time_data.get("conteo", 0),
        },
    }


async def _calculate_review_time(
    db: AsyncSession,
    profesor_id: UUID,
    desde: datetime,
    hasta: datetime,
    materia_id: UUID | None = None,
) -> dict:
    """Calcula tiempo de revisión desde eventos calificacion_opened → review_completed."""
    # Obtener eventos calificacion_opened con su timestamp
    opened = await db.execute(
        select(AnalyticsEvento.calificacion_id, AnalyticsEvento.created_at)
        .where(
            AnalyticsEvento.tipo == "calificacion_opened",
            AnalyticsEvento.actor_id == profesor_id,
            AnalyticsEvento.created_at >= desde,
            AnalyticsEvento.created_at <= hasta,
        )
        .order_by(AnalyticsEvento.calificacion_id, AnalyticsEvento.created_at)
    )
    opened_rows = opened.all()

    # Obtener review_completed
    completed = await db.execute(
        select(AnalyticsEvento.calificacion_id, AnalyticsEvento.created_at)
        .where(
            AnalyticsEvento.tipo == "calificacion_confirmed",
            AnalyticsEvento.actor_id == profesor_id,
            AnalyticsEvento.created_at >= desde,
            AnalyticsEvento.created_at <= hasta,
        )
        .order_by(AnalyticsEvento.calificacion_id, AnalyticsEvento.created_at)
    )
    completed_map: dict[str, datetime] = {}
    for row in completed:
        cid = str(row.calificacion_id) if row.calificacion_id else ""
        if cid:
            completed_map[cid] = row.created_at

    total_segundos = 0
    conteo = 0
    for row in opened_rows:
        cid = str(row.calificacion_id) if row.calificacion_id else ""
        if cid and cid in completed_map:
            delta = (completed_map[cid] - row.created_at).total_seconds()
            if 10 <= delta <= 3600:  # Ignorar <10s (clicks accidentales) y >1h (pausas)
                total_segundos += delta
                conteo += 1

    promedio = total_segundos / conteo if conteo > 0 else 0
    return {"total_segundos": int(total_segundos), "promedio_segundos": promedio, "conteo": conteo}


async def get_evaluaciones_list(
    db: AsyncSession,
    profesor_id: UUID,
    materia_id: UUID | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> list[dict]:
    """Lista de evaluaciones con métricas agregadas."""
    desde, hasta = _default_date_range()
    if fecha_desde:
        desde = fecha_desde
    if fecha_hasta:
        hasta = fecha_hasta

    eval_filter = [Evaluacion.profesor_id == profesor_id]
    if materia_id:
        eval_filter.append(Evaluacion.materia_id == materia_id)

    evaluaciones = await db.scalars(
        select(Evaluacion).where(*eval_filter).order_by(Evaluacion.created_at.desc())
    )
    result = []
    for ev in evaluaciones:
        cals = await db.scalars(
            select(Calificacion).where(
                Calificacion.evaluacion_id == ev.id,
                Calificacion.created_at >= desde,
                Calificacion.created_at <= hasta,
            )
        )
        cal_list = list(cals)
        total = len(cal_list)
        sugeridas = sum(1 for c in cal_list if c.estado == CalificacionEstado.SUGERIDA.value)
        confirmadas = sum(1 for c in cal_list if c.estado in (CalificacionEstado.CONFIRMADA.value, CalificacionEstado.AJUSTADA.value))
        publicadas = sum(1 for c in cal_list if c.estado == CalificacionEstado.PUBLICADA.value)
        requiere_revision = sum(1 for c in cal_list if c.estado == CalificacionEstado.REQUIERE_REVISION.value)
        notas = [float(c.nota_confirmada or c.nota_sugerida or 0) for c in cal_list if c.nota_confirmada or c.nota_sugerida]
        promedio = sum(notas) / len(notas) if notas else 0
        max_nota = float(ev.nota_maxima)

        result.append({
            "id": str(ev.id),
            "nombre": ev.nombre,
            "materia_id": str(ev.materia_id),
            "estado": ev.estado,
            "modalidad": ev.modalidad,
            "nota_maxima": max_nota,
            "total_entregas": total,
            "pendientes": sugeridas + requiere_revision,
            "confirmadas": confirmadas,
            "publicadas": publicadas,
            "promedio": round(promedio, 2),
            "tasa_aprobacion": round(sum(1 for n in notas if n >= max_nota * 0.6) / len(notas), 4) if notas else 0,
            "created_at": ev.created_at.isoformat() if ev.created_at else None,
        })

    return result


async def get_evaluacion_detail(
    db: AsyncSession,
    evaluacion_id: UUID,
    profesor_id: UUID,
) -> dict | None:
    """Detalle de una evaluación con métricas."""
    ev = await db.scalar(
        select(Evaluacion).where(Evaluacion.id == evaluacion_id, Evaluacion.profesor_id == profesor_id)
    )
    if not ev:
        return None

    cals = await db.scalars(
        select(Calificacion).where(Calificacion.evaluacion_id == evaluacion_id)
    )
    cal_list = list(cals)

    # Distribución de notas
    notas = [
        float(c.nota_confirmada or c.nota_sugerida or 0)
        for c in cal_list if c.nota_confirmada or c.nota_sugerida
    ]
    max_nota = float(ev.nota_maxima)
    rangos = {"0-25%": 0, "25-50%": 0, "50-75%": 0, "75-100%": 0}
    for n in notas:
        pct = (n / max_nota * 100) if max_nota > 0 else 0
        if pct < 25:
            rangos["0-25%"] += 1
        elif pct < 50:
            rangos["25-50%"] += 1
        elif pct < 75:
            rangos["50-75%"] += 1
        else:
            rangos["75-100%"] += 1

    # Últimos eventos
    ultimos_eventos = await db.scalars(
        select(AnalyticsEvento)
        .where(
            AnalyticsEvento.evaluacion_id == evaluacion_id,
            AnalyticsEvento.actor_id == profesor_id,
        )
        .order_by(AnalyticsEvento.created_at.desc())
        .limit(10)
    )

    return {
        "id": str(ev.id),
        "nombre": ev.nombre,
        "materia_id": str(ev.materia_id),
        "estado": ev.estado,
        "modalidad": ev.modalidad,
        "nota_maxima": max_nota,
        "total": len(cal_list),
        "distribucion_notas": rangos,
        "promedio": round(sum(notas) / len(notas), 2) if notas else 0,
        "ultimos_eventos": [
            {"tipo": e.tipo, "created_at": e.created_at.isoformat()}
            for e in ultimos_eventos
        ],
    }
