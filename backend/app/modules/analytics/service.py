"""Servicio de analítica — consultas desde datos canónicos."""
from __future__ import annotations

import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import and_, case, func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.analytics.event_policy import AnalyticsValidationError, validate_event_payload
from app.modules.analytics.models import AnalyticsEvento, AnalyticsWorkSession
from app.modules.calificaciones.incidencia_models import CalificacionIncidencia
from app.modules.calificaciones.models import Calificacion
from app.modules.evaluaciones.models import Evaluacion
from app.modules.materias.models import Materia
from app.modules.users.models import User
from app.shared.enums import CalificacionEstado, UserRole

logger = get_logger(__name__)

WORK_SESSION_COMMAND_LIMIT = 10_000
WORK_SESSION_UNCERTAIN_GAP_MS = 45_000
WORK_SESSION_CONDITIONS = {"manual", "asistida"}
WORK_SESSION_PHASES = {"preparacion", "revision", "correccion", "finalizacion"}
WORK_SESSION_ACTIONS = {
    "iniciar_intervalo",
    "heartbeat",
    "pausar",
    "reanudar",
    "cambiar_fase",
    "finalizar",
    "ajustar",
    "traspasar",
}


def _work_token(session_id: UUID, event_id: UUID, *, purpose: str = "owner") -> str:
    """Deriva un token reproducible para replays sin persistirlo en texto plano."""
    message = f"work-session:{session_id}:{event_id}:{purpose}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()


def _work_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _command_digest(payload: dict) -> str:
    serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _work_session_payload(session: AnalyticsWorkSession) -> dict:
    """Proyección JSON segura; nunca incluye el hash ni el ledger interno."""
    return {
        "id": str(session.id),
        "version": int(session.version),
        "estado": session.estado,
        "condicion": session.condicion,
        "fase": session.fase,
        "evaluacion_id": str(session.evaluacion_id) if session.evaluacion_id else None,
        "calificacion_id": str(session.calificacion_id) if session.calificacion_id else None,
        "batch_job_id": str(session.batch_job_id) if session.batch_job_id else None,
        "duracion_confirmada_ms": int(session.duracion_confirmada_ms),
        "incertidumbre_ms": int(session.incertidumbre_ms),
        "origen": session.origen,
        "motivo_ajuste": session.motivo_ajuste,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None,
        "finished_at": session.finished_at.isoformat() if session.finished_at else None,
    }


def _raise_work_conflict(detail: str) -> None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


async def _get_allowed_evaluation(
    db: AsyncSession,
    evaluacion_id: UUID,
    current_user: User,
) -> Evaluacion | None:
    stmt = select(Evaluacion).where(
        Evaluacion.id == evaluacion_id,
        Evaluacion.deleted_at.is_(None),
    )
    if current_user.rol == UserRole.PROFESOR.value:
        stmt = stmt.where(Evaluacion.profesor_id == current_user.id)
    elif current_user.rol != UserRole.ADMIN.value:
        return None
    return await db.scalar(stmt)


async def _get_allowed_calificacion(
    db: AsyncSession,
    calificacion_id: UUID,
    current_user: User,
) -> Calificacion | None:
    stmt = select(Calificacion).where(Calificacion.id == calificacion_id)
    if current_user.rol == UserRole.PROFESOR.value:
        stmt = stmt.join(Evaluacion, Evaluacion.id == Calificacion.evaluacion_id).where(
            Evaluacion.profesor_id == current_user.id,
            Evaluacion.deleted_at.is_(None),
        )
    elif current_user.rol == UserRole.ESTUDIANTE.value:
        stmt = stmt.where(Calificacion.estudiante_id == current_user.id)
    elif current_user.rol != UserRole.ADMIN.value:
        return None
    return await db.scalar(stmt)


async def _validate_event_references(
    db: AsyncSession,
    *,
    current_user: User,
    evaluacion_id: UUID | None,
    calificacion_id: UUID | None,
    metadata_json: dict,
) -> None:
    evaluation = None
    if evaluacion_id is not None:
        evaluation = await _get_allowed_evaluation(db, evaluacion_id, current_user)
        if evaluation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referencia no encontrada",
            )
        materia_id = metadata_json.get("materia_id")
        if materia_id is not None and str(evaluation.materia_id) != str(materia_id):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Las referencias académicas no son coherentes",
            )

    if calificacion_id is not None:
        grade = await _get_allowed_calificacion(db, calificacion_id, current_user)
        if grade is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referencia no encontrada",
            )
        if evaluation is not None and grade.evaluacion_id != evaluation.id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Las referencias académicas no son coherentes",
            )


