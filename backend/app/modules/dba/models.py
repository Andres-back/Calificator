from datetime import datetime
from uuid import uuid4
from uuid import UUID as PyUUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DBACatalog(Base):
    """DBA oficiales del MEN (catálogo). NO se modifica en la Fase B."""

    __tablename__ = "dba_catalog"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    area: Mapped[str] = mapped_column(String(100), nullable=False)
    grado: Mapped[str] = mapped_column(String(30), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(80))
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    fuente: Mapped[str | None] = mapped_column(Text)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())


Index("idx_dba_area_grado", DBACatalog.area, DBACatalog.grado)


class DBAPersonalizado(Base):
    """DBA/criterio curricular personalizado por un profesor para una de sus
    materias. Es una tabla SEPARADA de dba_catalog: no reemplaza ni daña los
    DBA oficiales del MEN."""

    __tablename__ = "dba_personalizados"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    profesor_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    materia_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("materias.id"), nullable=False
    )
    area: Mapped[str] = mapped_column(String(100), nullable=False)
    grado: Mapped[str] = mapped_column(String(30), nullable=False)
    enunciado: Mapped[str] = mapped_column(Text, nullable=False)
    evidencias_aprendizaje: Mapped[str | None] = mapped_column(Text)
    ejemplo: Mapped[str | None] = mapped_column(Text)
    fuente: Mapped[str] = mapped_column(
        String(30), nullable=False, default="personalizado", server_default="personalizado"
    )
    activo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )


Index("idx_dba_personalizado_materia", DBAPersonalizado.materia_id, DBAPersonalizado.activo)
Index("idx_dba_personalizado_profesor", DBAPersonalizado.profesor_id)
