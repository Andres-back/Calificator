from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.permissions import get_current_user, require_role
from app.db.session import get_db
from app.modules.impacto_tesis.kappa_service import cohen_kappa
from app.modules.impacto_tesis.models import ImpactObservation, ImpactStudy
from app.modules.impacto_tesis.schemas import (
    ObservationBatch,
    ObservationWrite,
    RetentionApply,
    StudyActivate,
    StudyClose,
    StudyCreate,
    StudyGrantRevoke,
    StudyGrantWrite,
    SurveyPayload,
    SurveySubmit,
)
from app.modules.impacto_tesis.service import (
    activation_missing,
    batch_digest,
    require_batch_size,
    create_owner_grants,
    has_grant,
    minimized_observation,
    now_utc,
    participant_pseudonym,
    pseudonym,
    public_study,
    require_study_grant,
    study_indicators,
    validate_batch_scope,
    valid_grant_target,
)
from app.modules.authorization.service import ensure_permission
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/impacto", tags=["impacto_tesis"])


async def _study(db: AsyncSession, study_id: UUID, *, lock: bool = False) -> ImpactStudy:
    statement = select(ImpactStudy).where(ImpactStudy.id == study_id)
    if lock:
        statement = statement.with_for_update()
    item = await db.scalar(statement)
    if item is None:
        raise HTTPException(status_code=404, detail="Estudio no encontrado")
    return item


def _version(study: ImpactStudy, expected: int) -> None:
    if study.version != expected:
        raise HTTPException(status_code=409, detail={"code": "study_version_conflict", "current_version": study.version})


async def _admin_permission(
    db: AsyncSession, user: User, permission: str, *, require_feature: bool = True,
) -> None:
    if require_feature and not settings.IMPACT_STUDY_ENABLED:
        raise HTTPException(status_code=404, detail="El módulo de estudio de impacto no está habilitado")
    require_role(user, [UserRole.ADMIN])
    await ensure_permission(db, user, permission)


async def _observation_access(
    db: AsyncSession, user: User, study: ImpactStudy, *, write: bool,
) -> str | None:
    """Retorna el seudónimo que limita a un docente; admin autorizado retorna None."""
    if not settings.IMPACT_STUDY_ENABLED:
        raise HTTPException(status_code=404, detail="El módulo de estudio de impacto no está habilitado")
    if user.rol == UserRole.ADMIN.value:
        await ensure_permission(db, user, "reports.read")
        require_study_grant(study, user, "manage" if write else "read")
        return None
    if user.rol != UserRole.PROFESOR.value:
        raise HTTPException(status_code=403, detail="No tienes acceso a observaciones del estudio")
    await ensure_permission(db, user, "reports.read")
    assigned = participant_pseudonym(study, user.id)
    if assigned is None:
        raise HTTPException(status_code=403, detail="No participas en este estudio")
    if write and study.estado != "active":
        raise HTTPException(status_code=409, detail="El estudio no está activo para recopilar observaciones")
    return assigned


