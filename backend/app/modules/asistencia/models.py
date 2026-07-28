from datetime import date, datetime
from uuid import UUID as PyUUID
from uuid import uuid4

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.shared.enums import AsistenciaEstado


class AsistenciaRegistro(Base):
    __tablename__ = "asistencia_registros"
    __table_args__ = (
        UniqueConstraint(
            "materia_id",
            "estudiante_id",
            "fecha",
            name="uq_asistencia_materia_estudiante_fecha",
        ),
        CheckConstraint(
            "estado IN ('presente','tarde','ausente','excusa')",
            name="ck_asistencia_estado",
        ),
    )

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
    registrado_por: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=AsistenciaEstado.PRESENTE.value,
    )
    observacion: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


Index("idx_asistencia_materia_fecha", AsistenciaRegistro.materia_id, AsistenciaRegistro.fecha)
Index("idx_asistencia_estudiante_fecha", AsistenciaRegistro.estudiante_id, AsistenciaRegistro.fecha)
