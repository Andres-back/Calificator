"""Biblioteca de imágenes generadas: registro automático, dedupe y consulta."""
from __future__ import annotations

import hashlib
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.imagenes.models import ImagenGenerada

logger = get_logger(__name__)

# Costo estimado por imagen según proveedor (USD). gpt-image-2 low ≈ 0.004.
COSTO_POR_PROVEEDOR: dict[str, Decimal] = {
    "openai": Decimal("0.004"),
    "cloudflare": Decimal("0.0"),
    "placeholder": Decimal("0.0"),
}

ESTADOS_VALIDOS = {"success", "failed", "reused", "archived"}


def compute_prompt_hash(prompt_usado: str, *, modelo: str, calidad: str, size: str) -> str:
    """Hash de reutilización: prompt exacto + modelo + calidad + tamaño."""
    key = f"{(prompt_usado or '').strip()}|{modelo}|{calidad}|{size}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def compute_file_hash(file_path: str | Path | None) -> str | None:
    if not file_path:
        return None
    path = Path(file_path)
    try:
        if not path.is_file():
            return None
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except Exception:  # noqa: BLE001
        return None


def provider_model_quality(proveedor: str) -> tuple[str, str]:
    """(modelo, calidad) reales según proveedor configurado."""
    if proveedor == "openai":
        return (
            str(getattr(settings, "OPENAI_IMAGE_MODEL", "gpt-image-2")),
            str(getattr(settings, "OPENAI_IMAGE_QUALITY", "low")),
        )
    if proveedor == "cloudflare":
        return (
            str(getattr(settings, "CLOUDFLARE_IMAGE_MODEL", "@cf/bytedance/stable-diffusion-xl-lightning")),
            "standard",
        )
    return ("placeholder", "n/a")


async def find_reusable_by_prompt_hash(db: AsyncSession, prompt_hash: str) -> ImagenGenerada | None:
    """Imagen success+reusable con el mismo prompt_hash cuyo archivo aún existe."""
    result = await db.scalars(
        select(ImagenGenerada)
        .where(
            ImagenGenerada.prompt_hash == prompt_hash,
            ImagenGenerada.estado == "success",
            ImagenGenerada.reusable.is_(True),
        )
        .order_by(ImagenGenerada.created_at.desc())
        .limit(5)
    )
    for row in result:
        if row.file_path and Path(row.file_path).is_file():
            return row
    return None


async def register_imagen_generada(
    db: AsyncSession,
    *,
    prompt_usado: str,
    proveedor: str,
    prompt_original: str = "",
    prompt_normalizado: str | None = None,
    restricciones: str | None = None,
    descripcion: str | None = None,
    tags: list[str] | None = None,
    tema: str | None = None,
    area: str | None = None,
    grado: str | None = None,
    materia_id: UUID | None = None,
    tipo_uso: str = "apoyo_visual",
    modulo_origen: str = "otro",
    size: str = "1024x1024",
    file_path: str | None = None,
    public_url: str | None = None,
    estado: str = "success",
    reusable: bool = True,
    user_id: UUID | None = None,
    presentation_id: UUID | None = None,
    slide_index: int | None = None,
    error: str | None = None,
    commit: bool = True,
) -> ImagenGenerada:
    """Registra una imagen generada (o fallida/reutilizada) en la biblioteca.

    Nunca lanza hacia el flujo de generación: si el registro falla se loguea y
    se devuelve un objeto sin persistir, para no romper la generación.
    """
    modelo, calidad = provider_model_quality(proveedor)
    costo = COSTO_POR_PROVEEDOR.get(proveedor, Decimal("0.0")) if estado == "success" else Decimal("0.0")
    row = ImagenGenerada(
        prompt_original=prompt_original or prompt_usado,
        prompt_normalizado=prompt_normalizado,
        prompt_usado=prompt_usado,
        restricciones=restricciones,
        descripcion=descripcion,
        tags=[t for t in (tags or []) if t],
        tema=(tema or None) and str(tema)[:200],
        area=(area or None) and str(area)[:100],
        grado=(grado or None) and str(grado)[:30],
        materia_id=materia_id,
        tipo_uso=tipo_uso,
        modulo_origen=modulo_origen,
        proveedor=proveedor,
        modelo=modelo,
        calidad=calidad,
        size=size,
        costo_estimado=costo,
        file_path=file_path,
        public_url=public_url,
        prompt_hash=compute_prompt_hash(prompt_usado, modelo=modelo, calidad=calidad, size=size),
        file_hash=compute_file_hash(file_path),
        estado=estado if estado in ESTADOS_VALIDOS else "success",
        reusable=reusable and estado in {"success", "reused"},
        user_id=user_id,
        presentation_id=presentation_id,
        slide_index=slide_index,
        error=(error or None) and str(error)[:1000],
    )
    try:
        db.add(row)
        if commit:
            await db.commit()
            await db.refresh(row)
    except Exception:  # noqa: BLE001
        logger.exception("No se pudo registrar imagen generada (estado=%s, modulo=%s)", estado, modulo_origen)
        try:
            await db.rollback()
        except Exception:  # noqa: BLE001
            pass
    return row


