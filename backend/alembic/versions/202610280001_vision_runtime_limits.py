"""Optional per-stage reading controls, without academic backfill."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202610280001"
down_revision = "202610260001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "ai_feature_routing",
        sa.Column("runtime_limits", postgresql.JSONB(), nullable=True),
    )
    op.create_check_constraint(
        "ck_ai_feature_runtime_limits",
        "ai_feature_routing",
        "runtime_limits IS NULL OR (feature='calificacion.extraccion' AND jsonb_typeof(runtime_limits)='object')",
    )


def downgrade():
    used = (
        op.get_bind()
        .execute(
            sa.text("""
        SELECT EXISTS(SELECT 1 FROM ai_feature_routing WHERE runtime_limits IS NOT NULL)
        OR EXISTS(SELECT 1 FROM ai_configuration_versions v,
          LATERAL jsonb_array_elements(COALESCE(v.snapshot->'features','[]'::jsonb)) f
          WHERE f->'runtime_limits' IS NOT NULL AND f->'runtime_limits'<>'null'::jsonb)
        OR EXISTS(SELECT 1 FROM ai_jobs WHERE
          input_json#>'{_ai_config,stages,extraction,runtime_limits}' IS NOT NULL)
    """)
        )
        .scalar()
    )
    if used:
        raise RuntimeError(
            "Los controles ya se utilizaron. Conserva la columna y revierte mediante configuración versionada."
        )
    op.drop_constraint(
        "ck_ai_feature_runtime_limits", "ai_feature_routing", type_="check"
    )
    op.drop_column("ai_feature_routing", "runtime_limits")
