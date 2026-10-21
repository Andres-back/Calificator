"""Lectura con credencial individual; sin dependencias de cuenta de plataforma."""
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Path, Response
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.rate_limit import rate_limit
from app.modules.feedback_sharing.access_policy import UNAVAILABLE, db_now, guard_token
from app.modules.feedback_sharing.http_policy import PrivateRoute
from app.modules.feedback_sharing.http_policy import PRIVATE_HEADERS
from app.modules.feedback_sharing.quota_service import quota_snapshot
from app.modules.feedback_sharing import chat_service
from app.modules.feedback_sharing.schemas import QuestionInput
from app.modules.calificaciones.evidence_service import EvidencePageError, MAX_EVIDENCE_PAGES, _render_cached_evidence_page
from app.services.storage_service import resolve_upload_path

# Transport abuse guard, deliberately generous for a shared school NAT.
# Academic quota remains PostgreSQL-based and independent of IP/device.
limit_feedback_access = rate_limit(limit=1800, window_seconds=60, scope="feedback_public_access")
router = APIRouter(prefix="/public/devolucion", tags=["devolucion_individual"], route_class=PrivateRoute, dependencies=[Depends(limit_feedback_access)])


def read_credential(authorization: str | None = Header(default=None)) -> str:
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return ""


@router.post("/preguntas", status_code=202)
async def ask_question(payload: QuestionInput, background: BackgroundTasks, credential: str = Depends(read_credential), db: AsyncSession = Depends(get_db)):
    request, _ = await chat_service.admit_question(db, credential, payload)
    request_id = request.id
    await db.commit()
    result = await chat_service.read_request(db, credential, request_id)
    if request.status == "queued":
        background.add_task(chat_service.dispatch_question, request_id)
    return result


@router.get("/preguntas/{request_id}")
async def read_question(request_id: UUID, credential: str = Depends(read_credential), db: AsyncSession = Depends(get_db)):
    return await chat_service.read_request(db, credential, request_id)


@router.get("")
async def read_feedback(credential: str = Depends(read_credential), db: AsyncSession = Depends(get_db)):
    context = await guard_token(db, credential)
    quota = await quota_snapshot(db, context)
    context = await guard_token(db, credential)
    return {"resultado": context.publication.payload_json, "expires_at": context.access.expires_at, "server_now": await db_now(db), "cupo": quota, "evidencia_disponible": bool(context.publication.evidence_enabled and context.source.delivery)}


@router.get("/evidencia/{page}")
async def read_evidence(page: int = Path(ge=1, le=MAX_EVIDENCE_PAGES), credential: str = Depends(read_credential), db: AsyncSession = Depends(get_db)):
    context = await guard_token(db, credential)
    delivery = context.source.delivery
    if not context.publication.evidence_enabled or not delivery or not delivery.archivo_url:
        raise HTTPException(404, "Evidencia no disponible.")
    publication_id, generation = context.publication.id, context.access.credential_generation
    try:
        source = resolve_upload_path(delivery.archivo_url)
        if not source.is_file():
            raise ValueError("missing")
        # El renderizador existente guarda en .private, no en una URL pública.
        rendered, total, _ = await run_in_threadpool(_render_cached_evidence_page, source, page)
        content = await run_in_threadpool(rendered.read_bytes)
    except (ValueError, OSError, EvidencePageError):
        raise HTTPException(404, "Evidencia no disponible.") from None
    final_context = await guard_token(db, credential)
    if final_context.publication.id != publication_id or final_context.access.credential_generation != generation:
        raise HTTPException(404, UNAVAILABLE)
    return Response(content, media_type="image/png", headers={**PRIVATE_HEADERS, "X-Evidence-Pages": str(total)})
