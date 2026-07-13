from datetime import datetime
from uuid import uuid4
from uuid import UUID as PyUUID

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.shared.enums import MatriculaEstado


class Matricula(Base):
    __tablename__ = "matriculas"
    __table_args__ = (UniqueConstraint("materia_id", "estudiante_id", name="uq_matriculas_materia_estudiante"),)

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    materia_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("materias.id", ondelete="CASCADE"),
        nullable=False,
    )
    estudiante_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    estado: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=MatriculaEstado.ACTIVO.value,
    )
    fecha_matricula: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    materia: Mapped["Materia"] = relationship("Materia", back_populates="matriculas")  # type: ignore[name-defined]
    estudiante: Mapped["User"] = relationship("User", back_populates="matriculas")  # type: ignore[name-defined]


Index("idx_matriculas_materia", Matricula.materia_id)
Index("idx_matriculas_estudiante", Matricula.estudiante_id)
