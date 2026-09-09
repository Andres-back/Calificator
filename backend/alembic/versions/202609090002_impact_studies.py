"""Add isolated, authorized thesis study datasets.

Revision ID: 202609090002
Revises: 202609090001
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202609090002"
down_revision: Union[str, None] = "202609090001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "impacto_studies",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_admin_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("previous_study_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("nombre", sa.String(180), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("synthetic_only", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("protocol_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("participants_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("access_grants_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("import_batches_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("authorization_reference", sa.String(500), nullable=True),
        sa.Column("retention_policy_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("retention_audit_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint("estado IN ('draft','active','closed')", name="ck_impact_study_state"),
        sa.CheckConstraint("version >= 1", name="ck_impact_study_version"),
        sa.ForeignKeyConstraint(["owner_admin_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["previous_study_id"], ["impacto_studies.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_impact_studies_owner", "impacto_studies", ["owner_admin_id"])
    op.create_index("idx_impact_studies_state", "impacto_studies", ["estado"])
    op.create_table(
        "impacto_observations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("study_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("import_batch_id", sa.String(100), nullable=False),
        sa.Column("external_id", sa.String(120), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("supersedes_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("teacher_pseudonym", sa.String(80), nullable=False),
        sa.Column("work_key", sa.String(120), nullable=False),
        sa.Column("response_key", sa.String(120), nullable=True),
        sa.Column("evaluation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("grade_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("condition", sa.String(20), nullable=False),
        sa.Column("observed_at", sa.DateTime(), nullable=False),
        sa.Column("payload_json", postgresql.JSONB(), nullable=False),
        sa.Column("missing_reason", sa.String(300), nullable=True),
        sa.Column("exclusion_reason", sa.String(300), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("revision >= 1", name="ck_impact_observation_revision"),
        sa.CheckConstraint("condition IN ('manual','asistida')", name="ck_impact_observation_condition"),
        sa.ForeignKeyConstraint(["study_id"], ["impacto_studies.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["supersedes_id"], ["impacto_observations.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["evaluation_id"], ["evaluaciones.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["grade_id"], ["calificaciones.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("study_id", "external_id", "revision", name="uq_impact_observation_revision"),
    )
    op.create_index("idx_impact_observations_study", "impacto_observations", ["study_id", "created_at"])
    op.create_index("idx_impact_observations_teacher", "impacto_observations", ["study_id", "teacher_pseudonym"])
    op.create_index("idx_impact_observations_work", "impacto_observations", ["study_id", "work_key"])


def downgrade() -> None:
    op.drop_index("idx_impact_observations_work", table_name="impacto_observations")
    op.drop_index("idx_impact_observations_teacher", table_name="impacto_observations")
    op.drop_index("idx_impact_observations_study", table_name="impacto_observations")
    op.drop_table("impacto_observations")
    op.drop_index("idx_impact_studies_state", table_name="impacto_studies")
    op.drop_index("idx_impact_studies_owner", table_name="impacto_studies")
    op.drop_table("impacto_studies")
