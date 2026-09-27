"""Modelos SQLAlchemy para RAG (rag_sources, rag_chunks)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID as PyUUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RagSource(Base):
    __tablename__ = "rag_sources"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    profesor_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    materia_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("materias.id"), nullable=True
    )
    tipo: Mapped[str] = mapped_column(String(60), nullable=False)
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    contenido_original: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    chunks: Mapped[list["RagChunk"]] = relationship(
        "RagChunk", back_populates="source", cascade="all, delete-orphan"
    )


Index("idx_rag_sources_materia", RagSource.materia_id)
Index("idx_rag_sources_profesor", RagSource.profesor_id)


class RagChunk(Base):
    __tablename__ = "rag_chunks"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    source_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rag_sources.id", ondelete="CASCADE"),
        nullable=False,
    )
    profesor_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    materia_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("materias.id"), nullable=True
    )
    tipo: Mapped[str] = mapped_column(String(60), nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(ARRAY(Float), nullable=True)
    embedding_vec: Mapped[list[float] | None] = mapped_column(
        Vector(1024), nullable=True
    )
    embedding_provider: Mapped[str | None] = mapped_column(String(60), nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(200), nullable=True)
    embedding_dimensions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    embedding_space_version: Mapped[str | None] = mapped_column(
        String(300), nullable=True
    )
    metadata_json: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    source: Mapped[RagSource] = relationship("RagSource", back_populates="chunks")


Index("idx_rag_chunks_materia", RagChunk.materia_id)
Index("idx_rag_chunks_profesor", RagChunk.profesor_id)
Index("idx_rag_chunks_tipo", RagChunk.tipo)
