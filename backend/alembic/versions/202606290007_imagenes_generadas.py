"""Biblioteca de imágenes generadas por IA

Revision ID: 202606290007
Revises: 202606290006
Create Date: 2026-07-03 00:00:00.000000

Cambios:
  - nueva tabla `imagenes_generadas`: registro automático de toda imagen
    generada (prompt exacto, hashes, proveedor/modelo/calidad, costo,
    metadatos pedagógicos, estado success/failed/reused/archived).
  - NO modifica presentaciones ni archivos existentes.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202606290007"
down_revision = "202606290006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "imagenes_generadas",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("presentation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("slide_index", sa.Integer(), nullable=True),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("prompt_original", sa.Text(), nullable=False, server_default=""),
        sa.Column("prompt_normalizado", sa.Text(), nullable=True),
        sa.Column("prompt_usado", sa.Text(), nullable=False),
        sa.Column("restricciones", sa.Text(), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("tema", sa.String(length=200), nullable=True),
        sa.Column("area", sa.String(length=100), nullable=True),
        sa.Column("grado", sa.String(length=30), nullable=True),
        sa.Column("tipo_uso", sa.String(length=40), nullable=False, server_default="apoyo_visual"),
        sa.Column("modulo_origen", sa.String(length=40), nullable=False, server_default="otro"),
        sa.Column("proveedor", sa.String(length=30), nullable=False),
        sa.Column("modelo", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("calidad", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("size", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("costo_estimado", sa.Numeric(8, 4), nullable=True),
        sa.Column("file_path", sa.Text(), nullable=True),
        sa.Column("public_url", sa.Text(), nullable=True),
        sa.Column("prompt_hash", sa.String(length=64), nullable=False),
        sa.Column("file_hash", sa.String(length=64), nullable=True),
        sa.Column("estado", sa.String(length=20), nullable=False, server_default="success"),
        sa.Column("reusable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["presentation_id"], ["presentaciones.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"], ondelete="SET NULL"),
    )
    op.create_index("idx_imagenes_generadas_prompt_hash", "imagenes_generadas", ["prompt_hash"])
    op.create_index("idx_imagenes_generadas_user", "imagenes_generadas", ["user_id"])
    op.create_index("idx_imagenes_generadas_estado_reusable", "imagenes_generadas", ["estado", "reusable"])
    op.create_index("idx_imagenes_generadas_presentacion", "imagenes_generadas", ["presentation_id"])


def downgrade() -> None:
    op.drop_index("idx_imagenes_generadas_presentacion", table_name="imagenes_generadas")
    op.drop_index("idx_imagenes_generadas_estado_reusable", table_name="imagenes_generadas")
    op.drop_index("idx_imagenes_generadas_user", table_name="imagenes_generadas")
    op.drop_index("idx_imagenes_generadas_prompt_hash", table_name="imagenes_generadas")
    op.drop_table("imagenes_generadas")
