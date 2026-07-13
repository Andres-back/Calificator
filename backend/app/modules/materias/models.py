from datetime import datetime
from uuid import uuid4
from uuid import UUID as PyUUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.shared.enums import MateriaEstado


class Materia(Base):
    __tablename__ = "materias"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    profesor_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    nombre: Mapped[str] = mapped_column(String(180), nullable=False)
    area: Mapped[str | None] = mapped_column(String(100))
    grado: Mapped[str | None] = mapped_column(String(30))
    descripcion: Mapped[str | None] = mapped_column(Text)
    codigo_matricula: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    codigo_activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    requiere_aprobacion: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default=MateriaEstado.ACTIVA.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    profesor: Mapped["User"] = relationship("User", back_populates="materias")  # type: ignore[name-defined]
    matriculas: Mapped[list["Matricula"]] = relationship(  # type: ignore[name-defined]
        "Matricula",
        back_populates="materia",
        cascade="all, delete-orphan",
    )
    evaluaciones: Mapped[list["Evaluacion"]] = relationship(  # type: ignore[name-defined]
        "Evaluacion",
        back_populates="materia",
    )


Index("idx_materias_profesor", Materia.profesor_id)
Index("idx_materias_codigo", Materia.codigo_matricula)