async def registrar_evento(
    db: AsyncSession,
    *,
    tipo: str,
    current_user: User,
    evaluacion_id: UUID | None = None,
    calificacion_id: UUID | None = None,
    metadata_json: dict | None = None,
) -> AnalyticsEvento:
    """Valida y persiste un evento atribuible únicamente a la sesión efectiva."""
    try:
        validated = validate_event_payload(
            tipo=tipo,
            role=current_user.rol,
            evaluacion_id=evaluacion_id,
            calificacion_id=calificacion_id,
            metadata_json=metadata_json or {},
        )
    except AnalyticsValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    await _validate_event_references(
        db,
        current_user=current_user,
        evaluacion_id=validated.evaluacion_id,
        calificacion_id=validated.calificacion_id,
        metadata_json=validated.metadata_json,
    )
    evento = AnalyticsEvento(
        tipo=validated.tipo,
        actor_id=current_user.id,
        evaluacion_id=validated.evaluacion_id,
        calificacion_id=validated.calificacion_id,
        metadata_json=validated.metadata_json,
    )
    db.add(evento)
    await db.commit()
    await db.refresh(evento)
    return evento


async def _validate_work_session_references(
    db: AsyncSession,
    *,
    current_user: User,
    evaluacion_id: UUID | None,
    calificacion_id: UUID | None,
    batch_job_id: UUID | None,
) -> UUID | None:
    """Valida propiedad y devuelve la evaluación canónica cuando puede inferirse."""
    evaluation = None
    if evaluacion_id is not None:
        evaluation = await _get_allowed_evaluation(db, evaluacion_id, current_user)
        if evaluation is None:
            raise HTTPException(status_code=404, detail="Referencia no encontrada")

    if calificacion_id is not None:
        grade = await _get_allowed_calificacion(db, calificacion_id, current_user)
        if grade is None:
            raise HTTPException(status_code=404, detail="Referencia no encontrada")
        if evaluation is not None and grade.evaluacion_id != evaluation.id:
            raise HTTPException(status_code=422, detail="Las referencias académicas no son coherentes")
        if evaluation is None:
            evaluation = await _get_allowed_evaluation(db, grade.evaluacion_id, current_user)
            if evaluation is None:
                raise HTTPException(status_code=404, detail="Referencia no encontrada")

    if batch_job_id is not None:
        owns_batch = await db.scalar(
            text(
                "SELECT EXISTS(SELECT 1 FROM ai_jobs "
                "WHERE id=CAST(:job_id AS uuid) AND user_id=CAST(:actor_id AS uuid) "
                "AND tipo='calificacion_lote')"
            ),
            {"job_id": str(batch_job_id), "actor_id": str(current_user.id)},
        )
        if not owns_batch:
            raise HTTPException(status_code=404, detail="Referencia no encontrada")

    return evaluation.id if evaluation is not None else evaluacion_id


def _find_command(ledger: dict, event_id: UUID) -> dict | None:
    event_key = str(event_id)
    return next((item for item in ledger.get("commands", []) if item.get("event_id") == event_key), None)


def _replay_response(
    session: AnalyticsWorkSession,
    command: dict,
    *,
    digest: str,
    request_token_hash: str | None = None,
) -> dict:
    if command.get("digest") != digest:
        _raise_work_conflict("El event_id ya fue utilizado con otro contenido")
    if request_token_hash is not None and not hmac.compare_digest(
        str(command.get("request_token_hash", "")), request_token_hash
    ):
        _raise_work_conflict("La sesión pertenece a otra pestaña o dispositivo")
    response = dict(command.get("response") or {})
    token_event = command.get("owner_token_event")
    if token_event:
        token_session_id = command.get("token_session_id") or response["id"]
        response["owner_token"] = _work_token(
            UUID(token_session_id), UUID(token_event), purpose=command.get("token_purpose", "owner")
        )
    response["replayed"] = True
    return response


