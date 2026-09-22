from __future__ import annotations

import re
import secrets
import unicodedata
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_password_hash
from app.modules.importacion_estudiantes.models import ImportacionEstudiantesFila, ImportacionEstudiantesLote
from app.modules.importacion_estudiantes.schemas import FilaUpdate
from app.modules.materias.models import Materia
from app.modules.materias.service import ensure_can_manage_materia
from app.modules.matriculas.models import Matricula
from app.modules.users.models import User
from app.services.storage_service import resolve_private_upload_path
from app.shared.enums import MatriculaEstado, UserEstado, UserRole


def normalize_name(value: str) -> str:
    folded = unicodedata.normalize("NFKD", value.casefold())
    return " ".join(re.sub(r"[^a-z0-9 ]+", " ", "".join(c for c in folded if not unicodedata.combining(c))).split())


def _slug(value: str) -> str:
    return (normalize_name(value).replace(" ", ".")[:48].strip(".") or "estudiante")


def temporary_password() -> str:
    return f"Xc!{secrets.token_urlsafe(12)}9a"


async def unique_internal_email(db: AsyncSession, name: str) -> str:
    for _ in range(20):
        candidate = f"{_slug(name)}.{secrets.token_hex(4)}@alumnos.xcalificator.daimuz.com"
        if not await db.scalar(select(User.id).where(func.lower(User.email) == candidate.lower())):
            return candidate
    raise RuntimeError("No fue posible generar un acceso único")


async def get_lote(db: AsyncSession, lote_id: UUID, actor: User) -> ImportacionEstudiantesLote:
    lote = await db.scalar(select(ImportacionEstudiantesLote).options(selectinload(ImportacionEstudiantesLote.filas)).where(ImportacionEstudiantesLote.id == lote_id))
    if not lote:
        raise HTTPException(status_code=404, detail="Importación no encontrada")
    await ensure_can_manage_materia(db, lote.materia_id, actor)
    return lote


def delete_private_photo(lote: ImportacionEstudiantesLote) -> None:
    if lote.archivo_key:
        delete_private_photo_key(lote.archivo_key)
        lote.archivo_key = None


def delete_private_photo_key(file_key: str) -> None:
    try:
        resolve_private_upload_path(file_key).unlink(missing_ok=True)
    except (OSError, ValueError):
        pass


async def expire_abandoned_lotes(db: AsyncSession, before: datetime) -> list[str]:
    """Desactiva lotes abandonados y devuelve las fotos para borrar tras el commit."""
    lotes = list((await db.scalars(
        select(ImportacionEstudiantesLote)
        .where(ImportacionEstudiantesLote.estado.in_(["procesando", "revision", "error"]),
               ImportacionEstudiantesLote.created_at < before)
        .with_for_update(skip_locked=True).limit(100)
    )).all())
    keys: list[str] = []
    for lote in lotes:
        if lote.archivo_key:
            keys.append(lote.archivo_key)
        lote.archivo_key = None
        lote.estado = "cancelado"
        if lote.job_id:
            await db.execute(text(
                "UPDATE ai_jobs SET estado='cancelled' WHERE id=:id AND estado IN ('queued','running','retrying')"
            ), {"id": str(lote.job_id)})
    return keys


