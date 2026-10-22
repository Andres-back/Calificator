"""Historial de reaperturas sin reescribir notas o evidencias existentes."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "202610220001"
down_revision = "202610200001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "calificacion_revisiones",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "calificacion_id",
            UUID(as_uuid=True),
            sa.ForeignKey("calificaciones.id"),
            nullable=False,
        ),
        sa.Column(
            "actor_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("accion", sa.String(32), nullable=False),
        sa.Column("motivo", sa.String(1000)),
        sa.Column("request_fingerprint", sa.String(64), nullable=False),
        sa.Column("archivo_url", sa.Text()),
        sa.Column("snapshot_json", JSONB(), nullable=False),
        sa.CheckConstraint(
            "accion IN ('recalificar','cambiar_evidencia')",
            name="ck_calificacion_revision_accion",
        ),
    )
    op.create_index(
        "ix_calificacion_revision_grade",
        "calificacion_revisiones",
        ["calificacion_id", "created_at"],
    )
    op.create_index(
        "ix_calificacion_revision_archivo", "calificacion_revisiones", ["archivo_url"]
    )


def downgrade():
    if op.get_bind().scalar(
        sa.text("SELECT EXISTS(SELECT 1 FROM calificacion_revisiones)")
    ):
        raise RuntimeError(
            "Hay historial de calificaciones: expórtalo y planifica su conservación antes de retirar esta migración."
        )
    op.drop_table("calificacion_revisiones")
