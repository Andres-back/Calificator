"""Autorización por objeto para fuentes y criterios privados."""
from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission_now
from app.modules.criterios_aprendizaje.models import LearningCriterionSet, LearningCriterionSource, LearningCriterionVersion
from app.modules.materias import service as materias_service
from app.modules.users.models import User
from app.shared.enums import UserRole


async def ensure_can_manage_materia_criteria(
    db: AsyncSession,
    materia_id: UUID,
    user: User,
):
    require_permission_now(user, "dba.manage")
    return await materias_service.ensure_can_manage_materia(db, materia_id, user)


async def get_set_for_management(db: AsyncSession, set_id: UUID, user: User) -> LearningCriterionSet:
    statement = select(LearningCriterionSet).where(LearningCriterionSet.id == set_id)
    if user.rol != UserRole.ADMIN.value:
        statement = statement.where(LearningCriterionSet.profesor_id == user.id)
    row = await db.scalar(statement)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conjunto de criterios no encontrado")
    await ensure_can_manage_materia_criteria(db, row.materia_id, user)
    return row


async def get_version_for_management(db: AsyncSession, version_id: UUID, user: User) -> tuple[LearningCriterionVersion, LearningCriterionSet]:
    statement = (
        select(LearningCriterionVersion, LearningCriterionSet)
        .join(LearningCriterionSet, LearningCriterionSet.id == LearningCriterionVersion.set_id)
        .where(LearningCriterionVersion.id == version_id)
    )
    if user.rol != UserRole.ADMIN.value:
        statement = statement.where(LearningCriterionSet.profesor_id == user.id)
    result = (await db.execute(statement)).first()
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Versión de criterios no encontrada")
    version, criterion_set = result
    await ensure_can_manage_materia_criteria(db, criterion_set.materia_id, user)
    return version, criterion_set


async def get_source_for_management(db: AsyncSession, source_id: UUID, user: User) -> tuple[LearningCriterionSource, LearningCriterionVersion, LearningCriterionSet]:
    statement = (
        select(LearningCriterionSource, LearningCriterionVersion, LearningCriterionSet)
        .join(LearningCriterionVersion, LearningCriterionVersion.id == LearningCriterionSource.version_id)
        .join(LearningCriterionSet, LearningCriterionSet.id == LearningCriterionVersion.set_id)
        .where(LearningCriterionSource.id == source_id, LearningCriterionSource.deleted_at.is_(None))
    )
    if user.rol != UserRole.ADMIN.value:
        statement = statement.where(LearningCriterionSet.profesor_id == user.id)
    result = (await db.execute(statement)).first()
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fuente no encontrada")
    source, version, criterion_set = result
    await ensure_can_manage_materia_criteria(db, criterion_set.materia_id, user)
    return source, version, criterion_set