@router.get("/estudios/disponibilidad")
async def study_availability(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Expone solo disponibilidad; nunca concede acceso a conjuntos de estudio."""
    await _admin_permission(db, current_user, "reports.read", require_feature=False)
    return {"enabled": settings.IMPACT_STUDY_ENABLED}


@router.post("/estudios", status_code=status.HTTP_201_CREATED)
async def create_study(
    payload: StudyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _admin_permission(db, current_user, "admin_settings.manage")
    if payload.previous_study_id is not None and await db.get(ImpactStudy, payload.previous_study_id) is None:
        raise HTTPException(status_code=422, detail="La versión anterior no existe")
    participants: list[dict] = []
    if payload.teacher_ids:
        teachers = list(await db.scalars(select(User).where(User.id.in_(payload.teacher_ids))))
        valid = {teacher.id for teacher in teachers if teacher.rol == UserRole.PROFESOR.value}
        missing = [str(item) for item in payload.teacher_ids if item not in valid]
        if missing:
            raise HTTPException(status_code=422, detail={"code": "invalid_teacher_participants", "ids": missing})
        participants = [{"user_id": str(teacher_id), "pseudonym": pseudonym()} for teacher_id in payload.teacher_ids]
    study = ImpactStudy(
        owner_admin_id=current_user.id,
        previous_study_id=payload.previous_study_id,
        nombre=payload.nombre,
        synthetic_only=True,
        protocol_json=payload.protocol.model_dump(mode="json"),
        participants_json=participants,
        access_grants_json=create_owner_grants(current_user.id),
    )
    db.add(study)
    await db.commit()
    await db.refresh(study)
    return public_study(study, detail=True)


@router.get("/estudios")
async def list_studies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    await _admin_permission(db, current_user, "reports.read")
    rows = list(await db.scalars(select(ImpactStudy).order_by(ImpactStudy.created_at.desc()).limit(200)))
    return [public_study(item) for item in rows if has_grant(item, current_user.id, "read", real_data=not item.synthetic_only)]


@router.get("/estudios/{study_id}")
async def get_study(
    study_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _admin_permission(db, current_user, "reports.read")
    study = await _study(db, study_id)
    require_study_grant(study, current_user, "read")
    return public_study(study, detail=True)


@router.post("/estudios/{study_id}/concesiones", status_code=201)
async def grant_study_access(
    study_id: UUID,
    payload: StudyGrantWrite,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _admin_permission(db, current_user, "admin_settings.manage")
    study = await _study(db, study_id, lock=True)
    require_study_grant(study, current_user, "manage")
    _version(study, payload.expected_version)
    target = await db.get(User, payload.user_id)
    if not valid_grant_target(target):
        raise HTTPException(status_code=422, detail="La concesión solo puede asignarse a un administrador activo")
    entry = {
        "kind": "grant", "grant_id": str(uuid4()), "user_id": str(payload.user_id),
        "actions": sorted(set(payload.actions)), "scope": payload.scope,
        "granted_by": str(current_user.id), "granted_at": now_utc().isoformat(),
        "valid_until": payload.valid_until.isoformat() if payload.valid_until else None,
    }
    study.access_grants_json = [*(study.access_grants_json or []), entry]
    study.version += 1
    await db.commit()
    return {"grant_id": entry["grant_id"], "version": study.version}


@router.post("/estudios/{study_id}/concesiones/revocar")
async def revoke_study_access(
    study_id: UUID,
    payload: StudyGrantRevoke,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _admin_permission(db, current_user, "admin_settings.manage")
    study = await _study(db, study_id, lock=True)
    require_study_grant(study, current_user, "manage")
    _version(study, payload.expected_version)
    grants = list(study.access_grants_json or [])
    if not any(item.get("kind") == "grant" and str(item.get("grant_id")) == str(payload.grant_id) for item in grants):
        raise HTTPException(status_code=404, detail="Concesión no encontrada")
    grants.append({
        "kind": "revocation", "grant_id": str(payload.grant_id),
        "revoked_by": str(current_user.id), "revoked_at": now_utc().isoformat(),
        "reason": payload.reason,
    })
    study.access_grants_json = grants
    study.version += 1
    await db.commit()
    return {"status": "revoked", "version": study.version}


@router.post("/estudios/{study_id}/activar")
async def activate_study(
    study_id: UUID,
    payload: StudyActivate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _admin_permission(db, current_user, "admin_settings.manage")
    study = await _study(db, study_id, lock=True)
    require_study_grant(study, current_user, "manage")
    _version(study, payload.expected_version)
    if study.estado != "draft":
        raise HTTPException(status_code=409, detail="Solo un borrador puede activarse")
    missing = activation_missing(
        study, real_data=payload.real_data,
        authorization_reference=payload.authorization_reference, retention_days=payload.retention_days,
    )
    if missing:
        raise HTTPException(status_code=422, detail={"code": "incomplete_study_protocol", "missing": missing})
    if payload.real_data and not has_grant(study, current_user.id, "manage", real_data=True):
        raise HTTPException(status_code=403, detail="La activación real exige una concesión manage de alcance real")
    study.synthetic_only = not payload.real_data
    study.authorization_reference = payload.authorization_reference if payload.real_data else None
    study.retention_policy_json = ({
        "days": payload.retention_days, "configured_at": now_utc().isoformat(),
        "configured_by": str(current_user.id),
    } if payload.retention_days else {})
    study.estado = "active"
    study.version += 1
    await db.commit()
    return public_study(study, detail=True)


@router.post("/estudios/{study_id}/cerrar")
async def close_study(
    study_id: UUID, payload: StudyClose,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
) -> dict:
    await _admin_permission(db, current_user, "admin_settings.manage")
    study = await _study(db, study_id, lock=True)
    require_study_grant(study, current_user, "manage")
    _version(study, payload.expected_version)
    if study.estado != "active":
        raise HTTPException(status_code=409, detail="Solo un estudio activo puede cerrarse")
    study.estado, study.closed_at, study.version = "closed", now_utc(), study.version + 1
    await db.commit()
    return public_study(study, detail=True)


@router.post("/estudios/{study_id}/observaciones", status_code=201)
async def import_observations(
    study_id: UUID, payload: ObservationBatch,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
) -> dict:
    require_batch_size(payload)
    study = await _study(db, study_id, lock=True)
    teacher_scope = await _observation_access(db, current_user, study, write=True)
    if teacher_scope is not None and any(row.teacher_pseudonym != teacher_scope for row in payload.rows):
        raise HTTPException(status_code=403, detail="Un docente solo puede aportar sus observaciones asignadas")
    computed = batch_digest(payload.instrument_version, payload.rows)
    if computed != payload.digest:
        raise HTTPException(status_code=422, detail={"code": "digest_mismatch"})
    batches = list(study.import_batches_json or [])
    replay = next((item for item in batches if item.get("import_id") == payload.import_id), None)
    if replay:
        if replay.get("digest") != payload.digest:
            raise HTTPException(status_code=409, detail="El import_id ya existe con otro contenido")
        return {**replay.get("result", {}), "replayed": True, "version": study.version}
    _version(study, payload.expected_version)
    if study.estado == "closed" or (not study.synthetic_only and study.estado != "active"):
        raise HTTPException(status_code=409, detail="El conjunto no admite observaciones")
    validate_batch_scope(study, payload.instrument_version, payload.rows)

    external_ids = [row.external_id for row in payload.rows]
    existing = list(await db.scalars(
        select(ImpactObservation).where(
            ImpactObservation.study_id == study.id, ImpactObservation.external_id.in_(external_ids),
        ).order_by(ImpactObservation.external_id, ImpactObservation.revision)
    ))
    by_external: dict[str, list[ImpactObservation]] = {}
    for item in existing:
        by_external.setdefault(item.external_id, []).append(item)
    created = 0
    for row in payload.rows:
        previous = by_external.get(row.external_id, [])
        same_revision = next((item for item in previous if item.revision == row.revision), None)
        serialized = row.payload.model_dump(mode="json")
        if same_revision:
            same = (
                same_revision.payload_json == serialized
                and same_revision.teacher_pseudonym == row.teacher_pseudonym
                and same_revision.work_key == row.work_key
                and same_revision.response_key == row.response_key
                and same_revision.evaluation_id == row.evaluation_id
                and same_revision.grade_id == row.grade_id
                and same_revision.condition == row.condition
                and same_revision.observed_at == row.observed_at.replace(tzinfo=None)
                and same_revision.missing_reason == row.missing_reason
                and same_revision.exclusion_reason == row.exclusion_reason
            )
            if not same:
                raise HTTPException(status_code=409, detail={"code": "observation_revision_conflict", "external_id": row.external_id})
            continue
        supersedes = previous[-1] if previous else None
        if previous and (row.revision <= previous[-1].revision or row.supersedes_external_id != row.external_id):
            raise HTTPException(status_code=409, detail={"code": "explicit_revision_required", "external_id": row.external_id})
        item = ImpactObservation(
            id=uuid4(),
            study_id=study.id, import_batch_id=payload.import_id, external_id=row.external_id,
            revision=row.revision, supersedes_id=supersedes.id if supersedes else None,
            teacher_pseudonym=row.teacher_pseudonym, work_key=row.work_key, response_key=row.response_key,
            evaluation_id=row.evaluation_id, grade_id=row.grade_id, condition=row.condition,
            observed_at=row.observed_at.replace(tzinfo=None), payload_json=serialized,
            missing_reason=row.missing_reason, exclusion_reason=row.exclusion_reason, created_by=current_user.id,
        )
        db.add(item)
        by_external.setdefault(row.external_id, []).append(item)
        created += 1
    result = {"import_id": payload.import_id, "accepted": len(payload.rows), "created": created}
    batches.append({
        "import_id": payload.import_id, "digest": payload.digest,
        "instrument_version": payload.instrument_version, "actor_id": str(current_user.id),
        "created_at": now_utc().isoformat(), "result": result,
    })
    study.import_batches_json = batches
    study.version += 1
    await db.commit()
    return {**result, "replayed": False, "version": study.version}


@router.get("/estudios/{study_id}/observaciones")
async def list_observations(
    study_id: UUID, page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
) -> dict:
    study = await _study(db, study_id)
    teacher_scope = await _observation_access(db, current_user, study, write=False)
    filters = [ImpactObservation.study_id == study.id]
    if teacher_scope is not None:
        filters.append(ImpactObservation.teacher_pseudonym == teacher_scope)
    total = int(await db.scalar(select(func.count(ImpactObservation.id)).where(*filters)) or 0)
    rows = list(await db.scalars(
        select(ImpactObservation).where(*filters)
        .order_by(ImpactObservation.created_at, ImpactObservation.id)
        .offset((page - 1) * page_size).limit(page_size)
    ))
    return {"items": [minimized_observation(item) for item in rows], "page": page, "page_size": page_size, "total": total}


@router.get("/estudios/{study_id}/export")
async def export_study(
    study_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
) -> dict:
    await _admin_permission(db, current_user, "reports.read")
    study = await _study(db, study_id)
    require_study_grant(study, current_user, "export")
    rows = list(await db.scalars(
        select(ImpactObservation).where(ImpactObservation.study_id == study.id)
        .order_by(ImpactObservation.external_id, ImpactObservation.revision)
    ))
    return {
        "manifest": {
            "study": public_study(study, detail=True),
            "protocol_version": study.version,
            "exported_at": now_utc().isoformat(),
            "observation_count": len(rows),
            "contains_identity_map": False,
            "contains_academic_evidence": False,
        },
        "indicators": study_indicators(rows, study.protocol_json or {}),
        "observations": [minimized_observation(item) for item in rows],
    }


@router.get("/estudios/{study_id}/indicadores")
async def study_metrics(
    study_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
) -> dict:
    await _admin_permission(db, current_user, "reports.read")
    study = await _study(db, study_id)
    require_study_grant(study, current_user, "read")
    rows = list(await db.scalars(select(ImpactObservation).where(ImpactObservation.study_id == study.id)))
    return study_indicators(rows, study.protocol_json or {})


@router.post("/estudios/{study_id}/retencion/aplicar")
async def apply_retention(
    study_id: UUID, payload: RetentionApply,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
) -> dict:
    await _admin_permission(db, current_user, "admin_settings.manage")
    study = await _study(db, study_id, lock=True)
    require_study_grant(study, current_user, "manage")
    _version(study, payload.expected_version)
    if study.estado != "closed":
        raise HTTPException(status_code=409, detail="La retención solo se aplica a un estudio cerrado")
    removed = 0
    if payload.delete_observations:
        # El vínculo entre revisiones pertenece exclusivamente al estudio. Se
        # desacopla antes del borrado para respetar su FK RESTRICT sin tocar
        # entregas, evidencias ni calificaciones académicas.
        await db.execute(
            update(ImpactObservation)
            .where(ImpactObservation.study_id == study.id)
            .values(supersedes_id=None)
        )
        result = await db.execute(delete(ImpactObservation).where(ImpactObservation.study_id == study.id))
        removed = int(result.rowcount or 0)
    audit = {
        "event_id": str(uuid4()), "action": "delete_study_observations" if payload.delete_observations else "retain",
        "actor_id": str(current_user.id), "at": now_utc().isoformat(), "reason": payload.reason, "count": removed,
    }
    study.retention_audit_json = [*(study.retention_audit_json or []), audit]
    study.version += 1
    await db.commit()
    return {"status": "applied", "removed_observations": removed, "version": study.version, "academic_records_changed": False}


@router.get("/tiempo-ahorrado")
async def tiempo_ahorrado(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Estima tiempo ahorrado: cada calificación IA ~ 3 min vs manual ~ 10 min."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    result = await db.execute(
        text(
            "SELECT COUNT(*) as total FROM calificaciones "
            "WHERE profesor_id=:p AND nota_sugerida IS NOT NULL"
        ),
        {"p": str(current_user.id)},
    )
    total = result.scalar() or 0
    tiempo_manual_min = total * 10
    tiempo_con_ia_min = total * 3
    ahorro_min = tiempo_manual_min - tiempo_con_ia_min
    return {
        "total_calificaciones_ia": total,
        "tiempo_manual_estimado_min": tiempo_manual_min,
        "tiempo_con_ia_estimado_min": tiempo_con_ia_min,
        "ahorro_estimado_min": ahorro_min,
        "ahorro_porcentaje": round(ahorro_min / tiempo_manual_min * 100, 1) if tiempo_manual_min else 0,
    }


@router.get("/kappa")
async def kappa_ia_docente(
    materia_id: UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Kappa de Cohen entre nota sugerida IA y nota confirmada docente."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    where = "WHERE nota_sugerida IS NOT NULL AND nota_confirmada IS NOT NULL AND profesor_id=:p"
    params: dict = {"p": str(current_user.id)}
    if materia_id:
        where += " AND materia_id=:m"
        params["m"] = str(materia_id)

    rows = await db.execute(
        text(f"SELECT nota_sugerida, nota_confirmada FROM calificaciones {where}"), params
    )
    pairs = rows.fetchall()
    ia_notas = [float(r.nota_sugerida) for r in pairs]
    doc_notas = [float(r.nota_confirmada) for r in pairs]
    # Este histórico compara sugerencia con confirmación visible al docente;
    # no constituye una referencia independiente para la tesis.
    boundaries = [1, 2, 3, 4]
    kappa = cohen_kappa(ia_notas, doc_notas, boundaries=boundaries)
    return {
        "n": len(pairs),
        "kappa": round(kappa["value"], 4) if kappa["value"] is not None else None,
        "disponible": kappa["available"],
        "motivo_no_disponible": kappa["reason"],
        "interpretacion": _interpret_kappa(kappa["value"]),
        "referencia_independiente": False,
        "advertencia": "La confirmación docente pudo estar expuesta a la sugerencia de IA.",
    }


@router.post("/encuestas")
async def registrar_encuesta(
    payload: SurveySubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Persiste una encuesta validada dentro de un estudio autorizado."""
    row = ObservationWrite(
        external_id=payload.external_id,
        teacher_pseudonym=payload.teacher_pseudonym,
        work_key="survey",
        condition=payload.condition,
        observed_at=payload.observed_at,
        payload=SurveyPayload(
            type="survey",
            instrument_version=payload.instrument_version,
            responses=payload.responses,
        ),
    )
    digest = batch_digest(payload.instrument_version, [row])
    result = await import_observations(
        payload.study_id,
        ObservationBatch(
            expected_version=payload.expected_version,
            instrument_version=payload.instrument_version,
            import_id=f"survey-{payload.external_id}",
            digest=digest,
            rows=[row],
        ),
        current_user,
        db,
    )
    return {"status": "persisted", **result}


@router.get("/likert")
async def resumen_likert(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return {"message": "Encuestas Likert pendientes de configuración en el panel de tesis."}


@router.get("/cualitativo")
async def cualitativo(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    return {"message": "Análisis cualitativo disponible en el panel de tesis."}


def _interpret_kappa(k: float | None) -> str:
    if k is None:
        return "no disponible"
    if k < 0:
        return "sin acuerdo"
    if k < 0.20:
        return "leve"
    if k < 0.40:
        return "aceptable"
    if k < 0.60:
        return "moderado"
    if k < 0.80:
        return "sustancial"
    return "casi perfecto"
