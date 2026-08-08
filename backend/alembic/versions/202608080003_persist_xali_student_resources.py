"""Persist Xali resources by student and evaluation.

Revision ID: 202608080003
Revises: 202608080002
Create Date: 2026-08-08
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "202608080003"
down_revision: Union[str, None] = "202608080002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "xali_student_resources",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("estudiante_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("evaluacion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tipo", sa.String(length=30), nullable=False),
        sa.Column("titulo", sa.String(length=180), nullable=False),
        sa.Column("contenido", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["estudiante_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["evaluacion_id"], ["evaluaciones.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "estudiante_id",
            "evaluacion_id",
            "tipo",
            name="uq_xali_student_resource_evaluation_type",
        ),
    )
    op.create_index(
        "idx_xali_student_resources_evaluation",
        "xali_student_resources",
        ["estudiante_id", "evaluacion_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_xali_student_resources_evaluation", table_name="xali_student_resources")
    op.drop_table("xali_student_resources")