async def create_work_session(
    db: AsyncSession,
    *,
    current_user: User,
    condicion: str,
    fase: str,
    event_id: UUID,
    evaluacion_id: UUID | None = None,
    calificacion_id: UUID | None = None,
    batch_job_id: UUID | None = None,
) -> dict:
    if condicion not in WORK_SESSION_CONDITIONS or fase not in WORK_SESSION_PHASES:
        raise HTTPException(status_code=422, detail="Condición o fase no válida")

    canonical_evaluation_id = await _validate_work_session_references(
        db,
        current_user=current_user,
        evaluacion_id=evaluacion_id,
        calificacion_id=calificacion_id,
        batch_job_id=batch_job_id,
    )
    request_payload = {
        "action": "crear",
        "condicion": condicion,
        "fase": fase,
        "evaluacion_id": str(canonical_evaluation_id) if canonical_evaluation_id else None,
        "calificacion_id": str(calificacion_id) if calificacion_id else None,
        "batch_job_id": str(batch_job_id) if batch_job_id else None,
    }
    digest = _command_digest(request_payload)

    existing_sessions = list(await db.scalars(
        select(AnalyticsWorkSession)
        .where(AnalyticsWorkSession.actor_id == current_user.id)
        .order_by(AnalyticsWorkSession.started_at.desc())
        .limit(100)
    ))
    for existing in existing_sessions:
        previous = _find_command(existing.intervals_json or {}, event_id)
        if previous is not None:
            return _replay_response(existing, previous, digest=digest)
    if any(item.estado in {"active", "paused"} for item in existing_sessions):
        _raise_work_conflict("Ya tienes una sesión de medición abierta")

    session = AnalyticsWorkSession(
        actor_id=current_user.id,
        condicion=condicion,
        fase=fase,
        evaluacion_id=canonical_evaluation_id,
        calificacion_id=calificacion_id,
        batch_job_id=batch_job_id,
        version=1,
        estado="active",
        owner_token_hash="pending",
        intervals_json={"schema_version": 1, "commands": [], "intervals": []},
        duracion_confirmada_ms=0,
        incertidumbre_ms=0,
        origen="observado",
    )
    db.add(session)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        current = await db.scalar(
            select(AnalyticsWorkSession)
            .where(
                AnalyticsWorkSession.actor_id == current_user.id,
                AnalyticsWorkSession.estado.in_(("active", "paused")),
            )
            .order_by(AnalyticsWorkSession.started_at.desc())
        )
        if current is not None:
            previous = _find_command(current.intervals_json or {}, event_id)
            if previous is not None:
                return _replay_response(current, previous, digest=digest)
        raise HTTPException(status_code=409, detail="Ya tienes una sesión de medición abierta") from exc

    owner_token = _work_token(session.id, event_id)
    session.owner_token_hash = _work_token_hash(owner_token)
    response = _work_session_payload(session)
    ledger = dict(session.intervals_json or {})
    ledger["intervals"] = [{
        "sequence": 1,
        "phase": fase,
        "confirmed_ms": 0,
        "uncertain_ms": 0,
    }]
    ledger["commands"] = [{
        "event_id": str(event_id),
        "digest": digest,
        "action": "crear",
        "response": response,
        "owner_token_event": str(event_id),
        "token_purpose": "owner",
    }]
    session.intervals_json = ledger
    await db.commit()
    await db.refresh(session)
    response = _work_session_payload(session)
    response["owner_token"] = owner_token
    response["replayed"] = False
    return response


def _record_elapsed(session: AnalyticsWorkSession, ledger: dict, elapsed_ms: int) -> None:
    if elapsed_ms < 0:
        raise HTTPException(status_code=422, detail="elapsed_ms no puede ser negativo")
    if elapsed_ms == 0:
        return
    intervals = list(ledger.get("intervals") or [])
    if not intervals:
        intervals.append({
            "sequence": 1,
            "phase": session.fase,
            "confirmed_ms": 0,
            "uncertain_ms": 0,
        })
    interval = dict(intervals[-1])
    if elapsed_ms > WORK_SESSION_UNCERTAIN_GAP_MS:
        session.incertidumbre_ms += elapsed_ms
        interval["uncertain_ms"] = int(interval.get("uncertain_ms", 0)) + elapsed_ms
    else:
        session.duracion_confirmada_ms += elapsed_ms
        interval["confirmed_ms"] = int(interval.get("confirmed_ms", 0)) + elapsed_ms
    intervals[-1] = interval
    ledger["intervals"] = intervals


def _start_interval(session: AnalyticsWorkSession, ledger: dict) -> None:
    intervals = list(ledger.get("intervals") or [])
    intervals.append({
        "sequence": len(intervals) + 1,
        "phase": session.fase,
        "confirmed_ms": 0,
        "uncertain_ms": 0,
    })
    ledger["intervals"] = intervals


