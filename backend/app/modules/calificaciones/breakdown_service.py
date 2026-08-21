"""Servicio transaccional del desglose explicable de calificaciones."""
from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.modules.calificaciones.breakdown_models import CalificacionAjuste, CalificacionComponente, CalificacionDesglose
from app.modules.calificaciones.breakdown_policy import build_component_scaffold, calculate_formula, component_consensus, coverage_state
from app.modules.calificaciones.models import Calificacion
from app.modules.evaluaciones.models import Evaluacion
from app.modules.users.models import User
from app.shared.enums import CalificacionEstado


async def get_active_breakdown(db: AsyncSession, calificacion_id: UUID, *, lock: bool = False) -> CalificacionDesglose | None:
    query = select(CalificacionDesglose).options(selectinload(CalificacionDesglose.componentes)).where(
        CalificacionDesglose.calificacion_id == calificacion_id,
        CalificacionDesglose.activo.is_(True),
    )
    if lock:
        query = query.with_for_update()
    return await db.scalar(query)


def _component_dict(component: CalificacionComponente, *, student: bool = False, reveal_key: bool = False) -> dict:
    data = {
        "id": component.id,
        "clave": component.clave,
        "orden": component.orden,
        "tipo": component.tipo,
        "numero": component.numero,
        "titulo": component.titulo,
        "respuesta_estudiante": component.respuesta_estudiante,
        "respuesta_referencia": component.respuesta_referencia if (not student or reveal_key) else None,
        "puntos_obtenidos": component.puntos_obtenidos,
        "puntos_maximos": component.puntos_maximos,
        "estado": component.estado,
        "explicacion": component.explicacion_estudiante if student else component.explicacion_verificable,
        "explicacion_estudiante": None if student else component.explicacion_estudiante,
        "origen": component.origen,
        "requiere_revision": component.requiere_revision,
        "evidencia_paginas": list((component.evidencia_json or {}).get("paginas") or []),
    }
    if student:
        data["referencia_oculta"] = bool(component.respuesta_referencia and not reveal_key)
    else:
        data["valoraciones"] = list(component.valoraciones_json or [])
    return data


def serialize_breakdown(breakdown: CalificacionDesglose, *, student: bool = False, reveal_key: bool = False) -> dict:
    formula = {
        "puntos_obtenidos": breakdown.puntos_obtenidos,
        "puntos_posibles": breakdown.puntos_posibles,
        "nota_maxima": breakdown.nota_maxima,
        "nota_base": breakdown.nota_base,
        "ajuste_global": breakdown.ajuste_global,
        "nota_antes_redondeo": breakdown.nota_antes_redondeo,
        "regla_redondeo": breakdown.regla_redondeo,
        "decimales": breakdown.decimales,
        "nota_final": breakdown.nota_final,
    }
    global_detail = dict((breakdown.procedencia_json or {}).get("ajuste_global_detalle") or {})
    if student and global_detail:
        global_detail = {
            "valor": global_detail.get("valor"),
            "explicacion_estudiante": global_detail.get("explicacion_estudiante"),
        }
    payload = {
        "id": breakdown.id,
        "calificacion_id": breakdown.calificacion_id,
        "version": breakdown.version,
        "origen": breakdown.origen,
        "cobertura_estado": breakdown.cobertura_estado,
        "formula": formula,
        "ajuste_global_detalle": global_detail or None,
        "requiere_revision": breakdown.requiere_revision,
        "componentes": [_component_dict(item, student=student, reveal_key=reveal_key) for item in breakdown.componentes],
        "created_at": breakdown.created_at,
    }
    if student:
        payload.update({"nota_publicada": breakdown.nota_final, "claves_liberadas": reveal_key})
    else:
        payload["bloqueos"] = list(breakdown.bloqueos_json or [])
        payload["procedencia"] = dict(breakdown.procedencia_json or {})
    return payload