async def replace_rows(db: AsyncSession, lote: ImportacionEstudiantesLote, rows: list[FilaUpdate], actor: User) -> ImportacionEstudiantesLote:
    if lote.estado != "revision":
        raise HTTPException(status_code=409, detail="La lista ya no está disponible para edición")
    original_rows = list((await db.scalars(
        select(ImportacionEstudiantesFila).where(ImportacionEstudiantesFila.lote_id == lote.id)
    )).all())
    existing = {row.id: row for row in original_rows}
    provided_ids = [row.id for row in rows if row.id in existing]
    if len(provided_ids) != len(set(provided_ids)):
        raise HTTPException(status_code=422, detail="Una fila aparece más de una vez")
    for index, row in enumerate(original_rows, start=1):
        row.orden = -index
    await db.flush()
    rebuilt: list[ImportacionEstudiantesFila] = []
    seen: dict[str, int] = {}
    for order, payload in enumerate(rows, start=1):
        row = existing.get(payload.id) if payload.id else None
        if row is None:
            row = ImportacionEstudiantesFila(lote_id=lote.id, orden=order, nombre_detectado=payload.nombre_revisado, nombre_revisado=payload.nombre_revisado, confianza=1, requiere_revision=False)
            db.add(row)
        row.orden = order
        row.nombre_revisado = " ".join(payload.nombre_revisado.split())
        row.decision = payload.decision
        row.estudiante_existente_id = payload.estudiante_existente_id if payload.decision == "asociar" else None
        row.duplicado_confirmado = payload.duplicado_confirmado if payload.decision == "crear" else False
        key = normalize_name(row.nombre_revisado)
        seen[key] = seen.get(key, 0) + 1
        row.requiere_revision = False
        row.advertencias = []
        rebuilt.append(row)
    keep_ids = {row.id for row in rebuilt if row.id}
    for row in original_rows:
        if row.id not in keep_ids:
            await db.delete(row)
    existing_names = {normalize_name(student.nombre) for student in await _current_students(db, lote.materia_id)}
    for row in rebuilt:
        key = normalize_name(row.nombre_revisado)
        if row.decision == "crear" and (seen[key] > 1 or key in existing_names):
            row.requiere_revision = not row.duplicado_confirmado
            row.advertencias = ["Nombre repetido en la lista: decide si es otra persona o excluye la fila duplicada."]
    await db.flush()
    db.expire(lote, ["filas"])
    return await get_lote(db, lote.id, actor)


async def _current_students(db: AsyncSession, materia_id: UUID) -> list[User]:
    return list((await db.scalars(select(User).join(Matricula, Matricula.estudiante_id == User.id).where(Matricula.materia_id == materia_id, Matricula.estado == MatriculaEstado.ACTIVO.value))).all())


async def _accessible_students(db: AsyncSession, materia: Materia, ids: list[UUID]) -> set[UUID]:
    if not ids:
        return set()
    return set((await db.scalars(
        select(User.id)
        .join(Matricula, Matricula.estudiante_id == User.id)
        .join(Materia, Materia.id == Matricula.materia_id)
        .where(User.id.in_(ids), User.rol == UserRole.ESTUDIANTE.value,
               Materia.profesor_id == materia.profesor_id,
               Matricula.estado == MatriculaEstado.ACTIVO.value)
    )).all())


async def _enroll(db: AsyncSession, materia_id: UUID, student_id: UUID) -> str:
    enrollment = await db.scalar(select(Matricula).where(Matricula.materia_id == materia_id, Matricula.estudiante_id == student_id).with_for_update())
    if enrollment:
        if enrollment.estado != MatriculaEstado.ACTIVO.value:
            enrollment.estado = MatriculaEstado.ACTIVO.value
            return "reactivado"
        return "existente"
    db.add(Matricula(materia_id=materia_id, estudiante_id=student_id, estado=MatriculaEstado.ACTIVO.value))
    return "creado"


