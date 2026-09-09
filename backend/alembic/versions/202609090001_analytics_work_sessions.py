"""Add opt-in teacher work sessions without backfilling historical time.

Revision ID: 202609090001
Revises: 202609030001
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202609090001"
down_revision: Union[str, None] = "202609030001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "analytics_work_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("condicion", sa.String(20), nullable=False),
        sa.Column("fase", sa.String(30), nullable=False),
        sa.Column("evaluacion_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("calificacion_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("batch_job_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("study_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("estado", sa.String(20), nullable=False, server_default="active"),
        sa.Column("owner_token_hash", sa.String(64), nullable=False),
        sa.Column("intervals_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("duracion_confirmada_ms", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("incertidumbre_ms", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("origen", sa.String(20), nullable=False, server_default="observado"),
        sa.Column("motivo_ajuste", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint("condicion IN ('manual','asistida')", name="ck_work_sessions_condition"),
        sa.CheckConstraint("fase IN ('preparacion','revision','correccion','finalizacion')", name="ck_work_sessions_phase"),
        sa.CheckConstraint("estado IN ('active','paused','completed','incomplete')", name="ck_work_sessions_state"),
        sa.CheckConstraint("origen IN ('observado','importado','ajustado')", name="ck_work_sessions_origin"),
        sa.CheckConstraint("duracion_confirmada_ms >= 0 AND incertidumbre_ms >= 0", name="ck_work_sessions_durations"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["evaluacion_id"], ["evaluaciones.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["calificacion_id"], ["calificaciones.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["batch_job_id"], ["ai_jobs.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_work_sessions_actor_started", "analytics_work_sessions", ["actor_id", "started_at"])
    op.create_index("idx_work_sessions_evaluation", "analytics_work_sessions", ["evaluacion_id"])
    op.create_index("idx_work_sessions_study", "analytics_work_sessions", ["study_id"])
    op.create_index(
        "uq_work_sessions_actor_open",
        "analytics_work_sessions",
        ["actor_id"],
        unique=True,
        postgresql_where=sa.text("estado IN ('active','paused')"),
    )


def downgrade() -> None:
    op.drop_index("uq_work_sessions_actor_open", table_name="analytics_work_sessions")
    op.drop_index("idx_work_sessions_study", table_name="analytics_work_sessions")
    op.drop_index("idx_work_sessions_evaluation", table_name="analytics_work_sessions")
    op.drop_index("idx_work_sessions_actor_started", table_name="analytics_work_sessions")
    op.drop_table("analytics_work_sessions")