async def command_work_session(
    db: AsyncSession,
    *,
    session_id: UUID,
    current_user: User,
    event_id: UUID,
    expected_version: int,
    owner_token: str,
    action: str,
    elapsed_ms: int = 0,
    fase: str | None = None,
    motivo: str | None = None,
) -> dict:
    if action not in WORK_SESSION_ACTIONS:
        raise HTTPException(status_code=422, detail="Acción no válida")
    if fase is not None and fase not in WORK_SESSION_PHASES:
        raise HTTPException(status_code=422, detail="Fase no válida")

    session = await db.scalar(
        select(AnalyticsWorkSession)
        .where(
            AnalyticsWorkSession.id == session_id,
            AnalyticsWorkSession.actor_id == current_user.id,
        )
        .with_for_update()
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    request_payload = {
        "action": action,
        "elapsed_ms": elapsed_ms,
        "fase": fase,
        "motivo": motivo,
        "expected_version": expected_version,
    }
    digest = _command_digest(request_payload)
    request_token_hash = _work_token_hash(owner_token)
    ledger = dict(session.intervals_json or {})
    previous = _find_command(ledger, event_id)
    if previous is not None:
        return _replay_response(
            session,
            previous,
            digest=digest,
            request_token_hash=request_token_hash,
        )

    # El traspaso es una toma de control explícita por el mismo actor
    # autenticado; permite recuperar la medición desde otro dispositivo.
    # El resto de acciones sí exige el token vigente.
    if action != "traspasar" and not hmac.compare_digest(session.owner_token_hash, request_token_hash):
        _raise_work_conflict("La sesión pertenece a otra pestaña o dispositivo")
    if session.version != expected_version:
        _raise_work_conflict(f"La sesión cambió; la versión actual es {session.version}")
    commands = list(ledger.get("commands") or [])
    if len(commands) >= WORK_SESSION_COMMAND_LIMIT:
        _raise_work_conflict("La sesión alcanzó el límite de eventos; finalízala e inicia otra")

    if action == "ajustar":
        normalized_reason = (motivo or "").strip()
        if not normalized_reason:
            raise HTTPException(status_code=422, detail="El ajuste requiere un motivo")
        corrected = session.duracion_confirmada_ms + elapsed_ms
        if corrected < 0:
            raise HTTPException(status_code=422, detail="El ajuste dejaría una duración negativa")
        session.duracion_confirmada_ms = corrected
        session.origen = "ajustado"
        session.motivo_ajuste = normalized_reason
        adjustments = list(ledger.get("adjustments") or [])
        adjustments.append({
            "event_id": str(event_id),
            "delta_ms": elapsed_ms,
            "reason": normalized_reason,
            "previous_confirmed_ms": corrected - elapsed_ms,
            "result_confirmed_ms": corrected,
        })
        ledger["adjustments"] = adjustments
    elif session.estado in {"completed", "incomplete"}:
        _raise_work_conflict("La sesión ya terminó y no puede reabrirse")
    elif action == "heartbeat":
        if session.estado != "active":
            _raise_work_conflict("Reanuda la sesión antes de registrar tiempo")
        _record_elapsed(session, ledger, elapsed_ms)
    elif action == "pausar":
        if session.estado != "active":
            _raise_work_conflict("La sesión no está activa")
        _record_elapsed(session, ledger, elapsed_ms)
        session.estado = "paused"
    elif action in {"reanudar", "iniciar_intervalo"}:
        if elapsed_ms != 0:
            raise HTTPException(status_code=422, detail="Reanudar no acepta tiempo acumulado")
        if session.estado != "paused":
            _raise_work_conflict("La sesión no está pausada")
        session.estado = "active"
        _start_interval(session, ledger)
    elif action == "cambiar_fase":
        if fase is None:
            raise HTTPException(status_code=422, detail="Debes indicar la nueva fase")
        if session.estado == "active":
            _record_elapsed(session, ledger, elapsed_ms)
        elif elapsed_ms != 0:
            raise HTTPException(status_code=422, detail="Una sesión pausada no acepta tiempo acumulado")
        session.fase = fase
        if session.estado == "active":
            _start_interval(session, ledger)
    elif action == "finalizar":
        if session.estado == "active":
            _record_elapsed(session, ledger, elapsed_ms)
        elif elapsed_ms != 0:
            raise HTTPException(status_code=422, detail="Una sesión pausada no acepta tiempo acumulado")
        session.estado = "completed"
        session.finished_at = datetime.now(UTC).replace(tzinfo=None)
    elif action == "traspasar":
        if elapsed_ms != 0:
            raise HTTPException(status_code=422, detail="El traspaso no acepta tiempo acumulado")
        new_owner_token = _work_token(session.id, event_id, purpose="transfer")
        session.owner_token_hash = _work_token_hash(new_owner_token)

    session.version += 1
    session.updated_at = datetime.now(UTC).replace(tzinfo=None)
    should_rollover = (
        len(commands) + 1 >= WORK_SESSION_COMMAND_LIMIT
        and session.estado in {"active", "paused"}
    )
    continuation = None
    rollover_token = None
    if should_rollover:
        continuation_state = session.estado
        session.estado = "completed"
        session.finished_at = datetime.now(UTC).replace(tzinfo=None)
        await db.flush()
        continuation = AnalyticsWorkSession(
            id=uuid4(),
            actor_id=session.actor_id,
            condicion=session.condicion,
            fase=session.fase,
            evaluacion_id=session.evaluacion_id,
            calificacion_id=session.calificacion_id,
            batch_job_id=session.batch_job_id,
            study_id=session.study_id,
            version=1,
            estado=continuation_state,
            owner_token_hash="pending",
            intervals_json={
                "schema_version": 1,
                "commands": [],
                "intervals": ([{
                    "sequence": 1,
                    "phase": session.fase,
                    "confirmed_ms": 0,
                    "uncertain_ms": 0,
                }] if continuation_state == "active" else []),
                "predecessor_id": str(session.id),
            },
            duracion_confirmada_ms=0,
            incertidumbre_ms=0,
            origen=session.origen,
        )
        rollover_token = _work_token(continuation.id, event_id, purpose="rollover")
        continuation.owner_token_hash = _work_token_hash(rollover_token)
        db.add(continuation)
        await db.flush()

    response = _work_session_payload(session)
    if continuation is not None:
        response["continuation"] = _work_session_payload(continuation)
        response["rollover"] = True
    command = {
        "event_id": str(event_id),
        "digest": digest,
        "action": action,
        "request_token_hash": request_token_hash,
        "response": response,
    }
    if continuation is not None:
        command["owner_token_event"] = str(event_id)
        command["token_purpose"] = "rollover"
        command["token_session_id"] = str(continuation.id)
        ledger["successor_id"] = str(continuation.id)
    elif action == "traspasar":
        command["owner_token_event"] = str(event_id)
        command["token_purpose"] = "transfer"
    commands.append(command)
    ledger["commands"] = commands
    session.intervals_json = ledger
    await db.commit()
    await db.refresh(session)
    response = _work_session_payload(session)
    if continuation is not None:
        response["continuation"] = _work_session_payload(continuation)
        response["rollover"] = True
        response["owner_token"] = rollover_token
    elif action == "traspasar":
        response["owner_token"] = new_owner_token
    response["replayed"] = False
    return response


async def list_work_sessions(
    db: AsyncSession,
    *,
    current_user: User,
    estado: str | None = None,
    limit: int = 30,
    offset: int = 0,
) -> dict:
    filters = [AnalyticsWorkSession.actor_id == current_user.id]
    if estado is not None:
        filters.append(AnalyticsWorkSession.estado == estado)
    total = int(await db.scalar(
        select(func.count(AnalyticsWorkSession.id)).where(*filters)
    ) or 0)
    rows = list(await db.scalars(
        select(AnalyticsWorkSession)
        .where(*filters)
        .order_by(AnalyticsWorkSession.started_at.desc())
        .limit(limit)
        .offset(offset)
    ))
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [_work_session_payload(item) for item in rows],
    }