async def confirm_lote(db: AsyncSession, lote_id: UUID, actor: User) -> dict:
    lote = await db.scalar(select(ImportacionEstudiantesLote).where(ImportacionEstudiantesLote.id == lote_id).with_for_update())
    if not lote:
        raise HTTPException(status_code=404, detail="Importación no encontrada")
    await ensure_can_manage_materia(db, lote.materia_id, actor)
    if lote.estado == "confirmado":
        previous = dict(lote.resultado_json or {})
        return {**previous, "credenciales": [], "credenciales_mostradas_una_vez": True}
    if lote.estado != "revision":
        raise HTTPException(status_code=409, detail="La lista todavía no está lista para confirmar")
    rows = list((await db.scalars(select(ImportacionEstudiantesFila).where(ImportacionEstudiantesFila.lote_id == lote.id).order_by(ImportacionEstudiantesFila.orden))).all())
    materia = await db.get(Materia, lote.materia_id)
    if materia is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    linked_ids = [row.estudiante_existente_id for row in rows if row.decision == "asociar" and row.estudiante_existente_id]
    allowed_ids = await _accessible_students(db, materia, linked_ids)
    if not set(linked_ids).issubset(allowed_ids):
        raise HTTPException(status_code=422, detail="Selecciona únicamente estudiantes verificados de tus materias")
    current_names = {normalize_name(student.nombre) for student in await _current_students(db, lote.materia_id)}
    frequencies: dict[str, int] = {}
    for row in rows:
        if row.decision == "crear":
            key = normalize_name(row.nombre_revisado)
            frequencies[key] = frequencies.get(key, 0) + 1
    if any(row.decision == "crear" and (frequencies[normalize_name(row.nombre_revisado)] > 1 or normalize_name(row.nombre_revisado) in current_names) and not row.duplicado_confirmado for row in rows):
        raise HTTPException(status_code=422, detail="Confirma expresamente los homónimos antes de crear otra cuenta")
    unresolved = [r for r in rows if r.decision != "omitir" and (r.requiere_revision or (r.decision == "asociar" and not r.estudiante_existente_id))]
    if unresolved:
        raise HTTPException(status_code=422, detail="Resuelve o excluye todas las filas advertidas antes de confirmar")
    credentials: list[dict] = []
    counts = {"creados": 0, "matriculados_existentes": 0, "ya_matriculados": 0, "omitidos": 0}
    for row in rows:
        if row.decision == "omitir":
            counts["omitidos"] += 1
            continue
        if row.decision == "asociar":
            student = await db.get(User, row.estudiante_existente_id)
            if not student or student.rol != UserRole.ESTUDIANTE.value:
                raise HTTPException(status_code=422, detail=f"La cuenta asociada a {row.nombre_revisado} ya no está disponible")
            state = await _enroll(db, lote.materia_id, student.id)
            counts["ya_matriculados" if state == "existente" else "matriculados_existentes"] += 1
            continue
        password = temporary_password()
        email = await unique_internal_email(db, row.nombre_revisado)
        student = User(nombre=row.nombre_revisado, email=email, password_hash=get_password_hash(password), rol=UserRole.ESTUDIANTE.value, estado=UserEstado.ACTIVO.value, email_es_interno=True, debe_cambiar_password=True)
        db.add(student)
        await db.flush()
        await _enroll(db, lote.materia_id, student.id)
        counts["creados"] += 1
        credentials.append({"estudiante_id": student.id, "nombre": student.nombre, "email": email, "password_temporal": password})
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    lote.estado = "confirmado"
    lote.confirmado_at = now
    lote.credenciales_entregadas_at = now
    lote.resultado_json = counts
    await db.flush()
    return {**counts, "credenciales": credentials, "credenciales_mostradas_una_vez": True}


async def searchable_students(db: AsyncSession, materia: Materia, query: str) -> list[dict]:
    own_subjects = select(Materia.id).where(Materia.profesor_id == materia.profesor_id)
    rows = (await db.execute(select(User.id, User.nombre, User.email, func.array_agg(func.distinct(Materia.nombre)).label("materias")).join(Matricula, Matricula.estudiante_id == User.id).join(Materia, Materia.id == Matricula.materia_id).where(Matricula.materia_id.in_(own_subjects), Matricula.estado == MatriculaEstado.ACTIVO.value, User.rol == UserRole.ESTUDIANTE.value, or_(User.nombre.ilike(f"%{query}%"), User.email.ilike(f"%{query}%"))).group_by(User.id).order_by(User.nombre).limit(300))).all()
    return [{"id": row.id, "nombre": row.nombre, "email": row.email, "materias": list(row.materias or [])} for row in rows]


async def enroll_existing(db: AsyncSession, materia_id: UUID, student_ids: list[UUID], actor: User) -> dict:
    materia = await ensure_can_manage_materia(db, materia_id, actor)
    allowed = await _accessible_students(db, materia, student_ids)
    if not set(student_ids).issubset(allowed):
        raise HTTPException(status_code=403, detail="Uno o más estudiantes no pertenecen a materias administradas por ti")
    created = existing = 0
    for student_id in dict.fromkeys(student_ids):
        state = await _enroll(db, materia.id, student_id)
        existing += state == "existente"
        created += state != "existente"
    return {"matriculados": created, "ya_matriculados": existing}


async def reset_temporary_password(db: AsyncSession, materia_id: UUID, student_id: UUID, actor: User) -> dict:
    await ensure_can_manage_materia(db, materia_id, actor)
    enrolled = await db.scalar(select(Matricula.id).where(Matricula.materia_id == materia_id, Matricula.estudiante_id == student_id, Matricula.estado == MatriculaEstado.ACTIVO.value))
    student = await db.get(User, student_id)
    if not enrolled or not student or student.rol != UserRole.ESTUDIANTE.value or not student.email_es_interno:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado en esta materia")
    password = temporary_password()
    student.password_hash = get_password_hash(password)
    student.debe_cambiar_password = True
    student.auth_version = int(student.auth_version or 1) + 1
    return {"estudiante_id": student.id, "email": student.email, "password_temporal": password}
