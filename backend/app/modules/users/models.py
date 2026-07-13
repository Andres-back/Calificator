from datetime import datetime
from uuid import uuid4
from uuid import UUID as PyUUID

from sqlalchemy import CheckConstraint, DateTime, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.shared.enums import UserEstado, UserRole


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "rol IN ('admin', 'profesor', 'estudiante')",
            name="ck_users_rol",
        ),
    )

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    nombre: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(180), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    rol: Mapped[str] = mapped_column(String(30), nullable=False, default=UserRole.ESTUDIANTE.value)
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default=UserEstado.ACTIVO.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    materias: Mapped[list["Materia"]] = relationship(  # type: ignore[name-defined]
        "Materia",
        back_populates="profesor",
    )
    matriculas: Mapped[list["Matricula"]] = relationship(  # type: ignore[name-defined]
        "Matricula",
        back_populates="estudiante",
    )
    evaluaciones: Mapped[list["Evaluacion"]] = relationship(  # type: ignore[name-defined]
        "Evaluacion",
        back_populates="profesor",
    )