def _summarize_observed_work_sessions(rows: list) -> dict:
    """Compara promedios por unidad; nunca imputa faltantes ni recorta deterioros."""
    completed = [
        row for row in rows
        if row.estado == "completed" and row.condicion in WORK_SESSION_CONDITIONS
    ]
    groups: dict[tuple[str, str], dict[str, list[int]]] = {}
    for row in completed:
        if row.evaluacion_id:
            unit = ("evaluacion", str(row.evaluacion_id))
        elif row.calificacion_id:
            unit = ("calificacion", str(row.calificacion_id))
        elif row.batch_job_id:
            unit = ("lote", str(row.batch_job_id))
        else:
            continue
        groups.setdefault(unit, {"manual": [], "asistida": []})[row.condicion].append(
            int(row.duracion_confirmada_ms)
        )

    paired = [values for values in groups.values() if values["manual"] and values["asistida"]]
    coverage = {
        "sesiones_manual": sum(1 for row in completed if row.condicion == "manual"),
        "sesiones_asistida": sum(1 for row in completed if row.condicion == "asistida"),
        "unidades_comparables": len(paired),
        "incertidumbre_ms": sum(int(row.incertidumbre_ms) for row in completed),
    }
    base = {
        "metodo": "promedios_pareados_por_unidad",
        "cobertura": coverage,
        "datos_suficientes": False,
        "motivo_no_disponible": "Faltan mediciones manuales y asistidas comparables",
        "tiempo_manual_promedio_ms": None,
        "tiempo_asistido_promedio_ms": None,
        "ahorro_ms": None,
        "ahorro_porcentaje": None,
    }
    if not paired:
        return base

    manual_mean = sum(sum(item["manual"]) / len(item["manual"]) for item in paired) / len(paired)
    assisted_mean = sum(sum(item["asistida"]) / len(item["asistida"]) for item in paired) / len(paired)
    if manual_mean <= 0:
        return {
            **base,
            "motivo_no_disponible": "La línea base manual comparable es cero",
            "tiempo_manual_promedio_ms": round(manual_mean),
            "tiempo_asistido_promedio_ms": round(assisted_mean),
        }
    savings = manual_mean - assisted_mean
    return {
        **base,
        "datos_suficientes": True,
        "motivo_no_disponible": None,
        "tiempo_manual_promedio_ms": round(manual_mean),
        "tiempo_asistido_promedio_ms": round(assisted_mean),
        "ahorro_ms": round(savings),
        "ahorro_porcentaje": round((savings / manual_mean) * 100, 2),
    }


