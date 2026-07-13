from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.dba.models import DBACatalog, DBAPersonalizado
from app.modules.dba.schemas import DBACreate, DBAPersonalizadoCreate, DBAPersonalizadoUpdate


async def search_dba(
    db: AsyncSession,
    area: str | None = None,
    grado: str | None = None,
    activo: bool = True,
) -> list[DBACatalog]:
    stmt = select(DBACatalog).where(DBACatalog.activo == activo)
    if area:
        stmt = stmt.where(DBACatalog.area.ilike(area))
    if grado:
        stmt = stmt.where(DBACatalog.grado == grado)
    result = await db.scalars(stmt.order_by(DBACatalog.area.asc(), DBACatalog.grado.asc(), DBACatalog.codigo.asc()))
    return list(result)


async def import_dba(db: AsyncSession, items: list[DBACreate]) -> list[DBACatalog]:
    rows = [
        DBACatalog(
            area=item.area,
            grado=item.grado,
            codigo=item.codigo,
            descripcion=item.descripcion,
            fuente=item.fuente,
            activo=item.activo,
        )
        for item in items
    ]
    db.add_all(rows)
    await db.commit()
    for row in rows:
        await db.refresh(row)
    return rows


async def get_dba_records(db: AsyncSession, dba_ids: list[UUID]) -> list[DBACatalog]:
    if not dba_ids:
        return []
    result = await db.scalars(select(DBACatalog).where(DBACatalog.id.in_(dba_ids)))
    rows = list(result)
    if len(rows) != len(set(dba_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more DBA ids are invalid")
    return rows


async def get_dba_personalizado_records_for_evaluation(
    db: AsyncSession,
    dba_ids: list[UUID],
    *,
    materia_id: UUID,
    profesor_id: UUID,
) -> list[DBAPersonalizado]:
    if not dba_ids:
        return []
    result = await db.scalars(select(DBAPersonalizado).where(DBAPersonalizado.id.in_(dba_ids)))
    rows = list(result)
    if len(rows) != len(set(dba_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more custom DBA ids are invalid",
        )
    for row in rows:
        if not row.activo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more custom DBA ids are inactive",
            )
        if row.profesor_id != profesor_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        if row.materia_id != materia_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more custom DBA ids do not belong to this materia",
            )
    return rows


# ── DBA personalizados por materia (Fase B) ─────────────────────────────────


async def create_dba_personalizado(
    db: AsyncSession,
    *,
    profesor_id: UUID,
    materia_id: UUID,
    area: str,
    grado: str,
    payload: DBAPersonalizadoCreate,
) -> DBAPersonalizado:
    row = DBAPersonalizado(
        profesor_id=profesor_id,
        materia_id=materia_id,
        area=(payload.area or area or "General"),
        grado=(payload.grado or grado or "N/A"),
        enunciado=payload.enunciado.strip(),
        evidencias_aprendizaje=payload.evidencias_aprendizaje,
        ejemplo=payload.ejemplo,
        fuente="personalizado",
        activo=True,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def list_dba_personalizados_by_materia(
    db: AsyncSession, materia_id: UUID, *, include_inactive: bool = False
) -> list[DBAPersonalizado]:
    stmt = select(DBAPersonalizado).where(DBAPersonalizado.materia_id == materia_id)
    if not include_inactive:
        stmt = stmt.where(DBAPersonalizado.activo.is_(True))
    result = await db.scalars(stmt.order_by(DBAPersonalizado.created_at.desc()))
    return list(result)


async def get_dba_personalizado_or_404(db: AsyncSession, dba_id: UUID) -> DBAPersonalizado:
    row = await db.get(DBAPersonalizado, dba_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DBA personalizado no encontrado")
    return row


async def update_dba_personalizado(
    db: AsyncSession, row: DBAPersonalizado, payload: DBAPersonalizadoUpdate
) -> DBAPersonalizado:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if value is None and field != "activo":
            continue
        if field == "enunciado" and isinstance(value, str):
            value = value.strip()
        setattr(row, field, value)
    await db.commit()
    await db.refresh(row)
    return row


async def deactivate_dba_personalizado(db: AsyncSession, row: DBAPersonalizado) -> None:
    """Soft delete: no se borra físicamente para no afectar evaluaciones antiguas."""
    row.activo = False
    await db.commit()


async def list_combined_dba(db: AsyncSession, materia) -> list[dict]:
    """DBA aplicables a la materia: oficiales (por area+grado de la materia) +
    personalizados activos de esa materia. Cada item indica su `fuente`."""
    items: list[dict] = []
    area = (getattr(materia, "area", None) or "").strip()
    grado = (getattr(materia, "grado", None) or "").strip()
    if area and grado:
        oficiales = await search_dba(db, area=area, grado=grado)
        for o in oficiales:
            items.append(
                {
                    "id": o.id,
                    "fuente": "oficial",
                    "area": o.area,
                    "grado": o.grado,
                    "codigo": o.codigo,
                    "descripcion": o.descripcion,
                    "evidencias_aprendizaje": None,
                    "ejemplo": None,
                }
            )
    personalizados = await list_dba_personalizados_by_materia(db, materia.id)
    for p in personalizados:
        items.append(
            {
                "id": p.id,
                "fuente": "personalizado",
                "area": p.area,
                "grado": p.grado,
                "codigo": None,
                "descripcion": p.enunciado,
                "evidencias_aprendizaje": p.evidencias_aprendizaje,
                "ejemplo": p.ejemplo,
            }
        )
    return items
