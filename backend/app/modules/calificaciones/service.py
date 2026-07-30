"""Servicio principal de calificaciones."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.calificaciones.models import Calificacion, Entrega, SalonSesion, SalonSesionEstudiante
from app.modules.calificaciones.schemas import (
    AjustarNota, BatchAjustarItem, BatchConfirmItem,
    BatchResult, BatchResultItem,
    BoletinItem, ConfirmarNota,
)
from app.modules.evaluaciones.models import Evaluacion
from app.modules.materias.models import Materia
from app.modules.matriculas.models import Matricula
from app.modules.evaluaciones.state_machine import transition_evaluation_state
from app.modules.users.models import User
from app.shared.enums import CalificacionEstado, EntregaEstado, EvaluacionEstado, MatriculaEstado, UserRole


def validate_score_within_evaluation(score: Decimal, evaluacion: Evaluacion, field_name: str) -> None:
    if score < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} no puede ser negativa",
        )
    if score > evaluacion.nota_maxima:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} no puede superar la nota maxima de la evaluacion",
        )


def ensure_evaluation_accepts_grading(evaluacion: Evaluacion) -> None:
    if evaluacion.estado == EvaluacionEstado.CERRADA.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La evaluacion cerrada no acepta nuevas entregas ni calificaciones",
        )
    if evaluacion.estado not in {EvaluacionEstado.PUBLICADA.value, EvaluacionEstado.EN_CALIFICACION.value}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La evaluacion no esta disponible para entregas o calificaciones",
        )


def transition_to_grading_if_needed(evaluacion: Evaluacion) -> None:
    if evaluacion.estado == EvaluacionEstado.PUBLICADA.value:
        transition_evaluation_state(evaluacion, EvaluacionEstado.EN_CALIFICACION)


async def get_evaluation_for_calificacion(db: AsyncSession, cal: Calificacion) -> Evaluacion:
    evaluacion = await db.scalar(
        select(Evaluacion)
        .options(selectinload(Evaluacion.blueprint))
        .where(Evaluacion.id == cal.evaluacion_id)
    )
    if not evaluacion:
        raise HTTPException(status_code=404, detail="Evaluacion no encontrada")
    return evaluacion


async def get_calificacion_or_404(db: AsyncSession, calificacion_id: UUID) -> Calificacion:
    cal = await db.scalar(
        select(Calificacion)
        .options(selectinload(Calificacion.entrega))
        .where(Calificacion.id == calificacion_id)
    )
    if not cal:
        raise HTTPException(status_code=404, detail="Calificación no encontrada")
    return cal


async def confirmar_nota(
    db: AsyncSession,
    cal: Calificacion,
    payload: ConfirmarNota,
) -> Calificacion:
    evaluacion = await get_evaluation_for_calificacion(db, cal)
    validate_score_within_evaluation(payload.nota_confirmada, evaluacion, "nota_confirmada")
    cal.nota_confirmada = payload.nota_confirmada
    cal.revisado_por_docente = True
    cal.estado = CalificacionEstado.CONFIRMADA.value
    if cal.entrega and cal.entrega.estado == EntregaEstado.REQUIERE_REINTENTO.value:
        cal.entrega.estado = EntregaEstado.REVISADA.value
    _append_timeline_event(
        cal, tipo="confirmada",
        nota_anterior=cal.nota_sugerida, nota_nueva=payload.nota_confirmada,
        detalle="Confirmada por docente",
    )
    await _update_salon_estudiante_estado(db, cal, "confirmado")
    await db.commit()
    await db.refresh(cal)
    return cal


async def ajustar_nota(
    db: AsyncSession,
    cal: Calificacion,
    payload: AjustarNota,
) -> Calificacion:
    evaluacion = await get_evaluation_for_calificacion(db, cal)
    validate_score_within_evaluation(payload.nota_confirmada, evaluacion, "nota_confirmada")
    nota_anterior = cal.nota_confirmada or cal.nota_sugerida
    cal.nota_confirmada = payload.nota_confirmada
    if payload.feedback:
        cal.feedback = payload.feedback
    cal.revisado_por_docente = True
    cal.estado = CalificacionEstado.AJUSTADA.value
    if cal.entrega and cal.entrega.estado == EntregaEstado.REQUIERE_REINTENTO.value:
        cal.entrega.estado = EntregaEstado.REVISADA.value
    _append_timeline_event(
        cal, tipo="ajustada",
        nota_anterior=nota_anterior, nota_nueva=payload.nota_confirmada,
        feedback=payload.feedback, detalle="Ajustada por docente",
    )
    await _update_salon_estudiante_estado(db, cal, "confirmado")
    await db.commit()
    await db.refresh(cal)
    return cal


async def list_calificaciones_for_evaluacion(
    db: AsyncSession, evaluacion_id: UUID
) -> list[Calificacion]:
    result = await db.scalars(
        select(Calificacion).where(Calificacion.evaluacion_id == evaluacion_id)
    )
    return list(result)


async def _update_salon_estudiante_estado(
    db: AsyncSession, cal: Calificacion, estado: str,
) -> None:
    """Si hay una sesión activa de Modo Salón, actualiza el estado del estudiante."""
    sesion = await db.scalar(
        select(SalonSesion).where(
            SalonSesion.evaluacion_id == cal.evaluacion_id,
            SalonSesion.estado == "activa",
        )
    )
    if not sesion:
        return
    sse = await db.scalar(
        select(SalonSesionEstudiante).where(
            SalonSesionEstudiante.sesion_id == sesion.id,
            SalonSesionEstudiante.estudiante_id == cal.estudiante_id,
        )
    )
    if sse:
        sse.estado = estado


async def get_boletin(
    db: AsyncSession,
    estudiante_id: UUID,
    materia_id: UUID,
    publicada_only: bool = True,
) -> list[dict]:
    """Return a report card with one joined query instead of one query per grade.

    Args:
        publicada_only: If True (default), only returns publicada calificaciones.
                        Teachers/admins can pass False to see all.
    """
    where_clauses = [
        Calificacion.estudiante_id == estudiante_id,
        Calificacion.materia_id == materia_id,
    ]
    if publicada_only:
        where_clauses.append(Calificacion.estado == CalificacionEstado.PUBLICADA.value)

    rows = await db.execute(
        select(Calificacion, Evaluacion)
        .outerjoin(Evaluacion, Evaluacion.id == Calificacion.evaluacion_id)
        .where(*where_clauses)
    )
    return [
        {
            "evaluacion_id": cal.evaluacion_id,
            "evaluacion_nombre": evaluacion.nombre if evaluacion else "",
            "nota_confirmada": cal.nota_confirmada,
            "nota_sugerida": cal.nota_sugerida,
            "nota_maxima": evaluacion.nota_maxima if evaluacion else Decimal("5"),
            "estado": cal.estado,
            "feedback": cal.feedback,
        }
        for cal, evaluacion in rows.all()
    ]


async def get_resumen_academico(
    db: AsyncSession,
    estudiante_id: UUID,
    publicada_only: bool = True,
) -> dict:
    """Aggregate confirmed grades for active enrollments in a single query."""
    where_clauses = [
        Calificacion.estudiante_id == estudiante_id,
        Calificacion.nota_confirmada.is_not(None),
        Matricula.estudiante_id == estudiante_id,
        Matricula.estado == MatriculaEstado.ACTIVO.value,
    ]
    if publicada_only:
        where_clauses.append(Calificacion.estado == CalificacionEstado.PUBLICADA.value)

    rows = await db.execute(
        select(
            Calificacion.materia_id,
            Materia.nombre,
            Calificacion.nota_confirmada,
            Evaluacion.nota_maxima,
        )
        .join(Evaluacion, Evaluacion.id == Calificacion.evaluacion_id)
        .join(Materia, Materia.id == Calificacion.materia_id)
        .join(Matricula, Matricula.materia_id == Calificacion.materia_id)
        .where(*where_clauses)
    )

    by_materia: dict[UUID, dict] = {}
    for materia_id, materia_nombre, nota_confirmada, nota_maxima in rows.all():
        if nota_confirmada is None:
            continue
        maximo = Decimal(nota_maxima or 0)
        normalized = float(nota_confirmada)
        if maximo > 0:
            normalized = float((Decimal(nota_confirmada) / maximo) * Decimal("5"))

        current = by_materia.setdefault(
            materia_id,
            {
                "materia_id": materia_id,
                "materia_nombre": materia_nombre,
                "sum": 0.0,
                "total_notas": 0,
            },
        )
        current["sum"] += normalized
        current["total_notas"] += 1

    materias = [
        {
            "materia_id": data["materia_id"],
            "materia_nombre": data["materia_nombre"],
            "promedio": data["sum"] / data["total_notas"],
            "total_notas": data["total_notas"],
        }
        for data in by_materia.values()
        if data["total_notas"]
    ]
    materias.sort(key=lambda materia: materia["promedio"], reverse=True)
    total_notas = sum(materia["total_notas"] for materia in materias)
    total_sum = sum(materia["promedio"] * materia["total_notas"] for materia in materias)

    return {
        "mejor": materias[0] if materias else None,
        "por_mejorar": materias[-1] if len(materias) > 1 else None,
        "promedio_general": total_sum / total_notas if total_notas else None,
        "total_materias": len(materias),
        "total_notas": total_notas,
    }


# ── Timeline helpers ─────────────────────────────────────────────────────────────


def _ensure_timeline(cal: Calificacion) -> list[dict]:
    """Get or initialize the _timeline array inside resultado_json."""
    if "_timeline" not in cal.resultado_json or not isinstance(cal.resultado_json["_timeline"], list):
        cal.resultado_json["_timeline"] = []
    return cal.resultado_json["_timeline"]


def _append_timeline_event(
    cal: Calificacion,
    tipo: str,
    nota_anterior: Decimal | None = None,
    nota_nueva: Decimal | None = None,
    feedback: str | None = None,
    actor_id: UUID | None = None,
    actor_nombre: str | None = None,
    detalle: str | None = None,
) -> None:
    timeline = _ensure_timeline(cal)
    timeline.append({
        "tipo": tipo,
        "nota_anterior": float(nota_anterior) if nota_anterior is not None else None,
        "nota_nueva": float(nota_nueva) if nota_nueva is not None else None,
        "feedback": feedback,
        "actor_id": str(actor_id) if actor_id else None,
        "actor_nombre": actor_nombre,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "detalle": detalle,
    })


# ── Detalle de calificación ───────────────────────────────────────────────────────


async def get_calificacion_detalle(
    db: AsyncSession,
    calificacion_id: UUID,
) -> dict:
    """Return enriched detail for a single calificacion with joins."""
    cal = await db.scalar(
        select(Calificacion)
        .options(selectinload(Calificacion.entrega))
        .where(Calificacion.id == calificacion_id)
    )
    if not cal:
        raise HTTPException(status_code=404, detail="Calificación no encontrada")

    evaluacion = await db.scalar(
        select(Evaluacion).where(Evaluacion.id == cal.evaluacion_id)
    )
    materia = await db.scalar(
        select(Materia).where(Materia.id == cal.materia_id)
    )
    estudiante = await db.scalar(
        select(User).where(User.id == cal.estudiante_id)
    )

    timeline_raw = cal.resultado_json.get("_timeline", []) if cal.resultado_json else []

    return {
        "id": cal.id,
        "evaluacion_id": cal.evaluacion_id,
        "evaluacion_nombre": evaluacion.nombre if evaluacion else "",
        "materia_id": cal.materia_id,
        "materia_nombre": materia.nombre if materia else "",
        "estudiante_id": cal.estudiante_id,
        "estudiante_nombre": estudiante.nombre if estudiante else "",
        "estudiante_email": estudiante.email if estudiante else "",
        "nota_sugerida": cal.nota_sugerida,
        "nota_confirmada": cal.nota_confirmada,
        "nota_maxima": evaluacion.nota_maxima if evaluacion else None,
        "confianza": cal.confianza,
        "feedback": cal.feedback,
        "estado": cal.estado,
        "revisado_por_docente": cal.revisado_por_docente,
        "resultado_json": cal.resultado_json or {},
        "entrega_tipo": cal.entrega.tipo if cal.entrega else None,
        "entrega_archivo_url": cal.entrega.archivo_url if cal.entrega else None,
        "entrega_respuesta_texto": cal.entrega.respuesta_texto if cal.entrega else None,
        "entrega_created_at": cal.entrega.created_at if cal.entrega else None,
        "timeline": timeline_raw,
        "created_at": cal.created_at,
        "updated_at": cal.updated_at,
    }


# ── Batch operations ─────────────────────────────────────────────────────────────


async def confirmar_nota_batch(
    db: AsyncSession,
    items: list[BatchConfirmItem],
    profesor: User,
) -> BatchResult:
    results: list[BatchResultItem] = []
    for item in items:
        try:
            cal = await get_calificacion_or_404(db, item.calificacion_id)
            evaluacion = await get_evaluation_for_calificacion(db, cal)
            validate_score_within_evaluation(item.nota_confirmada, evaluacion, "nota_confirmada")
            cal.nota_confirmada = item.nota_confirmada
            cal.revisado_por_docente = True
            cal.estado = CalificacionEstado.CONFIRMADA.value
            _append_timeline_event(
                cal, tipo="confirmada",
                nota_anterior=cal.nota_sugerida, nota_nueva=item.nota_confirmada,
                actor_id=profesor.id, actor_nombre=profesor.nombre,
                detalle="Confirmada en lote",
            )
            await _update_salon_estudiante_estado(db, cal, "confirmado")
            results.append(BatchResultItem(calificacion_id=item.calificacion_id, success=True))
        except HTTPException as exc:
            results.append(BatchResultItem(calificacion_id=item.calificacion_id, success=False, error=exc.detail))
        except Exception as exc:
            results.append(BatchResultItem(calificacion_id=item.calificacion_id, success=False, error=str(exc)))
    await db.commit()
    exitosos = sum(1 for r in results if r.success)
    return BatchResult(results=results, total=len(results), exitosos=exitosos, fallidos=len(results) - exitosos)


# ── Incidencias ───────────────────────────────────────────────────────────────────


async def ajustar_nota_batch(
    db: AsyncSession,
    items: list[BatchAjustarItem],
    profesor: User,
) -> BatchResult:
    results: list[BatchResultItem] = []
    for item in items:
        try:
            cal = await get_calificacion_or_404(db, item.calificacion_id)
            evaluacion = await get_evaluation_for_calificacion(db, cal)
            validate_score_within_evaluation(item.nota_confirmada, evaluacion, "nota_confirmada")
            nota_anterior = cal.nota_confirmada or cal.nota_sugerida
            cal.nota_confirmada = item.nota_confirmada
            if item.feedback:
                cal.feedback = item.feedback
            cal.revisado_por_docente = True
            cal.estado = CalificacionEstado.AJUSTADA.value
            _append_timeline_event(
                cal, tipo="ajustada",
                nota_anterior=nota_anterior, nota_nueva=item.nota_confirmada,
                feedback=item.feedback, actor_id=profesor.id, actor_nombre=profesor.nombre,
                detalle="Ajustada en lote",
            )
            await _update_salon_estudiante_estado(db, cal, "confirmado")
            results.append(BatchResultItem(calificacion_id=item.calificacion_id, success=True))
        except HTTPException as exc:
            results.append(BatchResultItem(calificacion_id=item.calificacion_id, success=False, error=exc.detail))
        except Exception as exc:
            results.append(BatchResultItem(calificacion_id=item.calificacion_id, success=False, error=str(exc)))
    await db.commit()
    exitosos = sum(1 for r in results if r.success)
    return BatchResult(results=results, total=len(results), exitosos=exitosos, fallidos=len(results) - exitosos)


# ── Incidencias ───────────────────────────────────────────────────────────────────


# ── Publicar ─────────────────────────────────────────────────────────────────────


async def publicar_nota(
    db: AsyncSession,
    cal: Calificacion,
) -> Calificacion:
    """Cambia estado a publicada. La calificación debe estar confirmada o ajustada."""
    if cal.estado not in (CalificacionEstado.CONFIRMADA.value, CalificacionEstado.AJUSTADA.value):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Solo calificaciones confirmadas o ajustadas pueden publicarse. Estado actual: {cal.estado}",
        )
    cal.estado = CalificacionEstado.PUBLICADA.value
    _append_timeline_event(
        cal, tipo="publicada",
        nota_anterior=cal.nota_confirmada, nota_nueva=cal.nota_confirmada,
        detalle="Resultados publicados al estudiante",
    )
    await db.commit()
    await db.refresh(cal)
    return cal


async def publicar_nota_batch(
    db: AsyncSession,
    calificacion_ids: list[UUID],
) -> BatchResult:
    results: list[BatchResultItem] = []
    for cal_id in calificacion_ids:
        try:
            cal = await get_calificacion_or_404(db, cal_id)
            if cal.estado not in (CalificacionEstado.CONFIRMADA.value, CalificacionEstado.AJUSTADA.value):
                results.append(BatchResultItem(
                    calificacion_id=cal_id, success=False,
                    error=f"Estado {cal.estado} no permite publicación",
                ))
                continue
            cal.estado = CalificacionEstado.PUBLICADA.value
            _append_timeline_event(
                cal, tipo="publicada",
                nota_anterior=cal.nota_confirmada, nota_nueva=cal.nota_confirmada,
                detalle="Resultados publicados en lote",
            )
            results.append(BatchResultItem(calificacion_id=cal_id, success=True))
        except HTTPException as exc:
            results.append(BatchResultItem(calificacion_id=cal_id, success=False, error=exc.detail))
        except Exception as exc:
            results.append(BatchResultItem(calificacion_id=cal_id, success=False, error=str(exc)))
    await db.commit()
    exitosos = sum(1 for r in results if r.success)
    return BatchResult(results=results, total=len(results), exitosos=exitosos, fallidos=len(results) - exitosos)


# ── Incidencias ───────────────────────────────────────────────────────────────────


async def crear_incidencia(
    db: AsyncSession,
    calificacion_id: UUID,
    tipo: str,
    descripcion: str,
    metadata_json: dict | None = None,
) -> dict:
    from app.modules.calificaciones.incidencia_models import CalificacionIncidencia
    inc = CalificacionIncidencia(calificacion_id=calificacion_id, tipo=tipo, descripcion=descripcion, metadata_json=metadata_json or {})
    db.add(inc)
    await db.commit()
    await db.refresh(inc)
    return {
        "id": inc.id, "calificacion_id": inc.calificacion_id, "tipo": inc.tipo,
        "descripcion": inc.descripcion, "estado": inc.estado,
        "metadata_json": inc.metadata_json, "resolucion": inc.resolucion,
        "resuelto_por": inc.resuelto_por, "resolved_at": inc.resolved_at,
        "created_at": inc.created_at, "updated_at": inc.updated_at,
    }


async def listar_incidencias(db: AsyncSession, calificacion_id: UUID) -> list[dict]:
    from app.modules.calificaciones.incidencia_models import CalificacionIncidencia
    result = await db.scalars(
        select(CalificacionIncidencia).where(CalificacionIncidencia.calificacion_id == calificacion_id)
        .order_by(CalificacionIncidencia.created_at.desc())
    )
    return [
        {"id": inc.id, "calificacion_id": inc.calificacion_id, "tipo": inc.tipo,
         "descripcion": inc.descripcion, "estado": inc.estado, "metadata_json": inc.metadata_json,
         "resolucion": inc.resolucion, "resuelto_por": inc.resuelto_por,
         "resolved_at": inc.resolved_at, "created_at": inc.created_at, "updated_at": inc.updated_at}
        for inc in result.all()
    ]


async def resolver_incidencia(db: AsyncSession, incidencia_id: UUID, resolucion: str, resuelto_por: UUID) -> dict | None:
    from app.modules.calificaciones.incidencia_models import CalificacionIncidencia
    inc = await db.scalar(select(CalificacionIncidencia).where(CalificacionIncidencia.id == incidencia_id))
    if not inc:
        return None
    inc.estado = "resuelta"
    inc.resolucion = resolucion
    inc.resuelto_por = resuelto_por
    inc.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(inc)
    return {
        "id": inc.id, "calificacion_id": inc.calificacion_id, "tipo": inc.tipo,
        "descripcion": inc.descripcion, "estado": inc.estado, "metadata_json": inc.metadata_json,
        "resolucion": inc.resolucion, "resuelto_por": inc.resuelto_por,
        "resolved_at": inc.resolved_at, "created_at": inc.created_at, "updated_at": inc.updated_at,
    }