def build_default_tags(
    *, tema: str | None, area: str | None, grado: str | None, tipo_uso: str, extra: list[str] | None = None
) -> list[str]:
    """Tags deterministas (sin costo LLM extra): tema, área, grado, tipo de uso."""
    tags: list[str] = []
    for value in [tema, area, f"grado {grado}" if grado else None, tipo_uso, *(extra or [])]:
        cleaned = " ".join(str(value or "").split()).lower()
        if cleaned and cleaned not in tags:
            tags.append(cleaned[:60])
    return tags[:12]


def build_default_description(*, tipo_uso: str, titulo: str | None, tema: str | None) -> str:
    labels = {
        "portada": "Portada educativa",
        "apoyo_visual": "Imagen de apoyo visual",
        "infografia_completa": "Infografía educativa completa",
        "actividad": "Imagen para actividad",
        "cierre": "Imagen de cierre",
        "diagrama": "Diagrama educativo",
        "fondo": "Fondo educativo",
        "personaje": "Personaje educativo",
    }
    base = labels.get(tipo_uso, "Imagen educativa")
    subject = " ".join(str(titulo or tema or "").split())
    return f"{base} sobre {subject}." if subject else f"{base}."


async def list_imagenes_generadas(
    db: AsyncSession,
    *,
    user_id: UUID | None,
    is_admin: bool,
    q: str | None = None,
    tema: str | None = None,
    area: str | None = None,
    grado: str | None = None,
    materia_id: UUID | None = None,
    tags: str | None = None,
    tipo_uso: str | None = None,
    modulo_origen: str | None = None,
    proveedor: str | None = None,
    calidad: str | None = None,
    reusable: bool | None = None,
    estado: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[ImagenGenerada]:
    stmt = select(ImagenGenerada)
    if not is_admin:
        stmt = stmt.where(ImagenGenerada.user_id == user_id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            ImagenGenerada.descripcion.ilike(like)
            | ImagenGenerada.tema.ilike(like)
            | ImagenGenerada.prompt_usado.ilike(like)
        )
    if tema:
        stmt = stmt.where(ImagenGenerada.tema.ilike(f"%{tema.strip()}%"))
    if area:
        stmt = stmt.where(ImagenGenerada.area.ilike(area))
    if grado:
        stmt = stmt.where(ImagenGenerada.grado == grado)
    if materia_id:
        stmt = stmt.where(ImagenGenerada.materia_id == materia_id)
    if tags:
        wanted = [t.strip().lower() for t in tags.split(",") if t.strip()]
        for tag in wanted:
            stmt = stmt.where(ImagenGenerada.tags.contains([tag]))
    if tipo_uso:
        stmt = stmt.where(ImagenGenerada.tipo_uso == tipo_uso)
    if modulo_origen:
        stmt = stmt.where(ImagenGenerada.modulo_origen == modulo_origen)
    if proveedor:
        stmt = stmt.where(ImagenGenerada.proveedor == proveedor)
    if calidad:
        stmt = stmt.where(ImagenGenerada.calidad == calidad)
    if reusable is not None:
        stmt = stmt.where(ImagenGenerada.reusable.is_(reusable))
    if estado:
        stmt = stmt.where(ImagenGenerada.estado == estado)
    stmt = stmt.order_by(ImagenGenerada.created_at.desc()).limit(max(1, min(limit, 200))).offset(max(0, offset))
    result = await db.scalars(stmt)
    return list(result)


async def get_imagen_or_404(db: AsyncSession, imagen_id: UUID) -> ImagenGenerada:
    row = await db.get(ImagenGenerada, imagen_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imagen no encontrada")
    return row


async def update_imagen_generada(db: AsyncSession, row: ImagenGenerada, data: dict[str, Any]) -> ImagenGenerada:
    """Actualiza campos editables: tags, descripcion, reusable, estado(archived)."""
    if "tags" in data and data["tags"] is not None:
        row.tags = [str(t).strip().lower()[:60] for t in data["tags"] if str(t).strip()][:12]
    if "descripcion" in data and data["descripcion"] is not None:
        row.descripcion = str(data["descripcion"])[:500]
    if "reusable" in data and data["reusable"] is not None:
        row.reusable = bool(data["reusable"])
    if "estado" in data and data["estado"]:
        nuevo = str(data["estado"])
        if nuevo not in {"archived", "success"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se permite archivar (archived) o reactivar (success) una imagen.",
            )
        row.estado = nuevo
        if nuevo == "archived":
            row.reusable = False
    await db.commit()
    await db.refresh(row)
    return row
