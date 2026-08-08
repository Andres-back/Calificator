"""Repair operational tables missing from stamped databases.

Revision ID: 202608080001
Revises: 202608010001
Create Date: 2026-08-08
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID


revision: str = "202608080001"
down_revision: Union[str, None] = "202608010001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    table_names = set(inspector.get_table_names())

    if "analytics_eventos" not in table_names:
        op.create_table(
            "analytics_eventos",
            sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
            sa.Column("tipo", sa.String(60), nullable=False),
            sa.Column("actor_id", UUID(as_uuid=True), nullable=True),
            sa.Column("evaluacion_id", UUID(as_uuid=True), nullable=True),
            sa.Column("calificacion_id", UUID(as_uuid=True), nullable=True),
            sa.Column("metadata_json", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("idx_analytics_tipo", "analytics_eventos", ["tipo"])
        op.create_index("idx_analytics_created", "analytics_eventos", ["created_at"])

    if "calificacion_incidencias" not in table_names:
        op.create_table(
            "calificacion_incidencias",
            sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
            sa.Column(
                "calificacion_id",
                UUID(as_uuid=True),
                sa.ForeignKey("calificaciones.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("tipo", sa.String(40), nullable=False),
            sa.Column("descripcion", sa.Text(), nullable=False),
            sa.Column("estado", sa.String(20), nullable=False, server_default="abierta"),
            sa.Column("metadata_json", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
            sa.Column("resolucion", sa.Text(), nullable=True),
            sa.Column("resuelto_por", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.CheckConstraint(
                "tipo IN ('imagen_no_usable','vision_failed','grader_error','discrepancia_alta','confianza_baja','docente_rechazo')",
                name="ck_incidencias_tipo",
            ),
            sa.CheckConstraint("estado IN ('abierta','resuelta')", name="ck_incidencias_estado"),
        )
        op.create_index("idx_incidencias_calificacion", "calificacion_incidencias", ["calificacion_id"])
        op.create_index("idx_incidencias_estado", "calificacion_incidencias", ["estado"])


def downgrade() -> None:
    # Repair migration: either table may have existed before this revision.
    pass
