"""Add processing grades and durable AI job leases.

Revision ID: 202609030001
Revises: 202608300002
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202609030001"
down_revision: Union[str, None] = "202608300002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_calificaciones_estado", "calificaciones", type_="check")
    op.create_check_constraint(
        "ck_calificaciones_estado",
        "calificaciones",
        "estado IN ('procesando','sugerida','confirmada','ajustada','requiere_revision','publicada','anulada')",
    )

    op.add_column("ai_jobs", sa.Column("parent_job_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("ai_jobs", sa.Column("entrega_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("ai_jobs", sa.Column("stage", sa.String(50), nullable=True))
    op.add_column("ai_jobs", sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("ai_jobs", sa.Column("claim_token", sa.String(100), nullable=True))
    op.add_column("ai_jobs", sa.Column("heartbeat_at", sa.DateTime(), nullable=True))
    op.add_column("ai_jobs", sa.Column("lease_expires_at", sa.DateTime(), nullable=True))
    op.create_foreign_key(
        "fk_ai_jobs_parent_job_id", "ai_jobs", "ai_jobs", ["parent_job_id"], ["id"], ondelete="CASCADE"
    )
    op.create_foreign_key(
        "fk_ai_jobs_entrega_id", "ai_jobs", "entregas", ["entrega_id"], ["id"], ondelete="SET NULL"
    )
    op.create_index("idx_ai_jobs_parent_estado", "ai_jobs", ["parent_job_id", "estado"])
    op.create_index("idx_ai_jobs_tipo_estado_created", "ai_jobs", ["tipo", "estado", "created_at"])
    op.create_index("idx_ai_jobs_estado_lease", "ai_jobs", ["estado", "lease_expires_at"])
    op.create_index(
        "uq_ai_jobs_entrega_activa",
        "ai_jobs",
        ["entrega_id"],
        unique=True,
        postgresql_where=sa.text("entrega_id IS NOT NULL AND estado IN ('queued','running','retrying')"),
    )


def downgrade() -> None:
    op.execute("UPDATE calificaciones SET estado='requiere_revision' WHERE estado='procesando'")
    op.drop_constraint("ck_calificaciones_estado", "calificaciones", type_="check")
    op.create_check_constraint(
        "ck_calificaciones_estado",
        "calificaciones",
        "estado IN ('sugerida','confirmada','ajustada','requiere_revision','publicada','anulada')",
    )

    op.drop_index("uq_ai_jobs_entrega_activa", table_name="ai_jobs")
    op.drop_index("idx_ai_jobs_estado_lease", table_name="ai_jobs")
    op.drop_index("idx_ai_jobs_tipo_estado_created", table_name="ai_jobs")
    op.drop_index("idx_ai_jobs_parent_estado", table_name="ai_jobs")
    op.drop_constraint("fk_ai_jobs_entrega_id", "ai_jobs", type_="foreignkey")
    op.drop_constraint("fk_ai_jobs_parent_job_id", "ai_jobs", type_="foreignkey")
    op.drop_column("ai_jobs", "lease_expires_at")
    op.drop_column("ai_jobs", "heartbeat_at")
    op.drop_column("ai_jobs", "claim_token")
    op.drop_column("ai_jobs", "attempt_count")
    op.drop_column("ai_jobs", "stage")
    op.drop_column("ai_jobs", "entrega_id")
    op.drop_column("ai_jobs", "parent_job_id")
