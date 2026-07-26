from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_roles
from app.db.session import get_db
from app.modules.dba import service
from app.modules.dba.models import DBAPersonalizado
from app.modules.dba.schemas import (
    DBAImportRequest,
    DBAPersonalizadoCreate,
    DBAPersonalizadoRead,
    DBAPersonalizadoUpdate,
    DBARead,
    DBAUnifiedItem,
    DBAUploadResponse, DBASuggestionItem,
)
from app.modules.dba import document_service
from app.modules.materias import service as materias_service
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/dba", tags=["dba"])


@router.get("", response_model=list[DBARead])
async def list_dba(
    area: str | None = Query(default=None),
    grado: str | None = Query(default=None),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[object]:
    return await service.search_dba(db, area=area, grado=grado)


@router.post("/importar", response_model=list[DBARead], status_code=status.HTTP_201_CREATED)
async def import_dba(
    payload: DBAImportRequest,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> list[object]:
    return await service.import_dba(db, payload.items)


# ── DBA personalizados por materia (Fase B) ─────────────────────────────────
# Router separado (sin prefijo /dba) porque las rutas son materia-scoped.
# NO altera los endpoints oficiales de arriba ni el catálogo del MEN.
custom_router = APIRouter(tags=["dba-personalizados"])


def _ensure_can_manage_dba(row: DBAPersonalizado, user: User) -> None:
    """Solo el profesor dueño del DBA o un admin pueden editar/desactivar."""
    if user.rol == UserRole.ADMIN.value or row.profesor_id == user.id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


@custom_router.get(
    "/materias/{materia_id}/dba-personalizados",
    response_model=list[DBAPersonalizadoRead],
    tags=["dba-personalizados"],
)
async def list_dba_personalizados(
    materia_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[object]:
    # Lectura permitida a dueño/admin y estudiantes matriculados de la materia.
    await materias_service.ensure_can_read_materia(db, materia_id, current_user)
    return await service.list_dba_personalizados_by_materia(db, materia_id)


@custom_router.post(
    "/materias/{materia_id}/dba-personalizados",
    response_model=DBAPersonalizadoRead,
    status_code=status.HTTP_201_CREATED,
    tags=["dba-personalizados"],
)
async def create_dba_personalizado(
    materia_id: UUID,
    payload: DBAPersonalizadoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    # Solo el profesor dueño de la materia (o admin) puede crear DBA en ella.
    materia = await materias_service.ensure_can_manage_materia(db, materia_id, current_user)
    return await service.create_dba_personalizado(
        db,
        profesor_id=materia.profesor_id,
        materia_id=materia.id,
        area=materia.area or "",
        grado=materia.grado or "",
        payload=payload,
    )


@custom_router.patch(
    "/dba-personalizados/{dba_id}",
    response_model=DBAPersonalizadoRead,
    tags=["dba-personalizados"],
)
async def update_dba_personalizado(
    dba_id: UUID,
    payload: DBAPersonalizadoUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    row = await service.get_dba_personalizado_or_404(db, dba_id)
    _ensure_can_manage_dba(row, current_user)
    return await service.update_dba_personalizado(db, row, payload)


@custom_router.delete(
    "/dba-personalizados/{dba_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["dba-personalizados"],
)
async def delete_dba_personalizado(
    dba_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    row = await service.get_dba_personalizado_or_404(db, dba_id)
    _ensure_can_manage_dba(row, current_user)
    await service.deactivate_dba_personalizado(db, row)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@custom_router.get(
    "/materias/{materia_id}/dba",
    response_model=list[DBAUnifiedItem],
    tags=["dba-personalizados"],
)
async def list_materia_dba_combined(
    materia_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    materia = await materias_service.ensure_can_read_materia(db, materia_id, current_user)
    return await service.list_combined_dba(db, materia)


# ── Subida de documentos para generar DBA (RAG) ────────────────────────


@custom_router.post(
    "/materias/{materia_id}/dba-personalizados/upload-document",
    response_model=DBAUploadResponse,
    status_code=status.HTTP_200_OK,
    tags=["dba-personalizados"],
)
async def upload_document_for_dba(
    materia_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    """Sube un PDF o DOCX, extrae texto, genera sugerencias de DBA vía RAG+LLM."""
    materia = await materias_service.ensure_can_manage_materia(db, materia_id, current_user)

    contenido = await file.read()
    mime = file.content_type or ""

    if mime not in document_service.MIMES_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no soportado: {mime}. Usa PDF o Word (.docx).",
        )

    texto = document_service.extraer_texto(contenido, mime)
    if not texto.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo extraer texto del documento. Verifica que no esté protegido o vacío.",
        )

    # Contar páginas/párrafos aproximados
    paginas_parrafos = texto.count("\n\n") + 1
    caracteres = len(texto)

    # Generar sugerencias vía LLM
    sugerencias = await document_service.generar_sugerencias_dba(
        user_id=current_user.id,
        materia_id=materia_id,
        area=materia.area or "General",
        grado=materia.grado or "N/A",
        texto_completo=texto,
    )

    # Guardar como fuente RAG para futuras consultas
    from app.modules.rag.models import RagSource, RagChunk
    from app.services.embedding_service import embed_texts

    fuente = RagSource(
        profesor_id=current_user.id,
        materia_id=materia_id,
        tipo="dba",
        titulo=file.filename or "Documento DBA",
        contenido_original=texto[:10000],
        metadata_json={"origen": "upload_dba", "caracteres": caracteres},
    )
    db.add(fuente)
    await db.flush()

    chunks_texto = document_service._chunk_text(texto)
    if chunks_texto:
        embeddings = await embed_texts(chunks_texto)
        for i, (chunk, emb) in enumerate(zip(chunks_texto, embeddings, strict=False)):
            db.add(RagChunk(
                source_id=fuente.id,
                profesor_id=current_user.id,
                materia_id=materia_id,
                tipo="dba",
                chunk_text=chunk,
                embedding=emb if any(v != 0.0 for v in emb) else None,
                metadata_json={"indice": i, "total_chunks": len(chunks_texto)},
            ))
    await db.commit()
    await db.refresh(fuente)

    return DBAUploadResponse(
        source_id=fuente.id,
        nombre_archivo=file.filename or "documento",
        paginas_parrafos=paginas_parrafos,
        caracteres_extraidos=caracteres,
        sugerencias=[DBASuggestionItem(**s) for s in sugerencias],
    )
