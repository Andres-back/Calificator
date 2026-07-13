"""Fase B: DBA personalizados por profesor y materia

Revision ID: 202606290005
Revises: 202606290004
Create Date: 2026-07-01 00:00:00.000000

Cambios:
  - nueva tabla `dba_personalizados` (DBA/criterios curriculares por materia).
  - NO modifica `dba_catalog` (DBA oficiales del MEN permanecen intactos).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202606290005"
down_revision = "202606290004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dba_personalizados",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("area", sa.String(length=100), nullable=False),
        sa.Column("grado", sa.String(length=30), nullable=False),
        sa.Column("enunciado", sa.Text(), nullable=False),
        sa.Column("evidencias_aprendizaje", sa.Text(), nullable=True),
        sa.Column("ejemplo", sa.Text(), nullable=True),
        sa.Column("fuente", sa.String(length=30), nullable=False, server_default="personalizado"),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"]),
    )
    op.create_index(
        "idx_dba_personalizado_materia", "dba_personalizados", ["materia_id", "activo"]
    )
    op.create_index(
        "idx_dba_personalizado_profesor", "dba_personalizados", ["profesor_id"]
    )


def downgrade() -> None:
    op.drop_index("idx_dba_personalizado_profesor", table_name="dba_personalizados")
    op.drop_index("idx_dba_personalizado_materia", table_name="dba_personalizados")
    op.drop_table("dba_personalizados")
