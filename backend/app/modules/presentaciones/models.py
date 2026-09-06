from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.shared.enums import PresentacionEstado


class Presentacion(Base):
    __tablename__ = "presentaciones"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    profesor_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    materia_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("materias.id"), nullable=True
    )
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    estado: Mapped[str] = mapped_column(
        String(40), nullable=False, default=PresentacionEstado.QUEUED.value
    )
    slides_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    pptx_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    @property
    def _generation_metadata(self) -> dict:
        canonical = (self.slides_json or {}).get("canonical")
        if not isinstance(canonical, dict):
            return {}
        generation = canonical.get("generation")
        return generation if isinstance(generation, dict) else {}

    @property
    def etapa(self) -> str | None:
        value = self._generation_metadata.get("etapa")
        return str(value) if value else None

    @property
    def mensaje(self) -> str | None:
        value = self._generation_metadata.get("mensaje")
        return str(value) if value else None

    @property
    def progreso(self) -> int:
        value = self._generation_metadata.get("progreso")
        try:
            return max(0, min(100, int(value)))
        except (TypeError, ValueError):
            return 0

    @property
    def imagenes_completadas(self) -> int:
        slides = (self.slides_json or {}).get("slides")
        if not isinstance(slides, list):
            return 0
        return sum(
            1 for slide in slides
            if isinstance(slide, dict) and slide.get("image_asset")
        )

    @property
    def imagenes_total(self) -> int:
        value = self._generation_metadata.get("imagenes_total")
        try:
            return max(0, int(value))
        except (TypeError, ValueError):
            return self.imagenes_completadas

    @property
    def elapsed_ms(self) -> int:
        start = self.created_at
        if start is None:
            return 0
        end = (
            self.updated_at
            if self.estado in {
                PresentacionEstado.SUCCESS.value,
                PresentacionEstado.FAILED.value,
            }
            else datetime.now(timezone.utc)
        )
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        return max(0, int((end - start).total_seconds() * 1000))


Index("idx_presentaciones_profesor", Presentacion.profesor_id)
