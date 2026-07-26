"""Modo Salón: estado por estudiante (salon_sesion_estudiantes)

Manual §11.2 define estados por estudiante: pendiente, fotografiado, calificado, confirmado, omitido.
Esta migración crea la tabla salon_sesion_estudiantes para rastrear el estado individual
de cada estudiante dentro de una sesión de Modo Salón.
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "202607221921"
down_revision: Union[str, None] = "202607221920"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "salon_sesion_estudiantes",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("sesion_id", sa.String(32), sa.ForeignKey("salon_sesiones.id", ondelete="CASCADE"), nullable=False),
        sa.Column("estudiante_id", sa.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"),
        sa.Column("error_msg", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint("sesion_id", "estudiante_id", name="uq_salon_sesion_estudiante"),
    )
    op.create_index("idx_sse_sesion", "salon_sesion_estudiantes", ["sesion_id"])
    op.create_index("idx_sse_estudiante", "salon_sesion_estudiantes", ["estudiante_id"])

    op.create_check_constraint(
        "ck_sse_estado",
        "salon_sesion_estudiantes",
        "estado IN ('pendiente','fotografiado','calificado','confirmado','omitido','error')",
    )


def downgrade() -> None:
    op.drop_table("salon_sesion_estudiantes")
