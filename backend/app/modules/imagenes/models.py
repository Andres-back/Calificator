from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ImagenGenerada(Base):
    """Biblioteca de imágenes generadas por IA.

    Toda imagen generada por XCalificator (presentaciones, herramientas,
    endpoint manual) se registra aquí como recurso reutilizable y auditable,
    incluyendo el prompt EXACTO enviado al proveedor, hashes para dedupe,
    costo estimado y metadatos pedagógicos. También se registran los fallos
    (estado=failed) y las reutilizaciones (estado=reused).
    """

    __tablename__ = "imagenes_generadas"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()")
    )
    user_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    presentation_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("presentaciones.id", ondelete="SET NULL"), nullable=True
    )
    slide_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    materia_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("materias.id", ondelete="SET NULL"), nullable=True
    )

    # Prompts (auditoría completa)
    prompt_original: Mapped[str] = mapped_column(Text, nullable=False, default="")
    prompt_normalizado: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt_usado: Mapped[str] = mapped_column(Text, nullable=False)
    restricciones: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Metadatos pedagógicos / de búsqueda
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    tema: Mapped[str | None] = mapped_column(String(200), nullable=True)
    area: Mapped[str | None] = mapped_column(String(100), nullable=True)
    grado: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tipo_uso: Mapped[str] = mapped_column(String(40), nullable=False, default="apoyo_visual")
    modulo_origen: Mapped[str] = mapped_column(String(40), nullable=False, default="otro")

    # Proveedor / costo
    proveedor: Mapped[str] = mapped_column(String(30), nullable=False)
    modelo: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    calidad: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    size: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    costo_estimado: Mapped[Decimal | None] = mapped_column(Numeric(8, 4), nullable=True)

    # Archivo
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    public_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    file_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Estado
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="success")
    reusable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )


Index("idx_imagenes_generadas_prompt_hash", ImagenGenerada.prompt_hash)
Index("idx_imagenes_generadas_user", ImagenGenerada.user_id)
Index("idx_imagenes_generadas_estado_reusable", ImagenGenerada.estado, ImagenGenerada.reusable)
Index("idx_imagenes_generadas_presentacion", ImagenGenerada.presentation_id)
