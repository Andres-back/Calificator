"""Aplicación inmutable de criterios aprobados a superficies académicas.

La aplicación conserva un snapshot canónico y, durante la transición, escribe
el equivalente en los campos heredados. No modifica notas ni desgloses.
"""
from __future__ import annotations

import json
from copy import deepcopy
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.criterios_aprendizaje.audit import audit_criteria_event
from app.modules.criterios_aprendizaje.compatibility import (
    canonical_hash,
    to_legacy_criteria,
    version_snapshot,
)
from app.modules.criterios_aprendizaje.models import (
    LearningCriterion,
    LearningCriterionApplication,
    LearningCriterionSet,
    LearningCriterionVersion,
)


async def _approved_snapshot(
    db: AsyncSession,
    *,
    version_id: UUID,
    materia_id: UUID,
    actor_id: UUID,
) -> tuple[LearningCriterionVersion, LearningCriterionSet, dict]:
    result = (
        await db.execute(
            select(LearningCriterionVersion, LearningCriterionSet)
            .join(LearningCriterionSet, LearningCriterionSet.id == LearningCriterionVersion.set_id)
            .where(
                LearningCriterionVersion.id == version_id,
                LearningCriterionSet.materia_id == materia_id,
                LearningCriterionSet.estado == "activo",
            )
        )
    ).first()
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La versión de criterios no existe en esta materia",
        )
    version, criterion_set = result
    if criterion_set.profesor_id != actor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes aplicar criterios de otro docente",
        )
    if version.estado != "aprobada":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo puedes aplicar una versión aprobada",
        )
    criteria = list(
        await db.scalars(
            select(LearningCriterion)
            .where(LearningCriterion.version_id == version.id)
            .order_by(LearningCriterion.orden)
        )
    )
    if not criteria:
        raise HTTPException(status_code=422, detail="La versión aprobada no contiene criterios")
    return version, criterion_set, version_snapshot(version, criteria)


async def get_approved_snapshot_for_context(
    db: AsyncSession,
    *,
    version_id: UUID,
    materia_id: UUID,
    actor_id: UUID,
) -> dict:
    """Devuelve contexto validado sin crear todavía una aplicación."""
    _version, _criterion_set, snapshot = await _approved_snapshot(
        db, version_id=version_id, materia_id=materia_id, actor_id=actor_id
    )
    return snapshot


async def _persist_application(
    db: AsyncSession,
    *,
    version: LearningCriterionVersion,
    criterion_set: LearningCriterionSet,
    snapshot: dict,
    target_type: str,
    target_id: UUID,
    actor_id: UUID,
) -> LearningCriterionApplication:
    frozen_snapshot = deepcopy(snapshot)
    snapshot_hash = canonical_hash(frozen_snapshot)
    current = await db.scalar(
        select(LearningCriterionApplication).where(
            LearningCriterionApplication.target_type == target_type,
            LearningCriterionApplication.target_id == target_id,
            LearningCriterionApplication.is_current.is_(True),
        )
    )
    if current and current.version_id == version.id and current.snapshot_hash == snapshot_hash:
        return current
    if current:
        current.is_current = False
        # El índice único parcial cubre únicamente la aplicación vigente.
        # Materializa el UPDATE antes del nuevo INSERT, sin depender del orden
        # elegido por el unit-of-work de SQLAlchemy.
        await db.flush()
    row = LearningCriterionApplication(
        version_id=version.id,
        target_type=target_type,
        target_id=target_id,
        snapshot_json=frozen_snapshot,
        snapshot_hash=snapshot_hash,
        applied_by=actor_id,
    )
    db.add(row)
    await db.flush()
    await audit_criteria_event(
        db,
        event="applied",
        actor_id=actor_id,
        set_id=criterion_set.id,
        version_id=version.id,
        extra={"target_type": target_type, "target_id": str(target_id)},
    )
    return row


async def apply_to_evaluation(
    db: AsyncSession,
    *,
    evaluation: object,
    version_id: UUID,
    actor_id: UUID,
) -> LearningCriterionApplication:
    version, criterion_set, snapshot = await _approved_snapshot(
        db,
        version_id=version_id,
        materia_id=getattr(evaluation, "materia_id"),
        actor_id=actor_id,
    )
    legacy = to_legacy_criteria(snapshot)
    setattr(evaluation, "criterios", legacy)
    blueprint = getattr(evaluation, "blueprint", None)
    if blueprint is not None:
        blueprint.criterios = legacy
    return await _persist_application(
        db,
        version=version,
        criterion_set=criterion_set,
        snapshot=snapshot,
        target_type="evaluacion",
        target_id=getattr(evaluation, "id"),
        actor_id=actor_id,
    )


