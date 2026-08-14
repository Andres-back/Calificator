"""Persist Xali reinforcement resources.

Revision ID: 202608130001
Revises: 202608120001
Create Date: 2026-08-13
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "202608130001"
down_revision: Union[str, None] = "202608120001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "xali_refuerzos",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("uuid_generate_v4()"),
            nullable=False,
        ),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tipo", sa.String(length=30), nullable=False),
        sa.Column("estado", sa.String(length=20), server_default="borrador", nullable=False),
        sa.Column("criterio_nombre", sa.String(length=220), nullable=True),
        sa.Column(
            "contexto_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "contenido_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("prompt_usado", sa.Text(), nullable=True),
        sa.Column("modelo", sa.String(length=60), nullable=True),
        sa.Column("material_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "tipo IN ('actividad','explicacion','ejercicio','plan_clase')",
            name="ck_refuerzos_tipo",
        ),
        sa.CheckConstraint(
            "estado IN ('borrador','aprobado','guardado','descartado')",
            name="ck_refuerzos_estado",
        ),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_xali_refuerzos_profesor", "xali_refuerzos", ["profesor_id"])
    op.create_index("idx_xali_refuerzos_materia", "xali_refuerzos", ["materia_id"])
    op.create_index("idx_xali_refuerzos_created", "xali_refuerzos", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_xali_refuerzos_created", table_name="xali_refuerzos")
    op.drop_index("idx_xali_refuerzos_materia", table_name="xali_refuerzos")
    op.drop_index("idx_xali_refuerzos_profesor", table_name="xali_refuerzos")
    op.drop_table("xali_refuerzos")
