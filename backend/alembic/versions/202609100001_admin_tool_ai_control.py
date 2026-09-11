"""Add administrative tool availability and stage-aware AI routes.

Revision ID: 202609100001
Revises: 202609090002
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "202609100001"
down_revision: Union[str, None] = "202609090002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_TOOLS = (
    "crucigrama", "sopa_letras", "unir_columnas", "cuento", "para_colorear",
    "guia", "taller", "examen", "rubrica", "ficha", "quiz_rapido",
    "lectura_comprensiva", "mapa_conceptual", "flashcards", "plan_refuerzo",
)

_STAGE_ROUTES = (
    ("calificacion.extraccion", "Extracción visual de calificación", "calificacion_foto", "vision"),
    ("calificacion.valoracion", "Valoración principal", "calificacion_texto", "text"),
    ("calificacion.verificacion", "Verificación de calificación", "calificacion_texto", "text"),
    ("calificacion.revision_adicional", "Revisión adicional", "calificacion_texto", "text"),
    ("digitalizacion.extraccion", "Extracción de digitalización", "evaluacion_digitalizar", "vision"),
    ("digitalizacion.estructura", "Estructuración de digitalización", "generacion_preguntas", "text"),
    ("presentaciones.contenido", "Contenido de presentación", "presentaciones", "text"),
    ("presentaciones.imagenes", "Imágenes de presentación", "generacion_imagenes", "image"),
)


def upgrade() -> None:
    op.create_table(
        "ai_tool_settings",
        sa.Column("tool_id", sa.String(60), primary_key=True),
        sa.Column("generation_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("pause_reason", sa.String(300), nullable=True),
        sa.Column("config_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "generation_enabled OR (pause_reason IS NOT NULL AND length(trim(pause_reason)) > 0)",
            name="ck_ai_tool_pause_reason",
        ),
    )
    for tool_id in _TOOLS:
        op.execute(
            sa.text("INSERT INTO ai_tool_settings (tool_id) VALUES (:tool_id) ON CONFLICT DO NOTHING").bindparams(tool_id=tool_id)
        )
    for feature, label, parent, capability in _STAGE_ROUTES:
        op.execute(sa.text("""
            INSERT INTO ai_feature_routing
                (feature, label, capability, primary_provider, primary_model,
                 fallback_provider, fallback_model, rollout_enabled, config_version, active)
            SELECT :feature, :label, :capability, primary_provider, primary_model,
                   fallback_provider, fallback_model, rollout_enabled, config_version, active
            FROM ai_feature_routing WHERE feature=:parent
            ON CONFLICT (feature) DO NOTHING
        """).bindparams(feature=feature, label=label, capability=capability, parent=parent))
    op.create_index("idx_ai_usage_feature_stage_created", "ai_usage_events", ["feature", "stage", "created_at"])


def downgrade() -> None:
    op.drop_index("idx_ai_usage_feature_stage_created", table_name="ai_usage_events")
    for feature, _label, _parent, _capability in _STAGE_ROUTES:
        op.execute(sa.text("DELETE FROM ai_feature_routing WHERE feature=:feature").bindparams(feature=feature))
    op.drop_table("ai_tool_settings")
