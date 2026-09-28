"""Operaciones transaccionales para conjuntos y versiones de criterios."""
from __future__ import annotations

import re
import unicodedata
import hashlib
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.criterios_aprendizaje import authorization
from app.modules.criterios_aprendizaje.audit import audit_criteria_event
from app.modules.criterios_aprendizaje.models import (
    LearningCriterion,
    LearningCriterionApplication,
    LearningCriterionSet,
    LearningCriterionSource,
    LearningCriterionVersion,
)
from app.modules.criterios_aprendizaje.schemas import LearningCriteriaSetCreate, LearningCriteriaVersionUpdate, LearningCriterionInput
from app.modules.users.models import User


EDITABLE_STATES = {"borrador", "requiere_revision"}


def _stable_key(name: str, position: int, used: set[str]) -> str:
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    candidate = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")[:60] or f"criterio-{position}"
    root = candidate
    suffix = 2
    while candidate in used:
        candidate = f"{root[:70]}-{suffix}"
        suffix += 1
    used.add(candidate)
    return candidate


def _criterion_from_input(version_id: UUID, item: LearningCriterionInput, position: int, used: set[str]) -> LearningCriterion:
    key = item.stable_key or _stable_key(item.nombre, position, used)
    if key in used and item.stable_key:
        raise HTTPException(status_code=422, detail=f"La clave de criterio '{key}' está repetida")
    used.add(key)
    return LearningCriterion(
        version_id=version_id,
        stable_key=key,
        orden=position,
        nombre=item.nombre.strip(),
        descripcion=item.descripcion.strip(),
        evidencia_esperada=item.evidencia_esperada.strip(),
        peso_porcentaje=item.peso_porcentaje,
        puntaje_maximo=item.puntaje_maximo,
        niveles_json=[level.model_dump(mode="json") for level in item.niveles],
        source_refs_json=item.source_refs,
        official_standard_refs_json=item.official_standard_refs,
    )


async def _replace_criteria(db: AsyncSession, version: LearningCriterionVersion, items: list[LearningCriterionInput]) -> None:
    sources = list(await db.scalars(
        select(LearningCriterionSource).where(
            LearningCriterionSource.version_id == version.id,
            LearningCriterionSource.deleted_at.is_(None),
        )
    ))
    by_source = {str(source.id): source for source in sources}
    for item in items:
        for reference in item.source_refs:
            source = by_source.get(str(reference.get("source_id") or ""))
            page = reference.get("pagina")
            if source is None or (page is not None and (
                isinstance(page, bool) or not isinstance(page, int)
                or page < 1 or page > (source.page_count or 1)
            )):
                raise HTTPException(status_code=422, detail="Una referencia del criterio no pertenece a esta versión o su página no existe")
    await db.execute(delete(LearningCriterion).where(LearningCriterion.version_id == version.id))
    used: set[str] = set()
    rows = [_criterion_from_input(version.id, item, index, used) for index, item in enumerate(items, start=1)]
    db.add_all(rows)


async def create_set(
    db: AsyncSession,
    *,
    materia_id: UUID,
    payload: LearningCriteriaSetCreate,
    actor: User,
    idempotency_key: str | None = None,
) -> LearningCriterionSet:
    materia = await authorization.ensure_can_manage_materia_criteria(db, materia_id, actor)
    idempotency_hash = None
    if idempotency_key:
        idempotency_hash = hashlib.sha256(
            f"{actor.id}:{materia.id}:{idempotency_key.strip()}".encode("utf-8")
        ).hexdigest()
        existing = await db.scalar(
            select(LearningCriterionSet)
            .join(LearningCriterionVersion, LearningCriterionVersion.set_id == LearningCriterionSet.id)
            .where(
                LearningCriterionSet.materia_id == materia.id,
                LearningCriterionSet.profesor_id == materia.profesor_id,
                LearningCriterionVersion.version_number == 1,
                LearningCriterionVersion.generation_meta_json["create_idempotency_hash"].astext == idempotency_hash,
            )
        )
        if existing is not None:
            return existing
    row = LearningCriterionSet(
        materia_id=materia.id,
        profesor_id=materia.profesor_id,
        titulo=payload.titulo.strip(),
        descripcion=payload.descripcion.strip() if payload.descripcion else None,
    )
    db.add(row)
    await db.flush()
    version = LearningCriterionVersion(
        set_id=row.id,
        version_number=1,
        revision=1,
        estado="borrador",
        teacher_intent_json=payload.intencion_docente.model_dump(mode="json"),
        generation_meta_json={"create_idempotency_hash": idempotency_hash} if idempotency_hash else {},
        created_by=actor.id,
    )
    db.add(version)
    await db.flush()
    if payload.criterios:
        await _replace_criteria(db, version, payload.criterios)
    await db.commit()
    await audit_criteria_event(db, event="created", actor_id=actor.id, set_id=row.id, version_id=version.id)
    return row


