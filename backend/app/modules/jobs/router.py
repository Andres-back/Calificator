from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.jobs.schemas import JobEstadoRead, JobRead
from app.modules.users.models import User

router = APIRouter(prefix="/jobs", tags=["jobs"])


async def _get_job(db: AsyncSession, job_id: UUID, user_id: UUID) -> dict:
    row = await db.execute(
        text("SELECT * FROM ai_jobs WHERE id=:id AND (user_id=:u OR :u IS NULL)"),
        {"id": str(job_id), "u": str(user_id)},
    )
    r = row.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return dict(r._mapping)


@router.get("/{job_id}", response_model=JobRead)
async def get_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await _get_job(db, job_id, current_user.id)


@router.get("/{job_id}/estado", response_model=JobEstadoRead)
async def get_estado(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    job = await _get_job(db, job_id, current_user.id)
    return {"id": job["id"], "estado": job["estado"], "progreso": job["progreso"], "error": job["error"]}


@router.post("/{job_id}/cancelar", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def cancelar_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await db.execute(
        text(
            "UPDATE ai_jobs SET estado='cancelled' "
            "WHERE id=:id AND user_id=:u AND estado IN ('queued','running')"
        ),
        {"id": str(job_id), "u": str(current_user.id)},
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