async def create_automatic_breakdown(
    db: AsyncSession,
    *,
    calificacion: Calificacion,
    blueprint: dict,
    raw_output: dict,
    pipeline_run_id: str | None = None,
) -> CalificacionDesglose | None:
    if not settings.EXPLAINABLE_GRADING_GENERATION_ENABLED or not hasattr(db, "flush"):
        return None
    await db.flush()
    if pipeline_run_id:
        existing_run = await db.scalar(select(CalificacionDesglose).options(selectinload(CalificacionDesglose.componentes)).where(
            CalificacionDesglose.calificacion_id == calificacion.id,
            CalificacionDesglose.pipeline_run_id == pipeline_run_id,
        ))
        if existing_run:
            return existing_run
    active = await get_active_breakdown(db, calificacion.id, lock=True)
    if active and (active.origen != "automatico" or calificacion.revisado_por_docente or calificacion.estado == CalificacionEstado.PUBLICADA.value):
        return active
    scaffold = build_component_scaffold(blueprint)
    if not scaffold:
        return None
    grader_a = dict(raw_output.get("grader_a") or {})
    grader_b = dict(raw_output.get("grader_b") or {})
    components, blockers = component_consensus(
        scaffold,
        list(grader_a.get("componentes") or []),
        list(grader_b.get("componentes") or []),
        list(raw_output.get("objective_validation") or []),
    )
    coverage = dict(raw_output.get("evidence_coverage") or {})
    if coverage.get("requiere_revision"):
        blockers.append("cobertura_evidencia_incompleta")
    state, component_blockers = coverage_state(components)
    blockers = list(dict.fromkeys([*blockers, *component_blockers]))
    if active:
        active.activo = False
        version = active.version + 1
    else:
        version = 1
    formula = calculate_formula(components, blueprint.get("nota_maxima", calificacion.nota_sugerida or 5))
    breakdown = CalificacionDesglose(
        calificacion_id=calificacion.id,
        version=version,
        pipeline_run_id=pipeline_run_id,
        origen="automatico",
        activo=True,
        cobertura_estado="incompleta" if blockers else state,
        puntos_obtenidos=formula["puntos_obtenidos"],
        puntos_posibles=formula["puntos_posibles"],
        nota_maxima=formula["nota_maxima"],
        nota_base=formula["nota_base"],
        ajuste_global=formula["ajuste_global"],
        nota_antes_redondeo=formula["nota_antes_redondeo"],
        regla_redondeo=formula["regla_redondeo"],
        decimales=formula["decimales"],
        nota_final=formula["nota_final"],
        requiere_revision=bool(blockers),
        bloqueos_json=blockers,
        procedencia_json={"orchestrator": raw_output.get("orchestrator"), "provider_policy": raw_output.get("provider_policy")},
    )
    breakdown.componentes = [CalificacionComponente(**item) for item in components]
    db.add(breakdown)
    await db.flush()
    result = dict(calificacion.resultado_json or {})
    result["desglose"] = {"id": str(breakdown.id), "version": version, "modo": "autoridad" if settings.EXPLAINABLE_GRADING_AUTHORITY_ENABLED else "controlado", "nota_calculada": float(breakdown.nota_final)}
    calificacion.resultado_json = result
    if settings.EXPLAINABLE_GRADING_AUTHORITY_ENABLED:
        calificacion.nota_sugerida = breakdown.nota_final
        if breakdown.requiere_revision:
            calificacion.estado = CalificacionEstado.REQUIERE_REVISION.value
    return breakdown


