"""Add versioned explainable grading breakdowns.

Revision ID: 202608210001
Revises: 202608140002
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202608210001"
down_revision: Union[str, None] = "202608140002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "calificacion_desgloses",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("calificacion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("pipeline_run_id", sa.String(80), nullable=True),
        sa.Column("origen", sa.String(20), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.Column("cobertura_estado", sa.String(20), nullable=False),
        sa.Column("puntos_obtenidos", sa.Numeric(12, 4), nullable=False),
        sa.Column("puntos_posibles", sa.Numeric(12, 4), nullable=False),
        sa.Column("nota_maxima", sa.Numeric(6, 2), nullable=False),
        sa.Column("nota_base", sa.Numeric(8, 4), nullable=False),
        sa.Column("ajuste_global", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("nota_antes_redondeo", sa.Numeric(8, 4), nullable=False),
        sa.Column("regla_redondeo", sa.String(20), nullable=False, server_default="half_up"),
        sa.Column("decimales", sa.SmallInteger(), nullable=False, server_default="2"),
        sa.Column("nota_final", sa.Numeric(6, 2), nullable=False),
        sa.Column("requiere_revision", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("bloqueos_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("procedencia_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("creado_por", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("version >= 1", name="ck_desglose_version"),
        sa.CheckConstraint("puntos_posibles > 0", name="ck_desglose_puntos_posibles"),
        sa.CheckConstraint("nota_maxima > 0", name="ck_desglose_nota_maxima"),
        sa.CheckConstraint("decimales BETWEEN 0 AND 4", name="ck_desglose_decimales"),
        sa.CheckConstraint("cobertura_estado IN ('completa','incompleta','inconsistente')", name="ck_desglose_cobertura"),
        sa.CheckConstraint("origen IN ('automatico','docente','manual')", name="ck_desglose_origen"),
        sa.ForeignKeyConstraint(["calificacion_id"], ["calificaciones.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["creado_por"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("calificacion_id", "version", name="uq_desglose_calificacion_version"),
    )
    op.create_index("idx_desglose_calificacion", "calificacion_desgloses", ["calificacion_id"])
    op.create_index("uq_desglose_activo", "calificacion_desgloses", ["calificacion_id"], unique=True, postgresql_where=sa.text("activo IS TRUE"))
    op.create_index("uq_desglose_pipeline_run", "calificacion_desgloses", ["calificacion_id", "pipeline_run_id"], unique=True, postgresql_where=sa.text("pipeline_run_id IS NOT NULL"))

    op.create_table(
        "calificacion_componentes",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("desglose_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("clave", sa.String(160), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("numero", sa.String(80), nullable=True),
        sa.Column("titulo", sa.Text(), nullable=False),
        sa.Column("respuesta_estudiante", sa.Text(), nullable=True),
        sa.Column("respuesta_referencia", sa.Text(), nullable=True),
        sa.Column("puntos_obtenidos", sa.Numeric(12, 4), nullable=True),
        sa.Column("puntos_maximos", sa.Numeric(12, 4), nullable=False),
        sa.Column("estado", sa.String(30), nullable=False),
        sa.Column("explicacion_verificable", sa.Text(), nullable=False),
        sa.Column("explicacion_estudiante", sa.Text(), nullable=True),
        sa.Column("origen", sa.String(30), nullable=False),
        sa.Column("requiere_revision", sa.Boolean(), nullable=False),
        sa.Column("evidencia_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("valoraciones_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("orden >= 0", name="ck_componente_orden"),
        sa.CheckConstraint("puntos_maximos > 0", name="ck_componente_maximo"),
        sa.CheckConstraint("puntos_obtenidos IS NULL OR (puntos_obtenidos >= 0 AND puntos_obtenidos <= puntos_maximos)", name="ck_componente_puntos"),
        sa.CheckConstraint("tipo IN ('pregunta','rubrica','manual')", name="ck_componente_tipo"),
        sa.CheckConstraint("estado IN ('correcta','parcial','incorrecta','sin_respuesta','ilegible','no_evaluable','revision_pendiente')", name="ck_componente_estado"),
        sa.ForeignKeyConstraint(["desglose_id"], ["calificacion_desgloses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("desglose_id", "clave", name="uq_componente_desglose_clave"),
    )
    op.create_index("idx_componente_desglose_orden", "calificacion_componentes", ["desglose_id", "orden"])

    op.create_table(
        "calificacion_ajustes",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column("calificacion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("desglose_anterior_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("desglose_nuevo_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("componente_clave", sa.String(160), nullable=True),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("valor_anterior_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("valor_nuevo_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("motivo_interno", sa.Text(), nullable=False),
        sa.Column("explicacion_estudiante", sa.Text(), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("tipo IN ('componente','global','explicacion','resolucion')", name="ck_ajuste_tipo"),
        sa.ForeignKeyConstraint(["calificacion_id"], ["calificaciones.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["desglose_anterior_id"], ["calificacion_desgloses.id"]),
        sa.ForeignKeyConstraint(["desglose_nuevo_id"], ["calificacion_desgloses.id"]),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_ajuste_calificacion", "calificacion_ajustes", ["calificacion_id", "created_at"])
    op.add_column("calificacion_incidencias", sa.Column("componente_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("calificacion_incidencias", sa.Column("desglose_version", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_incidencia_componente", "calificacion_incidencias", "calificacion_componentes", ["componente_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_incidencia_componente", "calificacion_incidencias", type_="foreignkey")
    op.drop_column("calificacion_incidencias", "desglose_version")
    op.drop_column("calificacion_incidencias", "componente_id")
    op.drop_index("idx_ajuste_calificacion", table_name="calificacion_ajustes")
    op.drop_table("calificacion_ajustes")
    op.drop_index("idx_componente_desglose_orden", table_name="calificacion_componentes")
    op.drop_table("calificacion_componentes")
    op.drop_index("uq_desglose_pipeline_run", table_name="calificacion_desgloses")
    op.drop_index("uq_desglose_activo", table_name="calificacion_desgloses")
    op.drop_index("idx_desglose_calificacion", table_name="calificacion_desgloses")
    op.drop_table("calificacion_desgloses")