async def _get_observed_work_summary(
    db: AsyncSession,
    *,
    profesor_id: UUID,
    desde: datetime,
    hasta: datetime,
    materia_id: UUID | None,
) -> dict:
    stmt = select(AnalyticsWorkSession).where(
        AnalyticsWorkSession.actor_id == profesor_id,
        AnalyticsWorkSession.started_at >= desde,
        AnalyticsWorkSession.started_at <= hasta,
    )
    if materia_id is not None:
        stmt = stmt.join(
            Evaluacion,
            Evaluacion.id == AnalyticsWorkSession.evaluacion_id,
        ).where(Evaluacion.materia_id == materia_id)
    rows = list(await db.scalars(stmt))
    return _summarize_observed_work_sessions(rows)


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

    # ── Tiempo histórico estimado (compatibilidad, no evidencia de impacto) ──
    TIEMPO_MANUAL_POR_ENTREGA = 180  # segundos
    tiempo_real = time_data.get("total_segundos", 0)
    tiempo_manual = total * TIEMPO_MANUAL_POR_ENTREGA
    tiempo_ahorrado = max(0, tiempo_manual - tiempo_real)
    if settings.TEACHER_WORK_TIMING_ENABLED:
        observed_work = await _get_observed_work_summary(
            db,
            profesor_id=profesor_id,
            desde=desde,
            hasta=hasta,
            materia_id=materia_id,
        )
    else:
        observed_work = _summarize_observed_work_sessions([])
        observed_work["motivo_no_disponible"] = "La medición observada no está habilitada"

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
            # Campo legado: mantener hasta retirar consumidores antiguos.
            "tiempo_estimado_ahorrado_segundos": tiempo_ahorrado,
            "entregas_con_tiempo": time_data.get("conteo", 0),
            "estimacion_historica": {
                "metodo": "supuesto_180_segundos_por_entrega",
                "ahorro_segundos": tiempo_ahorrado,
                "es_evidencia_observada": False,
            },
            "tiempos_observados": observed_work,
        },
    }


async def _calculate_review_time(
    db: AsyncSession,
    profesor_id: UUID,
    desde: datetime,
    hasta: datetime,
    materia_id: UUID | None = None,
) -> dict:
    """Calcula intervalos históricos sin descartar duraciones ni duplicar aperturas."""
    event_filters = [
        AnalyticsEvento.actor_id == profesor_id,
        AnalyticsEvento.created_at >= desde,
        AnalyticsEvento.created_at <= hasta,
    ]
    if materia_id:
        event_filters.append(Evaluacion.materia_id == materia_id)
    opened = await db.execute(
        select(AnalyticsEvento.calificacion_id, AnalyticsEvento.created_at)
        .join(Calificacion, Calificacion.id == AnalyticsEvento.calificacion_id)
        .join(Evaluacion, Evaluacion.id == Calificacion.evaluacion_id)
        .where(
            AnalyticsEvento.tipo == "calificacion_opened",
            *event_filters,
        )
        .order_by(AnalyticsEvento.created_at)
    )
    completed = await db.execute(
        select(AnalyticsEvento.calificacion_id, AnalyticsEvento.created_at)
        .join(Calificacion, Calificacion.id == AnalyticsEvento.calificacion_id)
        .join(Evaluacion, Evaluacion.id == Calificacion.evaluacion_id)
        .where(
            AnalyticsEvento.tipo.in_(("calificacion_confirmed", "grade_adjusted")),
            *event_filters,
        )
        .order_by(AnalyticsEvento.created_at)
    )
    return _summarize_review_events(opened.all(), completed.all())


