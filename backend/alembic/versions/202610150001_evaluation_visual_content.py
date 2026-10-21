"""Add private evaluation resources and immutable content revisions without backfill.

Revision ID: 202610150001
Revises: 202609240001
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202610150001"
down_revision = "202609240001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    uuid = postgresql.UUID(as_uuid=True)
    op.create_table(
        "evaluacion_recursos",
        sa.Column("id", uuid, primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("propietario_id", uuid, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("materia_id", uuid, sa.ForeignKey("materias.id"), nullable=False),
        sa.Column("evaluacion_id", uuid, sa.ForeignKey("evaluaciones.id"), nullable=True),
        sa.Column("borrador_id", uuid, nullable=True),
        sa.Column("job_id", uuid, nullable=True),
        sa.Column("request_key", uuid, nullable=False),
        sa.Column("clase", sa.String(30), nullable=False),
        sa.Column("origen", sa.String(20), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("mime", sa.String(100), nullable=False),
        sa.Column("bytes_size", sa.Integer(), nullable=False),
        sa.Column("ancho", sa.Integer(), nullable=True),
        sa.Column("alto", sa.Integer(), nullable=True),
        sa.Column("paginas", sa.Integer(), nullable=True),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("seguridad_contenido", sa.String(30), nullable=False),
        sa.Column("procedencia_json", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("propietario_id", "request_key", name="uq_evaluacion_recursos_request"),
        sa.UniqueConstraint("storage_key", name="uq_evaluacion_recursos_storage"),
        sa.CheckConstraint("evaluacion_id IS NOT NULL OR borrador_id IS NOT NULL", name="ck_evaluacion_recursos_scope"),
        sa.CheckConstraint("estado IN ('staged','ready','failed','retired')", name="ck_evaluacion_recursos_estado"),
        sa.CheckConstraint("origen IN ('importado','subido','ia')", name="ck_evaluacion_recursos_origen"),
        sa.CheckConstraint("clase IN ('original','pagina','imagen','dibujo','render_tabla','render_grafica','formula')", name="ck_evaluacion_recursos_clase"),
        sa.CheckConstraint("seguridad_contenido IN ('privado_original','pendiente_revision','publicable_confirmado')", name="ck_evaluacion_recursos_seguridad"),
        sa.CheckConstraint("clase != 'original' OR seguridad_contenido = 'privado_original'", name="ck_evaluacion_recursos_original_privado"),
        sa.CheckConstraint("bytes_size > 0 AND length(sha256) = 64", name="ck_evaluacion_recursos_integridad"),
        sa.CheckConstraint("(ancho IS NULL OR ancho > 0) AND (alto IS NULL OR alto > 0) AND (paginas IS NULL OR paginas > 0)", name="ck_evaluacion_recursos_dimensiones"),
    )
    op.create_index("idx_evaluacion_recursos_scope", "evaluacion_recursos", ["evaluacion_id", "materia_id"])
    op.create_index("idx_evaluacion_recursos_cleanup", "evaluacion_recursos", ["estado", "created_at"])
    op.create_table(
        "evaluacion_contenido_versiones",
        sa.Column("id", uuid, primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("evaluacion_id", uuid, sa.ForeignKey("evaluaciones.id"), nullable=False),
        sa.Column("numero_version", sa.Integer(), nullable=False),
        sa.Column("autor_id", uuid, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("previous_version_id", uuid, sa.ForeignKey("evaluacion_contenido_versiones.id"), nullable=True),
        sa.Column("source_resource_id", uuid, sa.ForeignKey("evaluacion_recursos.id"), nullable=True),
        sa.Column("motivo", sa.String(500), nullable=False),
        sa.Column("origen", sa.String(40), nullable=False),
        sa.Column("snapshot_json", postgresql.JSONB(), nullable=False),
        sa.Column("coverage_json", postgresql.JSONB(), nullable=False),
        sa.Column("recurso_ids", postgresql.JSONB(), nullable=False),
        sa.Column("legacy_baseline", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("evaluacion_id", "numero_version", name="uq_evaluacion_contenido_numero"),
        sa.CheckConstraint("numero_version > 0 AND schema_version = 1", name="ck_evaluacion_contenido_version"),
        sa.CheckConstraint("length(content_hash) = 64", name="ck_evaluacion_contenido_hash"),
    )
    op.create_index("idx_evaluacion_contenido_evaluacion", "evaluacion_contenido_versiones", ["evaluacion_id"])
    for table in ("evaluaciones", "entregas"):
        op.add_column(table, sa.Column("contenido_version_id", uuid, nullable=True))
        op.create_foreign_key(f"fk_{table}_contenido_version", table, "evaluacion_contenido_versiones", ["contenido_version_id"], ["id"])
    op.execute("""
        CREATE FUNCTION reject_evaluation_content_update() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            RAISE EXCEPTION 'Las revisiones de contenido son inmutables';
        END $$
    """)
    op.execute("""
        CREATE TRIGGER evaluation_content_immutable BEFORE UPDATE
        ON evaluacion_contenido_versiones FOR EACH ROW
        EXECUTE FUNCTION reject_evaluation_content_update()
    """)


def downgrade() -> None:
    raise RuntimeError("Deshabilite la escritura visual; debe conservar las revisiones y los recursos guardados.")