async def _version_payload(db: AsyncSession, version: LearningCriterionVersion) -> dict:
    criteria = list(await db.scalars(select(LearningCriterion).where(LearningCriterion.version_id == version.id).order_by(LearningCriterion.orden)))
    sources = list(await db.scalars(select(LearningCriterionSource).where(LearningCriterionSource.version_id == version.id, LearningCriterionSource.deleted_at.is_(None)).order_by(LearningCriterionSource.orden)))
    return {
        "id": version.id,
        "set_id": version.set_id,
        "version_number": version.version_number,
        "revision": version.revision,
        "estado": version.estado,
        "intencion_docente": version.teacher_intent_json or {},
        "cobertura": version.coverage_json or {},
        "asistida_ia": (version.generation_meta_json or {}).get("status") == "completed",
        "criterios": [
            {
                "id": item.id,
                "stable_key": item.stable_key,
                "orden": item.orden,
                "nombre": item.nombre,
                "descripcion": item.descripcion,
                "evidencia_esperada": item.evidencia_esperada,
                "peso_porcentaje": item.peso_porcentaje,
                "puntaje_maximo": item.puntaje_maximo,
                "niveles": item.niveles_json or [],
                "source_refs": item.source_refs_json or [],
                "official_standard_refs": item.official_standard_refs_json or [],
            }
            for item in criteria
        ],
        "fuentes": [
            {
                "id": source.id,
                "tipo": source.tipo,
                "orden": source.orden,
                "display_name": source.display_name,
                "mime_type": source.mime_type,
                "size_bytes": source.size_bytes,
                "page_count": source.page_count,
                "extraction_status": source.extraction_status,
                "visible_to_student": source.visible_to_student,
                "error": source.error,
                "created_at": source.created_at,
            }
            for source in sources
        ],
        "approved_at": version.approved_at,
        "created_at": version.created_at,
        "updated_at": version.updated_at,
    }


