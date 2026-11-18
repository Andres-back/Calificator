"""Punto de acceso para obtener texto desde una foto o un archivo (Spec 201)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from pydantic import BaseModel

from app.core.logging import get_logger
from app.core.permissions import get_current_user
from app.core.rate_limit import rate_limit
from app.modules.captura_texto.service import MAX_FILE_BYTES, UnsupportedFile, capture_text
from app.modules.users.models import User
from app.services.storage_service import UploadTooLargeError, read_upload_limited

logger = get_logger(__name__)
router = APIRouter(prefix="/captura-texto", tags=["captura-texto"])

ACCEPTED = "Usa una foto (JPG, PNG o WEBP), un PDF, un Word (.docx), un Excel (.xlsx), un CSV o un archivo de texto."


class CapturedTextRead(BaseModel):
    texto: str
    origen: str
    advertencias: list[str]
    paginas: int


@router.post("", response_model=CapturedTextRead)
async def capturar_texto(
    response: Response,
    archivo: UploadFile = File(...),
    actor: User = Depends(get_current_user),
    _: None = Depends(rate_limit(limit=40, window_seconds=3600, scope="text-capture")),
) -> CapturedTextRead:
    """Lee el texto de una foto o un archivo. No guarda el archivo ni modifica datos."""
    if actor.rol not in ("profesor", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Esta ayuda está disponible para docentes.")
    try:
        content = await read_upload_limited(archivo, MAX_FILE_BYTES)
    except UploadTooLargeError as exc:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "El archivo supera los 20 MB. Usa uno más liviano.") from exc
    try:
        captured = await capture_text(content, archivo.filename or "", actor.id)
    except UnsupportedFile as exc:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"{exc} {ACCEPTED}") from exc
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - el docente debe poder reintentar o digitar
        logger.warning("Captura de texto fallida: %s", type(exc).__name__)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "No se pudo leer el archivo en este momento. Intenta de nuevo o pega el texto.",
        ) from exc
    response.headers["Cache-Control"] = "no-store"
    return CapturedTextRead(texto=captured.texto, origen=captured.origen, advertencias=captured.advertencias, paginas=captured.paginas)