async def update_breakdown(db: AsyncSession, *, calificacion: Calificacion, expected_version: int, changes: list[dict], global_adjustment: dict | None, actor_id: UUID) -> CalificacionDesglose:
    active = await get_active_breakdown(db, calificacion.id, lock=True)
    if not changes and not global_adjustment:
        raise HTTPException(status_code=422, detail="Debes indicar al menos un cambio verificable.")
    if not active:
        raise HTTPException(status_code=404, detail="Esta calificación no tiene desglose verificable.")
    if active.version != expected_version:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El desglose cambió en otra sesión. Recarga y compara antes de guardar.")
    by_id = {str(item.id): item for item in active.componentes}
    change_map = {str(item["componente_id"]): item for item in changes}
    unknown = set(change_map) - set(by_id)
    if unknown:
        raise HTTPException(status_code=409, detail="Uno de los componentes ya no pertenece a la versión vigente.")
    new_components: list[dict] = []
    audit_rows: list[tuple[str, dict, dict, str, str]] = []
    for old in active.componentes:
        change = change_map.get(str(old.id))
        points = Decimal(str(change["puntos_obtenidos"])) if change else old.puntos_obtenidos
        if points is None or points < 0 or points > old.puntos_maximos:
            raise HTTPException(status_code=409, detail=f"Puntaje inválido para {old.clave}.")
        state = str(change.get("estado")) if change else old.estado
        explanation_student = str(change.get("explicacion_estudiante") or "").strip() if change else old.explicacion_estudiante
        if change and (not str(change.get("motivo_interno") or "").strip() or not explanation_student):
            raise HTTPException(status_code=422, detail="Cada cambio requiere motivo interno y explicación para el estudiante.")
        component = {"clave": old.clave, "orden": old.orden, "tipo": old.tipo, "numero": old.numero, "titulo": old.titulo, "respuesta_estudiante": old.respuesta_estudiante, "respuesta_referencia": old.respuesta_referencia, "puntos_obtenidos": points, "puntos_maximos": old.puntos_maximos, "estado": state, "explicacion_verificable": explanation_student or old.explicacion_verificable, "explicacion_estudiante": explanation_student, "origen": "docente" if change else old.origen, "requiere_revision": False if change else old.requiere_revision, "evidencia_json": dict(old.evidencia_json or {}), "valoraciones_json": list(old.valoraciones_json or [])}
        new_components.append(component)
        if change:
            audit_rows.append((old.clave, {"puntos": float(old.puntos_obtenidos or 0), "estado": old.estado}, {"puntos": float(points), "estado": state}, str(change["motivo_interno"]).strip(), explanation_student or ""))
    adjustment = Decimal(str(global_adjustment.get("valor", 0))) if global_adjustment else active.ajuste_global
    if global_adjustment and (not str(global_adjustment.get("motivo_interno") or "").strip() or not str(global_adjustment.get("explicacion_estudiante") or "").strip()):
        raise HTTPException(status_code=422, detail="El ajuste global requiere motivo interno y explicación para el estudiante.")
    formula = calculate_formula(new_components, active.nota_maxima, adjustment, active.decimales)
    coverage, blockers = coverage_state(new_components)
    provenance = dict(active.procedencia_json or {})
    provenance["version_anterior"] = active.version
    if global_adjustment:
        provenance["ajuste_global_detalle"] = {
            "valor": float(adjustment),
            "motivo_interno": str(global_adjustment["motivo_interno"]).strip(),
            "explicacion_estudiante": str(global_adjustment["explicacion_estudiante"]).strip(),
            "actor_id": str(actor_id),
        }
    active.activo = False
    new = CalificacionDesglose(calificacion_id=calificacion.id, version=active.version + 1, origen="docente", activo=True, cobertura_estado=coverage, puntos_obtenidos=formula["puntos_obtenidos"], puntos_posibles=formula["puntos_posibles"], nota_maxima=formula["nota_maxima"], nota_base=formula["nota_base"], ajuste_global=formula["ajuste_global"], nota_antes_redondeo=formula["nota_antes_redondeo"], regla_redondeo=formula["regla_redondeo"], decimales=formula["decimales"], nota_final=formula["nota_final"], requiere_revision=bool(blockers), bloqueos_json=blockers, procedencia_json=provenance, creado_por=actor_id)
    new.componentes = [CalificacionComponente(**item) for item in new_components]
    db.add(new)
    await db.flush()
    for key, before, after, reason, explanation in audit_rows:
        db.add(CalificacionAjuste(calificacion_id=calificacion.id, desglose_anterior_id=active.id, desglose_nuevo_id=new.id, componente_clave=key, tipo="componente", valor_anterior_json=before, valor_nuevo_json=after, motivo_interno=reason, explicacion_estudiante=explanation, actor_id=actor_id))
    if global_adjustment:
        db.add(CalificacionAjuste(calificacion_id=calificacion.id, desglose_anterior_id=active.id, desglose_nuevo_id=new.id, componente_clave=None, tipo="global", valor_anterior_json={"valor": float(active.ajuste_global)}, valor_nuevo_json={"valor": float(adjustment)}, motivo_interno=str(global_adjustment["motivo_interno"]).strip(), explicacion_estudiante=str(global_adjustment["explicacion_estudiante"]).strip(), actor_id=actor_id))
    calificacion.nota_confirmada = new.nota_final
    calificacion.revisado_por_docente = True
    calificacion.estado = (CalificacionEstado.PUBLICADA.value if calificacion.estado == CalificacionEstado.PUBLICADA.value else CalificacionEstado.AJUSTADA.value)
    await db.commit()
    return await get_active_breakdown(db, calificacion.id)  # type: ignore[return-value]