async def serialize_set(db: AsyncSession, row: LearningCriterionSet) -> dict:
    # Approving changes the set's server-managed updated_at. Read it explicitly
    # inside the async context instead of triggering an implicit lazy load.
    await db.refresh(row)
    versions = list(await db.scalars(select(LearningCriterionVersion).where(LearningCriterionVersion.set_id == row.id).order_by(LearningCriterionVersion.version_number.desc())))
    working = next((item for item in versions if item.estado in {"borrador", "procesando", "requiere_revision"}), None)
    approved = next((item for item in versions if item.id == row.current_version_id), None)
    uses = await db.scalar(select(func.count(LearningCriterionApplication.id)).where(LearningCriterionApplication.version_id.in_([item.id for item in versions]) if versions else False))
    return {
        "id": row.id,
        "materia_id": row.materia_id,
        "profesor_id": row.profesor_id,
        "titulo": row.titulo,
        "descripcion": row.descripcion,
        "estado": row.estado,
        "current_version_id": row.current_version_id,
        "version_trabajo": await _version_payload(db, working) if working else None,
        "version_aprobada": await _version_payload(db, approved) if approved else None,
        "usos": int(uses or 0),
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


async def list_sets(
    db: AsyncSession,
    *,
    materia_id: UUID,
    actor: User,
    limit: int,
    offset: int,
) -> tuple[list[dict], int]:
    materia = await authorization.ensure_can_manage_materia_criteria(db, materia_id, actor)
    filters = [LearningCriterionSet.materia_id == materia.id]
    if actor.rol != "admin":
        filters.append(LearningCriterionSet.profesor_id == actor.id)
    total = int(await db.scalar(select(func.count(LearningCriterionSet.id)).where(*filters)) or 0)
    rows = list(await db.scalars(select(LearningCriterionSet).where(*filters).order_by(LearningCriterionSet.updated_at.desc()).limit(limit).offset(offset)))
    return [await serialize_set(db, row) for row in rows], total


async def get_set(db: AsyncSession, *, set_id: UUID, actor: User) -> dict:
    row = await authorization.get_set_for_management(db, set_id, actor)
    return await serialize_set(db, row)


async def update_version(
    db: AsyncSession,
    *,
    version_id: UUID,
    payload: LearningCriteriaVersionUpdate,
    actor: User,
) -> LearningCriterionSet:
    version, criterion_set = await authorization.get_version_for_management(db, version_id, actor)
    if version.estado not in EDITABLE_STATES:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La versión ya no es editable; crea una versión nueva")
    if version.revision != payload.revision_esperada:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Otra sesión modificó este borrador. Recarga antes de continuar")
    if payload.titulo is not None:
        criterion_set.titulo = payload.titulo.strip()
    if payload.descripcion is not None:
        criterion_set.descripcion = payload.descripcion.strip() or None
    if payload.intencion_docente is not None:
        version.teacher_intent_json = payload.intencion_docente.model_dump(mode="json")
    if payload.criterios is not None:
        await _replace_criteria(db, version, payload.criterios)
    version.revision += 1
    await db.commit()
    await audit_criteria_event(db, event="updated", actor_id=actor.id, set_id=criterion_set.id, version_id=version.id, extra={"revision": version.revision})
    return criterion_set


async def approve_version(
    db: AsyncSession,
    *,
    version_id: UUID,
    revision_expected: int,
    acknowledge_warnings: bool,
    actor: User,
) -> LearningCriterionSet:
    version, criterion_set = await authorization.get_version_for_management(db, version_id, actor)
    if version.estado not in EDITABLE_STATES:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Esta versión no puede aprobarse en su estado actual")
    if version.revision != revision_expected:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El borrador cambió. Recarga antes de aprobar")
    criteria = list(await db.scalars(select(LearningCriterion).where(LearningCriterion.version_id == version.id).order_by(LearningCriterion.orden)))
    blocks: list[str] = []
    if not criteria:
        blocks.append("Agrega al menos un criterio")
    total = sum((item.peso_porcentaje for item in criteria), Decimal("0"))
    if criteria and abs(total - Decimal("100")) > Decimal("0.01"):
        blocks.append(f"Los pesos deben sumar 100 %. Total actual: {total} %")
    if any(not item.descripcion.strip() or not item.evidencia_esperada.strip() for item in criteria):
        blocks.append("Todos los criterios necesitan descripción y evidencia esperada")
    active_sources = list(await db.scalars(select(LearningCriterionSource).where(LearningCriterionSource.version_id == version.id, LearningCriterionSource.deleted_at.is_(None))))
    if any(item.extraction_status == "procesando" for item in active_sources):
        blocks.append("Espera a que termine la lectura de las fuentes")
    coverage_blocks = list((version.coverage_json or {}).get("bloqueos") or [])
    if coverage_blocks and not acknowledge_warnings:
        blocks.append("Revisa o reconoce las advertencias de cobertura")
    if blocks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=("No se puede aprobar: " + "; ".join(blocks))[:220],
        )
    if criterion_set.current_version_id:
        previous = await db.get(LearningCriterionVersion, criterion_set.current_version_id)
        if previous and previous.id != version.id and previous.estado == "aprobada":
            previous.estado = "sustituida"
    version.estado = "aprobada"
    version.approved_by = actor.id
    version.approved_at = datetime.now(timezone.utc)
    version.revision += 1
    criterion_set.current_version_id = version.id
    await db.commit()
    await audit_criteria_event(db, event="approved", actor_id=actor.id, set_id=criterion_set.id, version_id=version.id, extra={"version": version.version_number})
    return criterion_set


