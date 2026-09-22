from datetime import datetime
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ImportacionEstudiantesLote(Base):
    __tablename__ = "importacion_estudiantes_lotes"
    __table_args__ = (CheckConstraint("estado IN ('procesando','revision','confirmado','cancelado','error')", name="ck_importacion_estudiantes_lotes_estado"),)

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    materia_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("materias.id", ondelete="CASCADE"), nullable=False, index=True)
    creado_por: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # ai_jobs es una tabla SQL gestionada por jobs_service, no un modelo ORM.
    # La clave foránea se conserva en la migración PostgreSQL.
    job_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True))
    archivo_key: Mapped[str | None] = mapped_column(Text)
    archivo_nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    archivo_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="procesando", server_default="procesando")
    resultado_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    confirmado_at: Mapped[datetime | None] = mapped_column(DateTime)
    credenciales_entregadas_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    filas: Mapped[list["ImportacionEstudiantesFila"]] = relationship(back_populates="lote", cascade="all, delete-orphan", order_by="ImportacionEstudiantesFila.orden")


class ImportacionEstudiantesFila(Base):
    __tablename__ = "importacion_estudiantes_filas"
    __table_args__ = (
        UniqueConstraint("lote_id", "orden", name="uq_importacion_estudiantes_filas_orden"),
        CheckConstraint("decision IN ('crear','omitir','asociar')", name="ck_importacion_estudiantes_filas_decision"),
    )
    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    lote_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("importacion_estudiantes_lotes.id", ondelete="CASCADE"), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    nombre_detectado: Mapped[str] = mapped_column(String(160), nullable=False)
    nombre_revisado: Mapped[str] = mapped_column(String(160), nullable=False)
    confianza: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    requiere_revision: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    duplicado_confirmado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    decision: Mapped[str] = mapped_column(String(30), nullable=False, default="crear", server_default="crear")
    estudiante_existente_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    advertencias: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    lote: Mapped[ImportacionEstudiantesLote] = relationship(back_populates="filas")
