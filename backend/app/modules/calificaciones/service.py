"""Servicio principal de calificaciones."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.calificaciones.models import Calificacion, Entrega, SalonSesion, SalonSesionEstudiante
from app.modules.calificaciones.schemas import (
    AjustarNota, BatchAjustarItem, BatchConfirmItem,
    BatchResult, BatchResultItem,
    BoletinItem, ConfirmarNota,
)
from app.modules.evaluaciones.models import Evaluacion
from app.modules.evaluaciones.blueprint_service import evaluation_to_grading_blueprint
from app.modules.materias.models import Materia
from app.modules.matriculas.models import Matricula
from app.modules.evaluaciones.state_machine import transition_evaluation_state
from app.modules.users.models import User
from app.shared.enums import (
    CalificacionEstado,
    EntregaEstado,
    EvaluacionEstado,
    MatriculaEstado,
    PoliticaIntento,
    UserRole,
)


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


def ensure_evaluation_active(evaluacion: Evaluacion) -> None:
    if evaluacion.estado not in {
        EvaluacionEstado.PUBLICADA.value,
        EvaluacionEstado.EN_CALIFICACION.value,
        EvaluacionEstado.PENDIENTE_REVISION.value,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La evaluacion no esta activa para procesar evidencia.",
        )


def ensure_evaluation_accepts_grading(evaluacion: Evaluacion) -> None:
    ensure_evaluation_active(evaluacion)
    if not getattr(evaluacion, "recepcion_habilitada", True):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La recepcion de entregas esta pausada para esta evaluacion.",
        )


async def ensure_student_can_submit_new_evidence(
    db: AsyncSession,
    evaluacion: Evaluacion,
    estudiante_id: UUID,
) -> None:
    """Aplica la misma politica de intentos a evidencia online y fisica."""
    policy = (
        getattr(evaluacion, "politica_intento", None) or PoliticaIntento.UN_INTENTO.value
    )
    if policy == PoliticaIntento.PRACTICA_LIBRE.value:
        return

    attempts = await db.scalar(
        select(func.count(Entrega.id)).where(
            Entrega.evaluacion_id == evaluacion.id,
            Entrega.estudiante_id == estudiante_id,
            Entrega.estado != EntregaEstado.REQUIERE_REINTENTO.value,
        )
    )
    attempt_count = int(attempts or 0)
    if policy == PoliticaIntento.UN_INTENTO.value and attempt_count >= 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El estudiante ya entrego esta evaluacion y solo tiene un intento.",
        )
    if policy in {
        PoliticaIntento.MULTIPLES_INTENTOS.value,
        PoliticaIntento.MEJOR_PUNTAJE.value,
        PoliticaIntento.ULTIMO_INTENTO.value,
    }:
        allowed = getattr(evaluacion, "intentos_permitidos", None)
        if allowed is not None and attempt_count >= allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El estudiante alcanzo el limite de {allowed} intento(s).",
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
    if cal.entrega:
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
    if cal.entrega:
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
    evaluacion = await db.scalar(
        select(Evaluacion).where(Evaluacion.id == evaluacion_id)
    )
    result = await db.scalars(
        select(Calificacion).where(Calificacion.evaluacion_id == evaluacion_id)
    )
    return _select_current_calificaciones(
        list(result),
        getattr(evaluacion, "politica_intento", None),
    )


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


def _grade_score(calificacion: Calificacion) -> Decimal:
    value = calificacion.nota_confirmada
    if value is None:
        value = calificacion.nota_sugerida
    return Decimal(value or 0)


def _created_timestamp(calificacion: Calificacion) -> float:
    return calificacion.created_at.timestamp() if calificacion.created_at else 0


def _select_current_calificaciones(
    rows: list[Calificacion],
    policy: str | None,
) -> list[Calificacion]:
    """Selecciona una sola calificacion visible por estudiante sin borrar el historial."""
    grouped: dict[UUID, list[Calificacion]] = {}
    for calificacion in rows:
        if calificacion.estado == CalificacionEstado.ANULADA.value:
            continue
        grouped.setdefault(calificacion.estudiante_id, []).append(calificacion)

    selected: list[Calificacion] = []
    for attempts in grouped.values():
        if policy == PoliticaIntento.MEJOR_PUNTAJE.value:
            current = max(
                attempts,
                key=lambda item: (_grade_score(item), _created_timestamp(item)),
            )
        else:
            current = max(attempts, key=_created_timestamp)
        selected.append(current)
    return sorted(selected, key=_created_timestamp, reverse=True)


def _display_guide_value(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return "Verdadero" if value else "Falso"
    if isinstance(value, list):
        parts = [_display_guide_value(item) for item in value]
        return ", ".join(part for part in parts if part)
    if isinstance(value, dict):
        value = (
            value.get("texto")
            or value.get("label")
            or value.get("respuesta")
            or value.get("valor")
        )
        return str(value).strip() if value is not None else None
    text = str(value).strip()
    return text or None


def _build_revision_guide(blueprint: dict) -> list[dict]:
    """Combina preguntas y clave de respuestas en un formato accesible para revision."""
    questions = blueprint.get("preguntas") or []
    expected = blueprint.get("respuestas_esperadas") or []
    answers_by_number: dict[str, object] = {}
    for index, item in enumerate(expected, start=1):
        if isinstance(item, dict):
            number = item.get("numero", index)
            answer = next(
                (
                    item[key]
                    for key in ("respuesta", "respuesta_correcta", "texto", "answer")
                    if item.get(key) is not None
                ),
                None,
            )
        else:
            number, answer = index, item
        answers_by_number[str(number)] = answer

    guide: list[dict] = []
    for index, question in enumerate(questions, start=1):
        if not isinstance(question, dict):
            question = {"enunciado": question}
        number = question.get("numero", index)
        raw_options = question.get("opciones") or []
        if not isinstance(raw_options, list):
            raw_options = [raw_options]
        options = [
            displayed
            for option in raw_options
            if (displayed := _display_guide_value(option)) is not None
        ]
        answer = answers_by_number.get(str(number))
        if answer is None and index <= len(expected):
            fallback = expected[index - 1]
            if isinstance(fallback, dict):
                answer = next(
                    (
                        fallback[key]
                        for key in ("respuesta", "respuesta_correcta", "texto", "answer")
                        if fallback.get(key) is not None
                    ),
                    None,
                )
            else:
                answer = fallback
        guide.append(
            {
                "numero": number,
                "enunciado": _display_guide_value(
                    question.get("enunciado")
                    or question.get("texto")
                    or question.get("pregunta")
                )
                or f"Pregunta {number}",
                "tipo": _display_guide_value(question.get("tipo")),
                "opciones": options,
                "respuesta_correcta": _display_guide_value(answer),
                "puntaje": question.get("puntaje"),
            }
        )
    return guide


def _official_report_rows(
    rows: list[tuple[Calificacion, Evaluacion | None]],
) -> list[tuple[Calificacion, Evaluacion]]:
    grouped: dict[UUID, list[tuple[Calificacion, Evaluacion]]] = {}
    for calificacion, evaluacion in rows:
        if evaluacion is None:
            continue
        if evaluacion.politica_intento == PoliticaIntento.PRACTICA_LIBRE.value:
            continue
        grouped.setdefault(evaluacion.id, []).append((calificacion, evaluacion))

    selected: list[tuple[Calificacion, Evaluacion]] = []
    for attempts in grouped.values():
        policy = attempts[0][1].politica_intento
        if policy == PoliticaIntento.MEJOR_PUNTAJE.value:
            official = max(
                attempts,
                key=lambda item: (
                    _grade_score(item[0]),
                    item[0].created_at.timestamp() if item[0].created_at else 0,
                ),
            )
        else:
            # ultimo_intento y multiples_intentos exponen el intento mas
            # reciente; un_intento naturalmente solo contiene uno.
            official = max(
                attempts,
                key=lambda item: item[0].created_at.timestamp() if item[0].created_at else 0,
            )
        selected.append(official)
    return selected


async def get_boletin(
    db: AsyncSession,
    estudiante_id: UUID,
    materia_id: UUID,
    publicada_only: bool = True,
) -> list[dict]:
    """Devuelve una sola nota oficial por actividad segun su politica."""
    where_clauses = [
        Calificacion.estudiante_id == estudiante_id,
        Calificacion.materia_id == materia_id,
    ]
    if publicada_only:
        # Para el estudiante una nota se vuelve oficial en cuanto el docente
        # la confirma o ajusta. "Publicada" sigue siendo un estado válido,
        # pero ya no obliga a un segundo paso manual para que aparezca.
        where_clauses.extend(
            [
                Calificacion.revisado_por_docente.is_(True),
                Calificacion.nota_confirmada.is_not(None),
                Calificacion.estado.in_(
                    {
                        CalificacionEstado.CONFIRMADA.value,
                        CalificacionEstado.AJUSTADA.value,
                        CalificacionEstado.PUBLICADA.value,
                    }
                ),
            ]
        )

    result = await db.execute(
        select(Calificacion, Evaluacion)
        .outerjoin(Evaluacion, Evaluacion.id == Calificacion.evaluacion_id)
        .where(*where_clauses)
    )
    rows = list(result.all())
    visible_rows = _official_report_rows(rows) if publicada_only else rows
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
        for cal, evaluacion in visible_rows
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
        where_clauses.extend(
            [
                Calificacion.revisado_por_docente.is_(True),
                Calificacion.estado.in_(
                    {
                        CalificacionEstado.CONFIRMADA.value,
                        CalificacionEstado.AJUSTADA.value,
                        CalificacionEstado.PUBLICADA.value,
                    }
                ),
            ]
        )

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
        select(Evaluacion)
        .options(selectinload(Evaluacion.blueprint))
        .where(Evaluacion.id == cal.evaluacion_id)
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
        "entrega_archivo_url": (
            f"/api/calificaciones/entregas/{cal.entrega.id}/evidencia"
            if cal.entrega and cal.entrega.archivo_url
            else None
        ),
        "entrega_respuesta_texto": cal.entrega.respuesta_texto if cal.entrega else None,
        "entrega_created_at": cal.entrega.created_at if cal.entrega else None,
        "timeline": timeline_raw,
        "guia_revision": _build_revision_guide(
            evaluation_to_grading_blueprint(evaluacion)
        ) if evaluacion else [],
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
            if profesor.rol != UserRole.ADMIN.value and evaluacion.profesor_id != profesor.id:
                raise HTTPException(status_code=403, detail="No puedes modificar esta calificacion")
            validate_score_within_evaluation(item.nota_confirmada, evaluacion, "nota_confirmada")
            cal.nota_confirmada = item.nota_confirmada
            cal.revisado_por_docente = True
            cal.estado = CalificacionEstado.CONFIRMADA.value
            if cal.entrega:
                cal.entrega.estado = EntregaEstado.REVISADA.value
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
            if profesor.rol != UserRole.ADMIN.value and evaluacion.profesor_id != profesor.id:
                raise HTTPException(status_code=403, detail="No puedes modificar esta calificacion")
            validate_score_within_evaluation(item.nota_confirmada, evaluacion, "nota_confirmada")
            nota_anterior = cal.nota_confirmada or cal.nota_sugerida
            cal.nota_confirmada = item.nota_confirmada
            if item.feedback:
                cal.feedback = item.feedback
            cal.revisado_por_docente = True
            cal.estado = CalificacionEstado.AJUSTADA.value
            if cal.entrega:
                cal.entrega.estado = EntregaEstado.REVISADA.value
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


def _restored_review_state(calificacion: Calificacion) -> str:
    if (
        calificacion.nota_confirmada is not None
        and calificacion.nota_sugerida is not None
        and calificacion.nota_confirmada != calificacion.nota_sugerida
    ):
        return CalificacionEstado.AJUSTADA.value
    return CalificacionEstado.CONFIRMADA.value


async def _prepare_grade_publication(
    db: AsyncSession,
    calificacion: Calificacion,
    evaluacion: Evaluacion,
) -> None:
    policy = evaluacion.politica_intento or PoliticaIntento.UN_INTENTO.value
    if policy == PoliticaIntento.PRACTICA_LIBRE.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Los intentos de practica libre no afectan la nota ni se publican en el boletin.",
        )
    previous = list(
        await db.scalars(
            select(Calificacion).where(
                Calificacion.evaluacion_id == calificacion.evaluacion_id,
                Calificacion.estudiante_id == calificacion.estudiante_id,
                Calificacion.estado == CalificacionEstado.PUBLICADA.value,
                Calificacion.id != calificacion.id,
            )
        )
    )
    if policy == PoliticaIntento.MEJOR_PUNTAJE.value and previous:
        best_previous = max(previous, key=_grade_score)
        if _grade_score(best_previous) > _grade_score(calificacion):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Este intento no supera la mejor nota ya publicada.",
            )
    for prior in previous:
        prior.estado = _restored_review_state(prior)


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
    evaluacion = await get_evaluation_for_calificacion(db, cal)
    await _prepare_grade_publication(db, cal, evaluacion)
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
    profesor: User,
) -> BatchResult:
    results: list[BatchResultItem] = []
    for cal_id in calificacion_ids:
        try:
            cal = await get_calificacion_or_404(db, cal_id)
            evaluacion = await get_evaluation_for_calificacion(db, cal)
            if profesor.rol != UserRole.ADMIN.value and evaluacion.profesor_id != profesor.id:
                raise HTTPException(status_code=403, detail="No puedes publicar esta calificacion")
            if cal.estado not in (CalificacionEstado.CONFIRMADA.value, CalificacionEstado.AJUSTADA.value):
                results.append(BatchResultItem(
                    calificacion_id=cal_id, success=False,
                    error=f"Estado {cal.estado} no permite publicación",
                ))
                continue
            await _prepare_grade_publication(db, cal, evaluacion)
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


async def _calificacion_revisada_del_estudiante(
    db: AsyncSession,
    *,
    evaluacion_id: UUID,
    estudiante_id: UUID,
) -> Calificacion:
    calificacion = await db.scalar(
        select(Calificacion)
        .where(
            Calificacion.evaluacion_id == evaluacion_id,
            Calificacion.estudiante_id == estudiante_id,
            Calificacion.revisado_por_docente.is_(True),
            Calificacion.nota_confirmada.is_not(None),
        )
        .order_by(Calificacion.updated_at.desc())
    )
    if not calificacion:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo puedes solicitar revisión después de que el docente publique o confirme la calificación.",
        )
    return calificacion


async def obtener_solicitud_revision_estudiante(
    db: AsyncSession,
    *,
    evaluacion_id: UUID,
    estudiante_id: UUID,
) -> dict | None:
    from app.modules.calificaciones.incidencia_models import CalificacionIncidencia

    calificacion = await _calificacion_revisada_del_estudiante(
        db,
        evaluacion_id=evaluacion_id,
        estudiante_id=estudiante_id,
    )
    incidencia = await db.scalar(
        select(CalificacionIncidencia)
        .where(
            CalificacionIncidencia.calificacion_id == calificacion.id,
            CalificacionIncidencia.tipo == "solicitud_revision",
        )
        .order_by(CalificacionIncidencia.created_at.desc())
    )
    if not incidencia:
        return None
    return {
        "id": incidencia.id, "calificacion_id": incidencia.calificacion_id,
        "tipo": incidencia.tipo, "descripcion": incidencia.descripcion,
        "estado": incidencia.estado, "metadata_json": incidencia.metadata_json,
        "resolucion": incidencia.resolucion, "resuelto_por": incidencia.resuelto_por,
        "resolved_at": incidencia.resolved_at, "created_at": incidencia.created_at,
        "updated_at": incidencia.updated_at,
    }


async def crear_solicitud_revision_estudiante(
    db: AsyncSession,
    *,
    evaluacion_id: UUID,
    estudiante_id: UUID,
    motivo: str,
    descripcion: str,
) -> dict:
    from app.modules.calificaciones.incidencia_models import CalificacionIncidencia

    calificacion = await _calificacion_revisada_del_estudiante(
        db,
        evaluacion_id=evaluacion_id,
        estudiante_id=estudiante_id,
    )
    abierta = await db.scalar(
        select(CalificacionIncidencia).where(
            CalificacionIncidencia.calificacion_id == calificacion.id,
            CalificacionIncidencia.tipo == "solicitud_revision",
            CalificacionIncidencia.estado == "abierta",
        )
    )
    if abierta:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya tienes una solicitud de revisión abierta para esta calificación.",
        )
    return await crear_incidencia(
        db,
        calificacion.id,
        "solicitud_revision",
        descripcion.strip(),
        {
            "origen": "estudiante",
            "estudiante_id": str(estudiante_id),
            "evaluacion_id": str(evaluacion_id),
            "motivo": motivo,
        },
    )


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