def student_breakdown_is_publishable(calificacion: Calificacion, breakdown: CalificacionDesglose) -> bool:
    """Evita explicar al estudiante una nota distinta de la oficial durante el rollout controlado."""
    if settings.EXPLAINABLE_GRADING_AUTHORITY_ENABLED:
        return True
    official = calificacion.nota_confirmada
    if official is None:
        official = calificacion.nota_sugerida
    if official is None:
        return False
    return Decimal(str(official)) == Decimal(str(breakdown.nota_final))

def answers_released(evaluation: Evaluacion) -> bool:
    rules = dict(evaluation.blueprint.reglas_feedback or {}) if evaluation.blueprint else {}
    if "respuestas_liberadas" in rules:
        return bool(rules["respuestas_liberadas"])
    return not bool(evaluation.recepcion_habilitada)


async def set_answers_released(db: AsyncSession, evaluation: Evaluacion, released: bool) -> bool:
    if not evaluation.blueprint:
        raise HTTPException(status_code=409, detail="La evaluación no tiene mapa de respuestas.")
    rules = dict(evaluation.blueprint.reglas_feedback or {})
    rules["respuestas_liberadas"] = released
    evaluation.blueprint.reglas_feedback = rules
    await db.commit()
    return released


async def list_versions(db: AsyncSession, calificacion_id: UUID) -> list[dict]:
    rows = (await db.execute(
        select(CalificacionDesglose, User.nombre)
        .outerjoin(User, User.id == CalificacionDesglose.creado_por)
        .where(CalificacionDesglose.calificacion_id == calificacion_id)
        .order_by(CalificacionDesglose.version.desc())
    )).all()
    return [
        {
            "id": breakdown.id,
            "version": breakdown.version,
            "origen": breakdown.origen,
            "nota_final": breakdown.nota_final,
            "activo": breakdown.activo,
            "actor_nombre": actor_name,
            "created_at": breakdown.created_at,
        }
        for breakdown, actor_name in rows
    ]
async def create_manual_breakdown(
    db: AsyncSession,
    *,
    calificacion: Calificacion,
    nota_maxima: object,
    nota: object,
    motivo: str,
    actor_id: UUID | None,
    origin: str = "manual_docente",
) -> CalificacionDesglose | None:
    """Crea una explicación auditable para notas directas, ausencias y vencimientos."""
    if not settings.EXPLAINABLE_GRADING_GENERATION_ENABLED or not hasattr(db, "flush"):
        return None
    await db.flush()
    active = await get_active_breakdown(db, calificacion.id, lock=True)
    if active:
        active.activo = False
    scaffold = build_component_scaffold(
        {"nota_maxima": nota_maxima}, manual_key=origin
    )[0]
    points = Decimal(str(nota))
    maximum = Decimal(str(nota_maxima))
    component = {
        **scaffold,
        "respuesta_estudiante": None,
        "puntos_obtenidos": points,
        "estado": "correcta" if points == maximum else ("sin_respuesta" if points == 0 else "parcial"),
        "explicacion_verificable": motivo,
        "explicacion_estudiante": motivo,
        "origen": origin,
        "requiere_revision": False,
        "evidencia_json": {"paginas": []},
        "valoraciones_json": [],
    }
    formula = calculate_formula([component], maximum)
    breakdown = CalificacionDesglose(
        calificacion_id=calificacion.id,
        version=(active.version + 1) if active else 1,
        origen="manual",
        activo=True,
        cobertura_estado="completa",
        puntos_obtenidos=formula["puntos_obtenidos"],
        puntos_posibles=formula["puntos_posibles"],
        nota_maxima=formula["nota_maxima"],
        nota_base=formula["nota_base"],
        ajuste_global=formula["ajuste_global"],
        nota_antes_redondeo=formula["nota_antes_redondeo"],
        regla_redondeo=formula["regla_redondeo"],
        decimales=formula["decimales"],
        nota_final=formula["nota_final"],
        requiere_revision=False,
        bloqueos_json=[],
        procedencia_json={"origen": origin},
        creado_por=actor_id,
    )
    breakdown.componentes = [CalificacionComponente(**component)]
    db.add(breakdown)
    await db.flush()
    result = dict(calificacion.resultado_json or {})
    result["desglose"] = {"id": str(breakdown.id), "version": breakdown.version, "modo": "oficial_manual", "nota_calculada": float(breakdown.nota_final)}
    calificacion.resultado_json = result
    return breakdown