async def clone_version(
    db: AsyncSession,
    *,
    set_id: UUID,
    source_version_id: UUID | None,
    actor: User,
) -> LearningCriterionSet:
    criterion_set = await authorization.get_set_for_management(db, set_id, actor)
    active_draft = await db.scalar(select(LearningCriterionVersion.id).where(LearningCriterionVersion.set_id == set_id, LearningCriterionVersion.estado.in_(["borrador", "procesando", "requiere_revision"])))
    if active_draft:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un borrador para este conjunto")
    source_id = source_version_id or criterion_set.current_version_id
    source = await db.get(LearningCriterionVersion, source_id) if source_id else None
    if source is None or source.set_id != criterion_set.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Versión de origen no encontrada")
    next_number = int(await db.scalar(select(func.max(LearningCriterionVersion.version_number)).where(LearningCriterionVersion.set_id == set_id)) or 0) + 1
    cloned = LearningCriterionVersion(
        set_id=set_id,
        version_number=next_number,
        revision=1,
        estado="borrador",
        teacher_intent_json=dict(source.teacher_intent_json or {}),
        coverage_json=dict(source.coverage_json or {}),
        created_by=actor.id,
    )
    db.add(cloned)
    await db.flush()
    source_rows = list(await db.scalars(select(LearningCriterionSource).where(LearningCriterionSource.version_id == source.id, LearningCriterionSource.deleted_at.is_(None)).order_by(LearningCriterionSource.orden)))
    source_id_map: dict[str, str] = {}
    for item in source_rows:
        new_id = uuid4()
        source_id_map[str(item.id)] = str(new_id)
        db.add(LearningCriterionSource(
            id=new_id, version_id=cloned.id, tipo=item.tipo, orden=item.orden, display_name=item.display_name,
            private_file_key=item.private_file_key, mime_type=item.mime_type, size_bytes=item.size_bytes,
            page_count=item.page_count, rag_source_id=item.rag_source_id, reference_json=dict(item.reference_json or {}),
            extraction_status=item.extraction_status, content_hash=item.content_hash,
            visible_to_student=item.visible_to_student,
        ))
    source_criteria = list(await db.scalars(select(LearningCriterion).where(LearningCriterion.version_id == source.id).order_by(LearningCriterion.orden)))
    for item in source_criteria:
        references = []
        for reference in item.source_refs_json or []:
            old_source_id = str(reference.get("source_id") or "")
            if old_source_id not in source_id_map:
                raise HTTPException(status_code=409, detail="La versión de origen contiene referencias a fuentes inexistentes")
            references.append({**reference, "source_id": source_id_map[old_source_id]})
        db.add(LearningCriterion(
            version_id=cloned.id, stable_key=item.stable_key, orden=item.orden,
            nombre=item.nombre, descripcion=item.descripcion, evidencia_esperada=item.evidencia_esperada,
            peso_porcentaje=item.peso_porcentaje, puntaje_maximo=item.puntaje_maximo,
            niveles_json=list(item.niveles_json or []), source_refs_json=references,
            official_standard_refs_json=list(item.official_standard_refs_json or []),
        ))
    await db.commit()
    await audit_criteria_event(db, event="version_created", actor_id=actor.id, set_id=set_id, version_id=cloned.id, extra={"version": next_number})
    return criterion_set


async def archive_set(db: AsyncSession, *, set_id: UUID, actor: User) -> LearningCriterionSet:
    row = await authorization.get_set_for_management(db, set_id, actor)
    row.estado = "archivado"
    await db.commit()
    await audit_criteria_event(db, event="archived", actor_id=actor.id, set_id=row.id)
    return row
