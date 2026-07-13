from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_role
from app.db.session import get_db
from app.modules.rag import ingest_service
from app.modules.rag.models import RagSource
from app.modules.rag.retrieval_service import search_chunks
from app.modules.rag.schemas import (
    RagChunkRead,
    RagIngestRequest,
    RagSearchRequest,
    RagSourceCreate,
    RagSourceRead,
)
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/sources", response_model=RagSourceRead, status_code=status.HTTP_201_CREATED)
async def create_source(
    payload: RagSourceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    source = await ingest_service.create_source(db, payload, current_user.id)
    await db.commit()
    await db.refresh(source)
    return source


@router.post("/ingest")
async def ingest_source(
    payload: RagIngestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    count = await ingest_service.ingest_source(db, payload.source_id)
    return {"chunks_created": count}


@router.post("/search", response_model=list[RagChunkRead])
async def search(
    payload: RagSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    results = await search_chunks(
        db,
        query=payload.query,
        materia_id=payload.materia_id,
        tipo=payload.tipo.value if payload.tipo else None,
        limit=payload.limit,
    )
    return results


@router.get("/sources", response_model=list[RagSourceRead])
async def list_sources(
    materia_id: UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    stmt = select(RagSource)
    if materia_id:
        stmt = stmt.where(RagSource.materia_id == materia_id)
    else:
        stmt = stmt.where(RagSource.profesor_id == current_user.id)
    result = await db.scalars(stmt.order_by(RagSource.created_at.desc()))
    return list(result)


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_source(
    source_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    source = await db.scalar(select(RagSource).where(RagSource.id == source_id))
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    if current_user.rol != UserRole.ADMIN.value and source.profesor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    await db.delete(source)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
