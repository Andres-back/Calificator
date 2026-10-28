"""Authenticated pre-upload geometric advice; never creates an academic record."""
from __future__ import annotations

import asyncio
from contextlib import suppress
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.permissions import get_current_user, is_student_enrolled, require_permission_now
from app.db.session import get_db
from app.modules.calificaciones.evidence_scan_admission import scan_enabled_for
from app.modules.calificaciones.evidence_scan_suggestion import (
    CornerContext, CornerSuggestionStore, MAX_IMAGE_BYTES, SuggestionConflict,
    public_suggestion, suggest_corners,
)
from app.modules.evaluaciones import service as evaluations
from app.modules.users.models import User
from app.services.storage_service import read_upload_limited

router = APIRouter()


async def authorize_corner_context(db, actor, evaluation_id, student_id):
    require_permission_now(actor, 'grading.grade')
    if actor.rol not in {'profesor', 'admin'}:
        raise HTTPException(403, 'Esta ayuda está disponible para el docente autorizado.')
    evaluation = await evaluations.ensure_can_manage_evaluation(db, evaluation_id, actor, admission=True)
    if not await is_student_enrolled(db, evaluation.materia_id, student_id):
        raise HTTPException(403, 'El estudiante no está matriculado en esta materia.')
    if (not scan_enabled_for(actor) or not settings.EVIDENCE_CORNER_ASSISTANCE_ENABLED
            or evaluation.modalidad == 'online'):
        raise HTTPException(409, 'La ayuda de encuadre no está habilitada. Puedes ajustar los bordes o usar la foto original.')


@router.post('/calificaciones/sugerir-bordes')
async def suggest_evidence_corners(
    response: Response,
    evaluacion_id: Annotated[UUID, Form()],
    estudiante_id: Annotated[UUID, Form()],
    solicitud_id: Annotated[UUID, Form()],
    image_sha256: Annotated[str, Form(pattern=r'^[a-f0-9]{64}$')],
    width: Annotated[int, Form(ge=2, le=1024)],
    height: Annotated[int, Form(ge=2, le=1024)],
    imagen: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    response.headers['Cache-Control'] = 'private, no-store'
    ctx = CornerContext(current_user.id, evaluacion_id, estudiante_id, solicitud_id, image_sha256, width, height)
    store = None
    try:
        async with asyncio.timeout(20):
            await authorize_corner_context(db, current_user, evaluacion_id, estudiante_id)
            content = await read_upload_limited(imagen, max_bytes=MAX_IMAGE_BYTES)
            store = CornerSuggestionStore.connect()
            return await suggest_corners(db, store, ctx, content)
    except SuggestionConflict:
        raise HTTPException(409, 'Esta búsqueda pertenece a otra foto. Conservamos tu selección.') from None
    except ValueError:
        raise HTTPException(422, 'No pudimos leer esta vista. Puedes ajustar los bordes o usar la foto original.') from None
    except HTTPException:
        raise
    except Exception:
        return public_suggestion(ctx, {'state': 'unavailable'})
    finally:
        await imagen.close()
        if store:
            with suppress(Exception):
                await asyncio.wait_for(store.close(), .5)


@router.get('/calificaciones/sugerir-bordes/{solicitud_id}')
async def get_corner_suggestion(
    solicitud_id: UUID,
    response: Response,
    evaluacion_id: UUID,
    estudiante_id: UUID,
    image_sha256: Annotated[str, Query(pattern=r'^[a-f0-9]{64}$')],
    width: Annotated[int, Query(ge=2, le=1024)],
    height: Annotated[int, Query(ge=2, le=1024)],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    response.headers['Cache-Control'] = 'private, no-store'
    await authorize_corner_context(db, current_user, evaluacion_id, estudiante_id)
    ctx = CornerContext(current_user.id, evaluacion_id, estudiante_id, solicitud_id, image_sha256, width, height)
    store = CornerSuggestionStore.connect()
    try:
        return public_suggestion(ctx, await store.read(ctx))
    except SuggestionConflict:
        raise HTTPException(409, 'Esta búsqueda pertenece a otra foto.') from None
    except Exception:
        return public_suggestion(ctx, {'state': 'unavailable'})
    finally:
        with suppress(Exception):
            await asyncio.wait_for(store.close(), .5)