def _summarize_review_events(opened_rows: list, completed_rows: list) -> dict:
    """Empareja aperturas/cierres: un duplicado de pestaña no reinicia el reloj."""
    timeline: list[tuple[datetime, str, str]] = []
    for row in opened_rows:
        if row.calificacion_id:
            timeline.append((row.created_at, "open", str(row.calificacion_id)))
    for row in completed_rows:
        if row.calificacion_id:
            timeline.append((row.created_at, "complete", str(row.calificacion_id)))
    timeline.sort(key=lambda item: (item[0], 0 if item[1] == "open" else 1))
    active: dict[str, datetime] = {}
    total_segundos = 0
    conteo = 0
    for timestamp, action, grade_id in timeline:
        if action == "open":
            active.setdefault(grade_id, timestamp)
            continue
        started = active.pop(grade_id, None)
        if started is None:
            continue
        delta = max(0, int((timestamp - started).total_seconds()))
        total_segundos += delta
        conteo += 1

    promedio = total_segundos / conteo if conteo > 0 else 0
    return {
        "total_segundos": int(total_segundos),
        "promedio_segundos": promedio,
        "conteo": conteo,
        "incompletos": len(active),
    }


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
            return {"sample_size": 0, "average_ms": 0, "p50_ms": 0, "p90_ms": 0, "p95_ms": 0, "sufficient_data": False}
        s = sorted(vals)
        n = len(s)
        return {
            "sample_size": n,
            "average_ms": round(sum(s) / n, 1),
            "p50_ms": s[int(n * 0.5)],
            "p90_ms": s[int(n * 0.9)],
            "p95_ms": s[int(n * 0.95)],
            "sufficient_data": n >= 10,
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

    return {
        "total": total_stats,
        "stages": stages,
        "measurement_source": "inferred",
        "measurement_quality": "aggregated_from_resultado_json",
    }


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
        "total_incidencias": total_incidencias,
        "tasa_incidencias": error_rate,
        "por_tipo": errores_por_tipo,
        "alertas_modelo": alerta_counts,
        "measurement_source": "incidencias_y_alertas",
        "measurement_quality": "partial_no_retries",
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


async def get_costs_summary(
    db: AsyncSession,
    profesor_id: UUID,
    materia_id: UUID | None = None,
    evaluacion_id: UUID | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> dict:
    """Costos agregados de uso de IA.

    Retorna total, por proveedor, por modelo, por funcionalidad,
    y serie mensual.
    """
    desde, hasta = _default_date_range()
    if fecha_desde: desde = fecha_desde
    if fecha_hasta: hasta = fecha_hasta

    from sqlalchemy import text

    # ── Scope: profesor ve solo sus evaluaciones, admin ve todo ──
    # We join through evaluaciones to filter by profesor

    where_params: dict = {"desde": desde, "hasta": hasta}
    where_clauses = ["e.created_at >= :desde", "e.created_at <= :hasta"]
    if evaluacion_id:
        where_clauses.append("e.evaluacion_id = :evaluacion_id")
        where_params["evaluacion_id"] = str(evaluacion_id)
    else:
        # Filter by profesor's evaluations
        where_clauses.append(
            "e.evaluacion_id IN (SELECT ev.id FROM evaluaciones ev WHERE ev.profesor_id = :profesor_id)"
        )
        where_params["profesor_id"] = str(profesor_id)
        if materia_id:
            where_clauses.append(
                "e.evaluacion_id IN (SELECT ev.id FROM evaluaciones ev WHERE ev.materia_id = :materia_id)"
            )
            where_params["materia_id"] = str(materia_id)

    where_sql = " AND ".join(where_clauses)

    # ── Total ──
    total_row = await db.execute(
        text(f"""
            SELECT
                COUNT(*) AS total_calls,
                COALESCE(SUM(e.cost), 0) AS total_cost,
                COALESCE(SUM(e.input_tokens), 0) AS total_input_tokens,
                COALESCE(SUM(e.output_tokens), 0) AS total_output_tokens
            FROM ai_usage_events e
            WHERE {where_sql}
        """),
        where_params,
    )
    total = dict(total_row.mappings().first() or {})

    # ── By provider ──
    prov_rows = await db.execute(
        text(f"""
            SELECT
                COALESCE(e.provider, 'unknown') AS provider,
                COUNT(*) AS calls,
                COALESCE(SUM(e.cost), 0) AS cost,
                COALESCE(SUM(e.input_tokens), 0) AS input_tokens,
                COALESCE(SUM(e.output_tokens), 0) AS output_tokens,
                COUNT(*) FILTER (WHERE e.status = 'error') AS errors
            FROM ai_usage_events e
            WHERE {where_sql}
            GROUP BY e.provider
            ORDER BY cost DESC
        """),
        where_params,
    )
    by_provider = [dict(r) for r in prov_rows.mappings()]

    # ── By model ──
    model_rows = await db.execute(
        text(f"""
            SELECT
                COALESCE(e.model, 'unknown') AS model,
                COALESCE(e.provider, 'unknown') AS provider,
                COUNT(*) AS calls,
                COALESCE(SUM(e.cost), 0) AS cost,
                COALESCE(SUM(e.input_tokens), 0) AS input_tokens,
                COALESCE(SUM(e.output_tokens), 0) AS output_tokens
            FROM ai_usage_events e
            WHERE {where_sql}
            GROUP BY e.model, e.provider
            ORDER BY cost DESC
        """),
        where_params,
    )
    by_model = [dict(r) for r in model_rows.mappings()]

    # ── By feature ──
    feat_rows = await db.execute(
        text(f"""
            SELECT
                e.feature,
                COUNT(*) AS calls,
                COALESCE(SUM(e.cost), 0) AS cost,
                COALESCE(SUM(e.input_tokens), 0) AS input_tokens,
                COALESCE(SUM(e.output_tokens), 0) AS output_tokens
            FROM ai_usage_events e
            WHERE {where_sql}
            GROUP BY e.feature
            ORDER BY cost DESC
        """),
        where_params,
    )
    by_feature = [dict(r) for r in feat_rows.mappings()]

    # ── Monthly trend (last 12 months) ──
    monthly_rows = await db.execute(
        text(f"""
            SELECT
                DATE_TRUNC('month', e.created_at) AS month,
                COUNT(*) AS calls,
                COALESCE(SUM(e.cost), 0) AS cost
            FROM ai_usage_events e
            WHERE {where_sql}
            GROUP BY DATE_TRUNC('month', e.created_at)
            ORDER BY month ASC
        """),
        where_params,
    )
    monthly = [
        {
            "month": str(r.month),
            "calls": r.calls,
            "cost": float(r.cost) if r.cost else 0,
        }
        for r in monthly_rows
    ]

    # ── Cost versioning info ──
    pricing_note = "Costos estimados según catálogo de precios v1.0. Los precios pueden diferir de la factura real del proveedor."

    return {
        "periodo": {"desde": desde.isoformat(), "hasta": hasta.isoformat()},
        "total": {
            "calls": int(total["total_calls"]),
            "cost": float(total["total_cost"]),
            "input_tokens": int(total["total_input_tokens"]),
            "output_tokens": int(total["total_output_tokens"]),
        },
        "by_provider": [
            {
                "provider": r["provider"],
                "calls": int(r["calls"]),
                "cost": float(r["cost"]),
                "input_tokens": int(r["input_tokens"]),
                "output_tokens": int(r["output_tokens"]),
                "errors": int(r["errors"]),
            }
            for r in by_provider
        ],
        "by_model": [
            {
                "model": r["model"],
                "provider": r["provider"],
                "calls": int(r["calls"]),
                "cost": float(r["cost"]),
                "input_tokens": int(r["input_tokens"]),
                "output_tokens": int(r["output_tokens"]),
            }
            for r in by_model
        ],
        "by_feature": [
            {
                "feature": r["feature"],
                "calls": int(r["calls"]),
                "cost": float(r["cost"]),
                "input_tokens": int(r["input_tokens"]),
                "output_tokens": int(r["output_tokens"]),
            }
            for r in by_feature
        ],
        "monthly": monthly,
        "pricing_note": pricing_note,
    }


async def get_costs_by_provider_comparison(
    db: AsyncSession,
    profesor_id: UUID,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> list[dict]:
    """Comparación de costos entre proveedores para el mismo período."""
    desde, hasta = _default_date_range()
    if fecha_desde: desde = fecha_desde
    if fecha_hasta: hasta = fecha_hasta

    from sqlalchemy import text

    rows = await db.execute(
        text("""
            SELECT
                COALESCE(e.provider, 'unknown') AS provider,
                COUNT(*) AS calls,
                COALESCE(SUM(e.cost), 0) AS cost,
                COALESCE(SUM(e.input_tokens), 0) AS total_input,
                COALESCE(SUM(e.output_tokens), 0) AS total_output,
                COALESCE(AVG(e.latency_ms), 0) AS avg_latency_ms,
                COUNT(*) FILTER (WHERE e.status = 'error') AS errors,
                COUNT(DISTINCT e.model) AS models_used
            FROM ai_usage_events e
            WHERE e.created_at >= :desde AND e.created_at <= :hasta
            GROUP BY e.provider
            ORDER BY cost DESC
        """),
        {"desde": desde, "hasta": hasta},
    )
    return [
        {
            "provider": r.provider,
            "calls": int(r.calls),
            "cost": float(r.cost),
            "total_input_tokens": int(r.total_input),
            "total_output_tokens": int(r.total_output),
            "avg_latency_ms": float(r.avg_latency_ms),
            "errors": int(r.errors),
            "models_used": int(r.models_used),
        }
        for r in rows
    ]
