"""Crea registros diarios de asistencia por materia.

Revision ID: 202607280001
Revises: 202607280000
Create Date: 2026-07-28 09:00:00
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "202607280001"
down_revision: Union[str, None] = "202607280000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    table_exists = inspector.has_table("asistencia_registros")

    if not table_exists:
        op.create_table(
            "asistencia_registros",
            sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
            sa.Column("materia_id", UUID(as_uuid=True), sa.ForeignKey("materias.id", ondelete="CASCADE"), nullable=False),
            sa.Column("estudiante_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("registrado_por", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("fecha", sa.Date, nullable=False),
            sa.Column("estado", sa.String(20), nullable=False, server_default="presente"),
            sa.Column("observacion", sa.Text, nullable=True),
            sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
            sa.CheckConstraint(
                "estado IN ('presente','tarde','ausente','excusa')",
                name="ck_asistencia_estado",
            ),
            sa.UniqueConstraint(
                "materia_id",
                "estudiante_id",
                "fecha",
                name="uq_asistencia_materia_estudiante_fecha",
            ),
        )
    else:
        required_columns = {
            "id",
            "materia_id",
            "estudiante_id",
            "registrado_por",
            "fecha",
            "estado",
            "observacion",
            "created_at",
            "updated_at",
        }
        existing_columns = {
            column["name"]
            for column in inspector.get_columns("asistencia_registros")
        }
        missing_columns = required_columns - existing_columns
        if missing_columns:
            missing = ", ".join(sorted(missing_columns))
            raise RuntimeError(
                f"La tabla asistencia_registros existe pero le faltan columnas: {missing}"
            )

    index_names = {
        index["name"]
        for index in sa.inspect(op.get_bind()).get_indexes("asistencia_registros")
    }
    if "idx_asistencia_materia_fecha" not in index_names:
        op.create_index(
            "idx_asistencia_materia_fecha",
            "asistencia_registros",
            ["materia_id", "fecha"],
        )
    if "idx_asistencia_estudiante_fecha" not in index_names:
        op.create_index(
            "idx_asistencia_estudiante_fecha",
            "asistencia_registros",
            ["estudiante_id", "fecha"],
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("asistencia_registros"):
        return

    index_names = {
        index["name"]
        for index in inspector.get_indexes("asistencia_registros")
    }
    if "idx_asistencia_estudiante_fecha" in index_names:
        op.drop_index("idx_asistencia_estudiante_fecha", table_name="asistencia_registros")
    if "idx_asistencia_materia_fecha" in index_names:
        op.drop_index("idx_asistencia_materia_fecha", table_name="asistencia_registros")
    op.drop_table("asistencia_registros")
