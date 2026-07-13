"""Manual v1.1 gaps: modalidad en evaluaciones, CHECK constraints expandidos, salon_sesiones

Revision ID: 202606290004
Revises: 202606290003
Create Date: 2026-06-29 13:00:00.000000

Cambios:
  - evaluaciones: nueva columna `modalidad` (online/fisica/mixta)
  - entregas: ampliar CHECK tipo (+ opcion_multiple, interactiva, mixta)
  - entregas: ampliar CHECK estado (+ en_progreso, procesando)
  - calificaciones: ampliar CHECK estado (+ anulada)
  - nueva tabla salon_sesiones para persistir sesiones de Modo Salón
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202606290004"
down_revision = "202606290003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── evaluaciones.modalidad ─────────────────────────────────────────────────
    op.add_column(
        "evaluaciones",
        sa.Column("modalidad", sa.String(20), nullable=True),
    )
    op.execute(
        "ALTER TABLE evaluaciones ADD CONSTRAINT ck_evaluaciones_modalidad "
        "CHECK (modalidad IN ('online', 'fisica', 'mixta'))"
    )

    # ── entregas: ampliar tipo ─────────────────────────────────────────────────
    op.drop_constraint("ck_entregas_tipo", "entregas", type_="check")
    op.execute(
        "ALTER TABLE entregas ADD CONSTRAINT ck_entregas_tipo "
        "CHECK (tipo IN ('online','foto','pdf','captura','opcion_multiple','interactiva','mixta'))"
    )

    # ── entregas: ampliar estado ───────────────────────────────────────────────
    op.drop_constraint("ck_entregas_estado", "entregas", type_="check")
    op.execute(
        "ALTER TABLE entregas ADD CONSTRAINT ck_entregas_estado "
        "CHECK (estado IN ('pendiente','en_progreso','recibida','procesando','calificada','revisada','requiere_reintento'))"
    )

    # ── calificaciones: ampliar estado ────────────────────────────────────────
    op.drop_constraint("ck_calificaciones_estado", "calificaciones", type_="check")
    op.execute(
        "ALTER TABLE calificaciones ADD CONSTRAINT ck_calificaciones_estado "
        "CHECK (estado IN ('sugerida','confirmada','ajustada','requiere_revision','anulada'))"
    )

    # ── salon_sesiones ────────────────────────────────────────────────────────
    op.create_table(
        "salon_sesiones",
        sa.Column(
            "id",
            sa.String(32),
            primary_key=True,
            comment="hex UUID sin guiones",
        ),
        sa.Column(
            "evaluacion_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("evaluaciones.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "profesor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "estado",
            sa.String(20),
            nullable=False,
            server_default="activa",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_index("idx_salon_sesiones_evaluacion", "salon_sesiones", ["evaluacion_id"])
    op.create_index("idx_salon_sesiones_profesor", "salon_sesiones", ["profesor_id"])


def downgrade() -> None:
    # salon_sesiones
    op.drop_index("idx_salon_sesiones_profesor", table_name="salon_sesiones")
    op.drop_index("idx_salon_sesiones_evaluacion", table_name="salon_sesiones")
    op.drop_table("salon_sesiones")

    # calificaciones estado
    op.drop_constraint("ck_calificaciones_estado", "calificaciones", type_="check")
    op.execute(
        "ALTER TABLE calificaciones ADD CONSTRAINT ck_calificaciones_estado "
        "CHECK (estado IN ('sugerida','confirmada','ajustada','requiere_revision'))"
    )

    # entregas estado
    op.drop_constraint("ck_entregas_estado", "entregas", type_="check")
    op.execute(
        "ALTER TABLE entregas ADD CONSTRAINT ck_entregas_estado "
        "CHECK (estado IN ('pendiente','recibida','calificada','revisada','requiere_reintento'))"
    )

    # entregas tipo
    op.drop_constraint("ck_entregas_tipo", "entregas", type_="check")
    op.execute(
        "ALTER TABLE entregas ADD CONSTRAINT ck_entregas_tipo "
        "CHECK (tipo IN ('online','foto','pdf','captura'))"
    )

    # evaluaciones.modalidad
    op.drop_constraint("ck_evaluaciones_modalidad", "evaluaciones", type_="check")
    op.drop_column("evaluaciones", "modalidad")