async def apply_version_to_resource(
    db: AsyncSession,
    *,
    resource_id: UUID,
    materia_id: UUID,
    version_id: UUID,
    actor_id: UUID,
) -> LearningCriterionApplication:
    material = (
        await db.execute(
            text(
                "SELECT id, materia_id, profesor_id FROM materiales_generados "
                "WHERE id = :id"
            ),
            {"id": str(resource_id)},
        )
    ).mappings().first()
    if material is None:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    if material["materia_id"] is None or UUID(str(material["materia_id"])) != materia_id:
        raise HTTPException(status_code=409, detail="El recurso no pertenece a la materia indicada")
    if UUID(str(material["profesor_id"])) != actor_id:
        raise HTTPException(status_code=403, detail="No puedes modificar recursos de otro docente")
    version, criterion_set, snapshot = await _approved_snapshot(
        db, version_id=version_id, materia_id=materia_id, actor_id=actor_id
    )
    legacy = to_legacy_criteria(snapshot)
    await db.execute(
        text(
            "UPDATE materiales_generados SET input_json = COALESCE(input_json, '{}'::jsonb) "
            "|| CAST(:compatibility AS jsonb), updated_at = NOW() WHERE id = :id"
        ),
        {
            "id": str(resource_id),
            "compatibility": json.dumps(
                {
                    "learning_criteria_version_id": str(version.id),
                    "criterios_rubrica": [item["nombre"] for item in legacy],
                    "usar_rubrica": True,
                },
                ensure_ascii=False,
            ),
        },
    )
    return await _persist_application(
        db,
        version=version,
        criterion_set=criterion_set,
        snapshot=snapshot,
        target_type="recurso",
        target_id=resource_id,
        actor_id=actor_id,
    )


async def get_current_application(
    db: AsyncSession, *, target_type: str, target_id: UUID
) -> LearningCriterionApplication | None:
    return await db.scalar(
        select(LearningCriterionApplication).where(
            LearningCriterionApplication.target_type == target_type,
            LearningCriterionApplication.target_id == target_id,
            LearningCriterionApplication.is_current.is_(True),
        )
    )


async def supersede_current_application(
    db: AsyncSession, *, target_type: str, target_id: UUID
) -> None:
    """Desvincula un snapshot tras edición estructural; no borra el histórico."""
    current = await get_current_application(db, target_type=target_type, target_id=target_id)
    if current is not None:
        current.is_current = False
        await db.flush()


async def apply_version(
    db: AsyncSession,
    *,
    version_id: UUID,
    target_type: str,
    target_id: UUID,
    actor_id: UUID,
) -> LearningCriterionApplication:
    if target_type == "evaluacion":
        from app.modules.evaluaciones.models import Evaluacion

        evaluation = await db.scalar(
            select(Evaluacion).where(
                Evaluacion.id == target_id,
                Evaluacion.profesor_id == actor_id,
                Evaluacion.deleted_at.is_(None),
            )
        )
        if evaluation is None:
            raise HTTPException(status_code=404, detail="Evaluación no encontrada")
        row = await apply_to_evaluation(
            db, evaluation=evaluation, version_id=version_id, actor_id=actor_id
        )
        from app.modules.evaluaciones.service import _build_or_update_blueprint

        await _build_or_update_blueprint(
            db,
            evaluation,
            [UUID(value) for value in evaluation.dba_ids],
            [UUID(value) for value in evaluation.dba_personalizado_ids],
        )
    elif target_type == "recurso":
        material = (
            await db.execute(
                text(
                    "SELECT materia_id FROM materiales_generados "
                    "WHERE id = :id AND profesor_id = :profesor_id"
                ),
                {"id": str(target_id), "profesor_id": str(actor_id)},
            )
        ).mappings().first()
        if material is None:
            raise HTTPException(status_code=404, detail="Recurso no encontrado")
        if material["materia_id"] is None:
            raise HTTPException(status_code=422, detail="Asigna primero el recurso a una materia")
        row = await apply_version_to_resource(
            db,
            resource_id=target_id,
            materia_id=UUID(str(material["materia_id"])),
            version_id=version_id,
            actor_id=actor_id,
        )
    else:  # protección adicional para llamadas internas
        raise HTTPException(status_code=422, detail="Tipo de aplicación no válido")
    await db.commit()
    return row
