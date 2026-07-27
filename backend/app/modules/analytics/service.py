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


# ── 2B: Rendimiento pedagógico ──────────────────────────────────────────────────


async def get_criterios(
    db: AsyncSession,
    profesor_id: UUID,
    materia_id: UUID | None = None,
    evaluacion_id: UUID | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> list[dict]:
    """Rendimiento agregado por criterio de evaluación."""
    desde, hasta = _default_date_range()
    if fecha_desde: desde = fecha_desde
    if fecha_hasta: hasta = fecha_hasta

    cal_filter = [Calificacion.revisado_por_docente == True, Calificacion.created_at >= desde, Calificacion.created_at <= hasta]
    if evaluacion_id:
        cal_filter.append(Calificacion.evaluacion_id == evaluacion_id)
    else:
        cal_filter.append(Evaluacion.profesor_id == profesor_id)
        if materia_id:
            cal_filter.append(Evaluacion.materia_id == materia_id)

    query = select(Calificacion.resultado_json, Evaluacion.nota_maxima).join(Evaluacion, Calificacion.evaluacion_id == Evaluacion.id).where(*cal_filter)
    rows = await db.execute(query)
    db_rows = rows.all()

    # Extraer criterios del JSONB
    criterios_map: dict[str, dict] = {}
    total_estudiantes = len(db_rows)
    for row in db_rows:
        rj = row[0] if isinstance(row, tuple) else row.resultado_json
        if not rj:
            continue
        grader_a = rj.get("grader_a", {}) if isinstance(rj, dict) else {}
        criterios = grader_a.get("criterios", []) if isinstance(grader_a, dict) else []
        for crit in criterios:
            nombre = str(crit.get("nombre", ""))

            # Normalizar puntajes a escala 0-5
            puntaje = float(crit.get("puntaje", 0))
            maximo = float(crit.get("maximo", 1))
            if maximo > 0:
                pct = (puntaje / maximo) * 100
            else:
                pct = 0

            if nombre not in criterios_map:
                criterios_map[nombre] = {
                    "nombre": nombre,
                    "suma_pct": 0.0,
                    "conteo": 0,
                    "est_dificultad": 0,
                    "puntaje_maximo_total": 0.0,
                }
            criterios_map[nombre]["suma_pct"] += pct
            criterios_map[nombre]["conteo"] += 1
            criterios_map[nombre]["puntaje_maximo_total"] += maximo
            if pct < 60:
                criterios_map[nombre]["est_dificultad"] += 1

    result = []
    for nombre, data in sorted(criterios_map.items()):
        pct_promedio = data["suma_pct"] / data["conteo"] if data["conteo"] > 0 else 0
        nivel = "dominado" if pct_promedio >= 80 else ("en_desarrollo" if pct_promedio >= 60 else "requiere_refuerzo")
        result.append({
            "nombre": nombre,
            "porcentaje_logro": round(pct_promedio, 1),
            "estudiantes_evaluados": data["conteo"],
            "estudiantes_con_dificultad": data["est_dificultad"],
            "nivel_atencion": nivel,
        })

    return sorted(result, key=lambda r: r["porcentaje_logro"])


async def get_preguntas(
    db: AsyncSession,
    profesor_id: UUID,
    evaluacion_id: UUID | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> list[dict]:
    """Rendimiento por pregunta (desde preguntas de la evaluación)."""
    desde, hasta = _default_date_range()
    if fecha_desde: desde = fecha_desde
    if fecha_hasta: hasta = fecha_hasta

    eval_filter = [Evaluacion.profesor_id == profesor_id]
    if evaluacion_id:
        eval_filter = [Evaluacion.id == evaluacion_id]

    evals = await db.scalars(select(Evaluacion).where(*eval_filter))
    result = []
    for ev in evals:
        preguntas = ev.preguntas or []
        if not preguntas:
            continue
        cals = await db.scalars(
            select(Calificacion).where(
                Calificacion.evaluacion_id == ev.id,
                Calificacion.revisado_por_docente == True,
                Calificacion.created_at >= desde,
                Calificacion.created_at <= hasta,
            )
        )
        cal_list = list(cals)
        total_cals = len(cal_list)
        for i, pregunta in enumerate(preguntas):
            texto = str(pregunta.get("texto", pregunta.get("enunciado", f"Pregunta {i + 1}")))[:120]
            tipo = str(pregunta.get("tipo", ""))
            puntaje_max = float(pregunta.get("puntaje", pregunta.get("valor", 1)))
            result.append({
                "evaluacion_nombre": ev.nombre,
                "evaluacion_id": str(ev.id),
                "indice": i,
                "texto": texto,
                "tipo": tipo,
                "puntaje_maximo": puntaje_max,
                "total_respuestas": total_cals,
            })

    return result


async def get_estudiantes(
    db: AsyncSession,
    profesor_id: UUID,
    materia_id: UUID | None = None,
    evaluacion_id: UUID | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> list[dict]:
    """Lista de estudiantes con indicadores de atención."""
    desde, hasta = _default_date_range()
    if fecha_desde: desde = fecha_desde
    if fecha_hasta: hasta = fecha_hasta

    cal_filter = [
        Calificacion.revisado_por_docente == True,
        Calificacion.created_at >= desde,
        Calificacion.created_at <= hasta,
    ]
    if evaluacion_id:
        cal_filter.append(Calificacion.evaluacion_id == evaluacion_id)
    else:
        cal_filter.append(Evaluacion.profesor_id == profesor_id)
        if materia_id:
            cal_filter.append(Evaluacion.materia_id == materia_id)

    rows = await db.execute(
        select(
            Calificacion.estudiante_id,
            Calificacion.nota_confirmada,
            Calificacion.nota_sugerida,
            Calificacion.estado,
            Evaluacion.nota_maxima,
        )
        .join(Evaluacion, Calificacion.evaluacion_id == Evaluacion.id)
        .where(*cal_filter)
    )

    from collections import defaultdict
    est_map: dict[str, dict] = defaultdict(lambda: {"suma": 0.0, "conteo": 0, "pendientes": 0, "bajo": 0, "notas_brutas": []})

    for row in rows:
        eid = str(row.estudiante_id)
        nota = float(row.nota_confirmada or row.nota_sugerida or 0)
        max_n = float(row.nota_maxima or 5)
        pct = (nota / max_n * 100) if max_n > 0 else 0
        est_map[eid]["suma"] += pct
        est_map[eid]["conteo"] += 1
        est_map[eid]["notas_brutas"].append(nota)
        if pct < 60:
            est_map[eid]["bajo"] += 1
        if row.estado in ("sugerida", "requiere_revision"):
            est_map[eid]["pendientes"] += 1

    # Obtener nombres de estudiantes
    from app.modules.users.models import User
    uids = [UUID(eid) for eid in est_map]
    users = {}
    if uids:
        user_rows = await db.execute(select(User.id, User.nombre, User.email).where(User.id.in_(uids)))
        for urow in user_rows:
            users[str(urow.id)] = {"nombre": urow.nombre, "email": urow.email}

    result = []
    for eid, data in est_map.items():
        promedio = data["suma"] / data["conteo"] if data["conteo"] > 0 else 0
        senales = []
        if promedio < 60 and data["conteo"] >= 2:
            senales.append("bajo_desempeno_recurrente")
        if data["pendientes"] > 0:
            senales.append("entregas_pendientes")
        if data["bajo"] == data["conteo"] and data["conteo"] >= 2:
            senales.append("dificultad_generalizada")
        u = users.get(eid, {})
        nivel = "atencion" if promedio < 60 else ("seguimiento" if promedio < 75 else "estable")
        result.append({
            "estudiante_id": eid,
            "nombre": u.get("nombre", ""),
            "email": u.get("email", ""),
            "promedio_pct": round(promedio, 1),
            "total_evaluaciones": data["conteo"],
            "pendientes": data["pendientes"],
            "bajo_rendimiento": data["bajo"],
            "senales": senales,
            "nivel_atencion": nivel,
        })

    return sorted(result, key=lambda r: r["promedio_pct"])


async def get_estudiante_detalle(
    db: AsyncSession,
    estudiante_id: UUID,
    profesor_id: UUID,
) -> dict | None:
    """Detalle de un estudiante con sus evaluaciones y criterios."""
    cal_filter = [
        Calificacion.estudiante_id == estudiante_id,
        Calificacion.revisado_por_docente == True,
        Evaluacion.profesor_id == profesor_id,
    ]
    rows = await db.execute(
        select(Calificacion, Evaluacion.nombre, Evaluacion.nota_maxima)
        .join(Evaluacion, Calificacion.evaluacion_id == Evaluacion.id)
        .where(*cal_filter)
        .order_by(Calificacion.created_at.desc())
    )

    evaluaciones = []
    criterios_acum: dict[str, dict] = {}
    for row in rows:
        cal = row[0] if isinstance(row, tuple) else row.Calificacion
        ev_nombre = row.nombre if hasattr(row, 'nombre') else row[1]
        ev_max = float(row.nota_maxima) if hasattr(row, 'nota_maxima') else float(row[2] or 5)
        nota = float(cal.nota_confirmada or cal.nota_sugerida or 0)

        evaluaciones.append({
            "evaluacion_id": str(cal.evaluacion_id),
            "nombre": ev_nombre,
            "nota": nota,
            "nota_maxima": ev_max,
            "porcentaje": round((nota / ev_max * 100) if ev_max > 0 else 0, 1),
            "estado": cal.estado,
            "fecha": cal.created_at.isoformat() if cal.created_at else None,
        })

        # Extraer criterios
        rj = cal.resultado_json or {}
        grader_a = rj.get("grader_a", {}) if isinstance(rj, dict) else {}
        for crit in grader_a.get("criterios", []):
            nombre = str(crit.get("nombre", ""))
            pct = (float(crit.get("puntaje", 0)) / float(crit.get("maximo", 1)) * 100) if float(crit.get("maximo", 1)) > 0 else 0
            if nombre not in criterios_acum:
                criterios_acum[nombre] = {"suma": 0.0, "conteo": 0}
            criterios_acum[nombre]["suma"] += pct
            criterios_acum[nombre]["conteo"] += 1

    criterios_res = [
        {"nombre": nombre, "promedio_pct": round(data["suma"] / data["conteo"], 1)}
        for nombre, data in sorted(criterios_acum.items(), key=lambda x: x[1]["suma"] / x[1]["conteo"])
    ]

    notas = [e["porcentaje"] for e in evaluaciones]
    promedio = sum(notas) / len(notas) if notas else 0
    tendencia = "mejora" if len(notas) >= 2 and notas[-1] > notas[0] else ("descenso" if len(notas) >= 2 and notas[-1] < notas[0] else "estable")

    return {
        "estudiante_id": str(estudiante_id),
        "promedio_general": round(promedio, 1),
        "total_evaluaciones": len(evaluaciones),
        "tendencia": tendencia,
        "evaluaciones": evaluaciones,
        "criterios": criterios_res,
    }


# ── 2C.1: Concordancia docente–IA ──────────────────────────────────────────────


def _kappa_simple(observed: list[int], expected: list[int], categories: list[int]) -> float:
    """Cohen's Kappa simple."""
    n = len(observed)
    if n == 0:
        return 0.0
    k = len(categories)
    # Matriz de confusión
    matrix = [[0] * k for _ in range(k)]
    cat_idx = {c: i for i, c in enumerate(categories)}
    for o, e in zip(observed, expected, strict=True):
        matrix[cat_idx[o]][cat_idx[e]] += 1
    # Proporción observada
    po = sum(matrix[i][i] for i in range(k)) / n
    # Proporción esperada
    row_totals = [sum(matrix[i]) for i in range(k)]
    col_totals = [sum(matrix[j][i] for j in range(k)) for i in range(k)]
    pe = sum(row_totals[i] * col_totals[i] for i in range(k)) / (n * n)
    if pe >= 1:
        return 1.0
    return (po - pe) / (1 - pe) if (1 - pe) != 0 else 0.0


def _kappa_weighted(observed: list[int], expected: list[int], categories: list[int]) -> float:
    """Cohen's Kappa ponderado con pesos cuadráticos."""
    n = len(observed)
    if n == 0:
        return 0.0
    k = len(categories)
    matrix = [[0] * k for _ in range(k)]
    cat_idx = {c: i for i, c in enumerate(categories)}
    for o, e in zip(observed, expected, strict=True):
        matrix[cat_idx[o]][cat_idx[e]] += 1
    # Pesos cuadráticos
    weights = [[1.0 - ((i - j) ** 2) / ((k - 1) ** 2) for j in range(k)] for i in range(k)]
    po_num = sum(weights[i][j] * matrix[i][j] for i in range(k) for j in range(k))
    po = po_num / n
    row_totals = [sum(matrix[i]) for i in range(k)]
    col_totals = [sum(matrix[j][i] for j in range(k)) for i in range(k)]
    pe_num = sum(weights[i][j] * row_totals[i] * col_totals[j] / n for i in range(k) for j in range(k))
    pe = pe_num / n
    if pe >= 1:
        return 1.0
    return (po - pe) / (1 - pe) if (1 - pe) != 0 else 0.0


async def get_concordancia(
    db: AsyncSession,
    profesor_id: UUID,
    materia_id: UUID | None = None,
    evaluacion_id: UUID | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> dict:
    """Analiza concordancia entre nota sugerida por IA y nota confirmada por docente."""
    desde, hasta = _default_date_range()
    if fecha_desde: desde = fecha_desde
    if fecha_hasta: hasta = fecha_hasta

    cal_filter = [
        Calificacion.nota_sugerida.is_not(None),
        Calificacion.nota_confirmada.is_not(None),
        Calificacion.revisado_por_docente == True,
        Calificacion.created_at >= desde,
        Calificacion.created_at <= hasta,
        Evaluacion.profesor_id == profesor_id,
    ]
    if materia_id:
        cal_filter.append(Evaluacion.materia_id == materia_id)
    if evaluacion_id:
        cal_filter.append(Calificacion.evaluacion_id == evaluacion_id)

    rows = await db.execute(
        select(
            Calificacion.nota_sugerida, Calificacion.nota_confirmada,
            Evaluacion.nota_maxima, Calificacion.evaluacion_id, Evaluacion.nombre,
            Calificacion.confianza, Calificacion.estado,
        )
        .join(Evaluacion, Calificacion.evaluacion_id == Evaluacion.id)
        .where(*cal_filter)
    )

    diferencias: list[float] = []
    dentro_tolerancia = 0
    override_up = 0
    override_down = 0
    exactos = 0
    total = 0
    por_evaluacion: dict[str, dict] = {}
    orig_cats: list[int] = []
    final_cats: list[int] = []

    # Categorías para Kappa (escala 0-5)
    CATEGORIAS = [0, 1, 2, 3, 4, 5]

    for row in rows:
        sug = float(row.nota_sugerida or 0)
        conf = float(row.nota_confirmada or 0)
        max_n = float(row.nota_maxima or 5)

        # Normalizar a escala 0-5
        sug_norm = (sug / max_n * 5) if max_n > 0 else 0
        conf_norm = (conf / max_n * 5) if max_n > 0 else 0

        diff = abs(conf_norm - sug_norm)
        diferencias.append(diff)
        total += 1

        # Tolerancia ±0.2 en escala 0-5
        if diff <= 0.2:
            dentro_tolerancia += 1

        if conf_norm == sug_norm:
            exactos += 1
        elif conf_norm > sug_norm:
            override_up += 1
        else:
            override_down += 1

        # Categorizar para Kappa
        orig_cat = min(int(sug_norm), 5)
        final_cat = min(int(conf_norm), 5)
        orig_cats.append(orig_cat)
        final_cats.append(final_cat)

        # Por evaluación
        ev_id = str(row.evaluacion_id)
        if ev_id not in por_evaluacion:
            por_evaluacion[ev_id] = {"nombre": row.nombre or "", "total": 0, "exactos": 0, "suma_diff": 0.0, "conf_posibles": []}
        por_evaluacion[ev_id]["total"] += 1
        por_evaluacion[ev_id]["exactos"] += 1 if conf_norm == sug_norm else 0
        por_evaluacion[ev_id]["suma_diff"] += diff

    # Kappa
    kappa_simple = _kappa_simple(orig_cats, final_cats, CATEGORIAS)
    kappa_weighted = _kappa_weighted(orig_cats, final_cats, CATEGORIAS)

    mae = sum(diferencias) / total if total > 0 else 0
    coincidencia_exacta = exactos / total if total > 0 else 0
    tolerancia_pct = dentro_tolerancia / total if total > 0 else 0

    ev_list = [
        {
            "evaluacion_id": eid,
            "nombre": data["nombre"],
            "total": data["total"],
            "coincidencia_exacta": round(data["exactos"] / data["total"], 4) if data["total"] > 0 else 0,
            "mae": round(data["suma_diff"] / data["total"], 4) if data["total"] > 0 else 0,
        }
        for eid, data in sorted(por_evaluacion.items(), key=lambda x: x[1]["suma_diff"] / max(x[1]["total"], 1), reverse=True)
    ]

    return {
        "total_calificaciones": total,
        "coincidencia_exacta": round(coincidencia_exacta, 4),
        "coincidencia_tolerancia": round(tolerancia_pct, 4),
        "mae_normalizado": round(mae, 4),
        "overrides": {
            "sin_cambio": exactos,
            "aumentadas": override_up,
            "disminuidas": override_down,
        },
        "kappa": {
            "simple": round(kappa_simple, 4),
            "ponderado": round(kappa_weighted, 4),
            "categorias": CATEGORIAS,
            "muestra": total,
        },
        "por_evaluacion": ev_list,
    }


async def get_sintesis(
    db: AsyncSession,
    profesor_id: UUID,
    materia_id: UUID | None = None,
    evaluacion_id: UUID | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    umbral_min_estudiantes: int = 5,
) -> dict:
    """Síntesis determinística: fortalezas, dificultades y alertas."""
    desde, hasta = _default_date_range()
    if fecha_desde: desde = fecha_desde
    if fecha_hasta: hasta = fecha_hasta

    # Reutilizar get_criterios para los datos subyacentes
    criterios = await get_criterios(db, profesor_id, materia_id, evaluacion_id, desde, hasta)

    # Contar calificaciones y evaluaciones
    eval_filter = [Evaluacion.profesor_id == profesor_id]
    if materia_id:
        eval_filter.append(Evaluacion.materia_id == materia_id)
    total_evals = await db.scalar(select(func.count(Evaluacion.id)).where(*eval_filter))

    cal_filter = [Calificacion.revisado_por_docente == True, Evaluacion.profesor_id == profesor_id]
    if materia_id:
        cal_filter.append(Evaluacion.materia_id == materia_id)
    if evaluacion_id:
        cal_filter.append(Calificacion.evaluacion_id == evaluacion_id)
    total_cals = await db.scalar(
        select(func.count(Calificacion.id)).join(Evaluacion, Calificacion.evaluacion_id == Evaluacion.id).where(*cal_filter)
    )

    # Contar estudiantes únicos
    est_rows = await db.execute(
        select(func.count(func.distinct(Calificacion.estudiante_id)))
        .join(Evaluacion, Calificacion.evaluacion_id == Evaluacion.id)
        .where(*cal_filter)
    )
    total_est = est_rows.scalar() or 0

    fortalezas = []
    dificultades = []
    alertas = []

    for c in criterios:
        item = {
            "tipo": "criterio",
            "titulo": c["nombre"],
            "porcentaje_logro": c["porcentaje_logro"],
            "evidencia": {
                "estudiantes_evaluados": c["estudiantes_evaluados"],
                "estudiantes_con_dificultad": c["estudiantes_con_dificultad"],
            },
        }
        if c["porcentaje_logro"] >= 80 and c["estudiantes_evaluados"] >= umbral_min_estudiantes:
            fortalezas.append({**item, "nivel": "dominado"})
        elif c["porcentaje_logro"] < 60:
            if c["estudiantes_evaluados"] < umbral_min_estudiantes:
                alertas.append({
                    "tipo": "datos_insuficientes",
                    "mensaje": f"El criterio '{c['nombre']}' tiene solo {c['estudiantes_evaluados']} estudiante(s) evaluados. Los resultados pueden no ser representativos.",
                })
            else:
                dificultades.append({**item, "nivel": "requiere_refuerzo"})
        elif c["porcentaje_logro"] < 80 and c["estudiantes_evaluados"] >= umbral_min_estudiantes:
            item["nivel"] = "en_desarrollo"
            # No agregar a dificultades si está ≥ 60, es "en desarrollo"

    # Alerta general si hay pocos datos
    if total_est < umbral_min_estudiantes:
        alertas.insert(0, {
            "tipo": "datos_insuficientes",
            "mensaje": f"La síntesis se basa en solo {total_est} estudiante(s). Los resultados pueden no ser representativos del grupo.",
        })

    return {
        "contexto": {
            "evaluaciones_analizadas": total_evals or 0,
            "estudiantes_analizados": total_est,
            "calificaciones_analizadas": total_cals or 0,
        },
        "fortalezas": fortalezas,
        "dificultades": dificultades,
        "alertas": alertas,
    }


def _csv_escape(value: str) -> str:
    """Escapa un valor para CSV compatible con Excel."""
    if "," in value or '"' in value or "\n" in value:
        return '"' + value.replace('"', '""') + '"'
    return value


async def export_criterios_csv(
    db: AsyncSession,
    profesor_id: UUID,
    materia_id: UUID | None = None,
    evaluacion_id: UUID | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> str:
    """Exporta criterios a CSV."""
    criterios = await get_criterios(db, profesor_id, materia_id, evaluacion_id, fecha_desde, fecha_hasta)
    lines = ["materia,grupo,evaluacion,criterio,porcentaje_logro,nivel,estudiantes_evaluados,estudiantes_con_dificultad"]
    for c in criterios:
        materia_nombre = ""
        if materia_id:
            from app.modules.materias.models import Materia
            m = await db.scalar(select(Materia.nombre).where(Materia.id == materia_id))
            materia_nombre = m or ""
        lines.append(",".join([
            _csv_escape(materia_nombre),
            "",
            "",
            _csv_escape(c["nombre"]),
            str(c["porcentaje_logro"]),
            c["nivel_atencion"],
            str(c["estudiantes_evaluados"]),
            str(c["estudiantes_con_dificultad"]),
        ]))
    return "\n".join(lines)


async def export_estudiantes_csv(
    db: AsyncSession,
    profesor_id: UUID,
    materia_id: UUID | None = None,
    evaluacion_id: UUID | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> str:
    """Exporta lista de estudiantes a CSV."""
    estudiantes = await get_estudiantes(db, profesor_id, materia_id, evaluacion_id, fecha_desde, fecha_hasta)
    lines = ["estudiante,grupo,promedio_pct,tendencia,evaluaciones_presentadas,entregas_pendientes,criterios_con_dificultad,senales_observables"]
    # Tendencia no está disponible en la lista simple; la calculamos aproximada
    for e in estudiantes:
        lines.append(",".join([
            _csv_escape(e.get("nombre", "")),
            "",
            str(e.get("promedio_pct", 0)),
            e.get("nivel_atencion", ""),
            str(e.get("total_evaluaciones", 0)),
            str(e.get("pendientes", 0)),
            str(e.get("bajo_rendimiento", 0)),
            _csv_escape("; ".join(e.get("senales", []))),
        ]))
    return "\n".join(lines)


# ── 2C.2: Latencia, errores y confianza ─────────────────────────────────────────


async def get_latency(
    db: AsyncSession,
    profesor_id: UUID,
    materia_id: UUID | None = None,
    evaluacion_id: UUID | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> dict:
    """Latencia del pipeline desde datos de resultado_json."""
    desde, hasta = _default_date_range()
    if fecha_desde: desde = fecha_desde
    if fecha_hasta: hasta = fecha_hasta

    cal_filter = [
        Calificacion.revisado_por_docente == True,
        Evaluacion.profesor_id == profesor_id,
        Calificacion.created_at >= desde,
        Calificacion.created_at <= hasta,
    ]
    if materia_id: cal_filter.append(Evaluacion.materia_id == materia_id)
    if evaluacion_id: cal_filter.append(Calificacion.evaluacion_id == evaluacion_id)

    rows = await db.execute(
        select(Calificacion.resultado_json).join(Evaluacion, Calificacion.evaluacion_id == Evaluacion.id).where(*cal_filter)
    )

    tiempos_vision: list[int] = []
    tiempos_grader_a: list[int] = []
    tiempos_grader_b: list[int] = []
    tiempos_total: list[int] = []

    for (rj,) in rows:
        if not isinstance(rj, dict):
            continue
        vision = rj.get("vision", {}) or {}
        grader_a = rj.get("grader_a", {}) or {}
        grader_b = rj.get("grader_b", {}) or {}

        t_v = vision.get("tiempo_ms", 0) or 0
        t_ga = grader_a.get("tiempo_ms", 0) or 0
        t_gb = grader_b.get("tiempo_ms", 0) or 0

        if t_v > 0: tiempos_vision.append(t_v)
        if t_ga > 0: tiempos_grader_a.append(t_ga)
        if t_gb > 0: tiempos_grader_b.append(t_gb)
        total = t_v + t_ga + t_gb
        if total > 0: tiempos_total.append(total)

    def _stats(vals: list[int]) -> dict:
        if not vals:
            return {"sample_size": 0, "average_ms": 0, "p50_ms": 0, "p90_ms": 0, "p95_ms": 0}
        s = sorted(vals)
        n = len(s)
        return {
            "sample_size": n,
            "average_ms": round(sum(s) / n, 1),
            "p50_ms": s[int(n * 0.5)],
            "p90_ms": s[int(n * 0.9)],
            "p95_ms": s[int(n * 0.95)],
        }

    total_stats = _stats(tiempos_total)
    stages = []
    if tiempos_vision:
        s = _stats(tiempos_vision)
        s["stage"] = "vision"
        s["percentage_of_total"] = round(s["average_ms"] / total_stats["average_ms"] * 100, 1) if total_stats["average_ms"] else 0
        stages.append(s)
    if tiempos_grader_a:
        s = _stats(tiempos_grader_a)
        s["stage"] = "grading_primary"
        s["percentage_of_total"] = round(s["average_ms"] / total_stats["average_ms"] * 100, 1) if total_stats["average_ms"] else 0
        stages.append(s)
    if tiempos_grader_b:
        s = _stats(tiempos_grader_b)
        s["stage"] = "grading_secondary"
        s["percentage_of_total"] = round(s["average_ms"] / total_stats["average_ms"] * 100, 1) if total_stats["average_ms"] else 0
        stages.append(s)

    return {"total": total_stats, "stages": stages}


async def get_errors(
    db: AsyncSession,
    profesor_id: UUID,
    materia_id: UUID | None = None,
    evaluacion_id: UUID | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> dict:
    """Errores del pipeline desde incidencias y resultado_json."""
    desde, hasta = _default_date_range()
    if fecha_desde: desde = fecha_desde
    if fecha_hasta: hasta = fecha_hasta

    cal_filter = [Calificacion.revisado_por_docente == True, Evaluacion.profesor_id == profesor_id]
    if materia_id: cal_filter.append(Evaluacion.materia_id == materia_id)
    if evaluacion_id: cal_filter.append(Calificacion.evaluacion_id == evaluacion_id)
    total_runs = await db.scalar(
        select(func.count(Calificacion.id)).join(Evaluacion, Calificacion.evaluacion_id == Evaluacion.id).where(*cal_filter)
    ) or 0

    inc_filter = [CalificacionIncidencia.created_at >= desde, CalificacionIncidencia.created_at <= hasta]
    if evaluacion_id:
        inc_filter.append(CalificacionIncidencia.calificacion_id.in_(
            select(Calificacion.id).where(Calificacion.evaluacion_id == evaluacion_id)
        ))
    inc_rows = await db.execute(
        select(CalificacionIncidencia.tipo, func.count(CalificacionIncidencia.id))
        .where(*inc_filter).group_by(CalificacionIncidencia.tipo)
    )
    errores_por_tipo: dict[str, int] = {}
    for row in inc_rows:
        errores_por_tipo[str(row[0])] = int(row[1])
    total_incidencias = sum(errores_por_tipo.values())

    alertas = await db.execute(
        select(Calificacion.resultado_json).join(Evaluacion, Calificacion.evaluacion_id == Evaluacion.id).where(*cal_filter)
    )
    alerta_counts: dict[str, int] = {}
    for (rj,) in alertas:
        if not isinstance(rj, dict):
            continue
        for grader_key in ("grader_a", "grader_b", "vision"):
            g = rj.get(grader_key, {}) or {}
            for a in g.get("alertas", []):
                if isinstance(a, str):
                    alerta_counts[a] = alerta_counts.get(a, 0) + 1

    error_rate = round(total_incidencias / total_runs, 4) if total_runs > 0 else 0
    return {
        "total_runs": total_runs,
        "total_errors": total_incidencias,
        "error_rate": error_rate,
        "por_tipo": errores_por_tipo,
        "alertas_modelo": alerta_counts,
    }


async def get_confidence(
    db: AsyncSession,
    profesor_id: UUID,
    materia_id: UUID | None = None,
    evaluacion_id: UUID | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> dict:
    """Distribución de confianza del modelo."""
    desde, hasta = _default_date_range()
    if fecha_desde: desde = fecha_desde
    if fecha_hasta: hasta = fecha_hasta

    cal_filter = [
        Calificacion.confianza.is_not(None),
        Calificacion.revisado_por_docente == True,
        Evaluacion.profesor_id == profesor_id,
        Calificacion.created_at >= desde,
        Calificacion.created_at <= hasta,
    ]
    if materia_id: cal_filter.append(Evaluacion.materia_id == materia_id)
    if evaluacion_id: cal_filter.append(Calificacion.evaluacion_id == evaluacion_id)

    rows = await db.execute(
        select(Calificacion.confianza).join(Evaluacion, Calificacion.evaluacion_id == Evaluacion.id).where(*cal_filter)
    )
    valores = [float(row[0]) for row in rows if row[0] is not None]
    n = len(valores)
    if n == 0:
        return {"sample_size": 0, "promedio": 0, "alta": 0, "media": 0, "baja": 0}
    alta = sum(1 for v in valores if v >= 0.8)
    media = sum(1 for v in valores if 0.6 <= v < 0.8)
    baja = sum(1 for v in valores if v < 0.6)
    return {
        "sample_size": n,
        "promedio": round(sum(valores) / n, 4),
        "alta": alta,
        "media": media,
        "baja": baja,
    }
