"""Recursos de practica que Xali guarda para cada estudiante y evaluacion."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class XaliStudentResource(Base):
    __tablename__ = "xali_student_resources"
    __table_args__ = (
        UniqueConstraint(
            "estudiante_id",
            "evaluacion_id",
            "tipo",
            name="uq_xali_student_resource_evaluation_type",
        ),
    )

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    estudiante_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    evaluacion_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evaluaciones.id", ondelete="CASCADE"),
        nullable=False,
    )
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    titulo: Mapped[str] = mapped_column(String(180), nullable=False)
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
