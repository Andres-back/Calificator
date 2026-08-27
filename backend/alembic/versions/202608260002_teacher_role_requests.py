"""Add teacher role request state to users.

Revision ID: 202608260002
Revises: 202608260001
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202608260002"
down_revision: Union[str, None] = "202608260001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("solicitud_docente_estado", sa.String(20), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column("solicitud_docente_solicitada_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("solicitud_docente_resuelta_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "solicitud_docente_revisada_por",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.add_column(
        "users", sa.Column("solicitud_docente_motivo", sa.String(500), nullable=True)
    )
    op.create_check_constraint(
        "ck_users_solicitud_docente_estado",
        "users",
        "solicitud_docente_estado IS NULL OR solicitud_docente_estado IN ('pendiente', 'aprobada', 'rechazada')",
    )
    op.create_foreign_key(
        "fk_users_solicitud_docente_revisada_por",
        "users",
        "users",
        ["solicitud_docente_revisada_por"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_users_solicitud_docente_estado", "users", ["solicitud_docente_estado"]
    )


def downgrade() -> None:
    op.drop_index("ix_users_solicitud_docente_estado", table_name="users")
    op.drop_constraint(
        "fk_users_solicitud_docente_revisada_por", "users", type_="foreignkey"
    )
    op.drop_constraint("ck_users_solicitud_docente_estado", "users", type_="check")
    op.drop_column("users", "solicitud_docente_motivo")
    op.drop_column("users", "solicitud_docente_revisada_por")
    op.drop_column("users", "solicitud_docente_resuelta_at")
    op.drop_column("users", "solicitud_docente_solicitada_at")
    op.drop_column("users", "solicitud_docente_estado")
