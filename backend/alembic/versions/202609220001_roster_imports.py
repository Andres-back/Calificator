"""Add reviewed roster imports and initial password state.

Revision ID: 202609220001
Revises: 202609200002
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202609220001"
down_revision: Union[str, None] = "202609200002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email_es_interno", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("users", sa.Column("debe_cambiar_password", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.create_table(
        "importacion_estudiantes_lotes",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("creado_por", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("archivo_key", sa.Text(), nullable=True),
        sa.Column("archivo_nombre", sa.String(255), nullable=False),
        sa.Column("archivo_sha256", sa.String(64), nullable=False),
        sa.Column("estado", sa.String(30), server_default="procesando", nullable=False),
        sa.Column("resultado_json", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("confirmado_at", sa.DateTime(), nullable=True),
        sa.Column("credenciales_entregadas_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("estado IN ('procesando','revision','confirmado','cancelado','error')", name="ck_importacion_estudiantes_lotes_estado"),
        sa.ForeignKeyConstraint(["creado_por"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["job_id"], ["ai_jobs.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_importacion_estudiantes_lotes_materia", "importacion_estudiantes_lotes", ["materia_id", "created_at"])
    op.create_table(
        "importacion_estudiantes_filas",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("lote_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False),
        sa.Column("nombre_detectado", sa.String(160), nullable=False),
        sa.Column("nombre_revisado", sa.String(160), nullable=False),
        sa.Column("confianza", sa.Float(), nullable=False),
        sa.Column("requiere_revision", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("duplicado_confirmado", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("decision", sa.String(30), server_default="crear", nullable=False),
        sa.Column("estudiante_existente_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("advertencias", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("decision IN ('crear','omitir','asociar')", name="ck_importacion_estudiantes_filas_decision"),
        sa.ForeignKeyConstraint(["estudiante_existente_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["lote_id"], ["importacion_estudiantes_lotes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lote_id", "orden", name="uq_importacion_estudiantes_filas_orden"),
    )
    op.execute("""
        INSERT INTO ai_feature_routing
            (feature, label, capability, primary_provider, primary_model,
             fallback_provider, fallback_model, rollout_enabled, config_version, active)
        VALUES
            ('importacion_estudiantes.extraccion', 'Lectura visual de lista escolar', 'vision',
             'open_code', 'deepseek-v4-flash-vision-exp', NULL, NULL, false, 1, true)
        ON CONFLICT (feature) DO NOTHING
    """)


def downgrade() -> None:
    op.execute("DELETE FROM ai_feature_routing WHERE feature='importacion_estudiantes.extraccion'")
    op.drop_table("importacion_estudiantes_filas")
    op.drop_index("ix_importacion_estudiantes_lotes_materia", table_name="importacion_estudiantes_lotes")
    op.drop_table("importacion_estudiantes_lotes")
    op.drop_column("users", "debe_cambiar_password")
    op.drop_column("users", "email_es_interno")
