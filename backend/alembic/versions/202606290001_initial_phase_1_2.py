"""Initial schema for XCalificator phases 1 and 2.

Revision ID: 202606290001
Revises:
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202606290001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("nombre", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=180), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("rol", sa.String(length=30), nullable=False),
        sa.Column("estado", sa.String(length=30), nullable=False, server_default="activo"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("rol IN ('admin', 'profesor', 'estudiante')", name="ck_users_rol"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "materias",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(length=180), nullable=False),
        sa.Column("area", sa.String(length=100), nullable=True),
        sa.Column("grado", sa.String(length=30), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("codigo_matricula", sa.String(length=30), nullable=False),
        sa.Column("codigo_activo", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("requiere_aprobacion", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("estado", sa.String(length=30), nullable=False, server_default="activa"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"]),
        sa.UniqueConstraint("codigo_matricula", name="uq_materias_codigo_matricula"),
    )
    op.create_index("idx_materias_profesor", "materias", ["profesor_id"])
    op.create_index("idx_materias_codigo", "materias", ["codigo_matricula"])

    op.create_table(
        "matriculas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("estado", sa.String(length=30), nullable=False, server_default="activo"),
        sa.Column("fecha_matricula", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "estado IN ('pendiente', 'activo', 'retirado', 'rechazado')",
            name="ck_matriculas_estado",
        ),
        sa.UniqueConstraint("materia_id", "student_id", name="uq_matriculas_materia_student"),
    )
    op.create_index("idx_matriculas_materia", "matriculas", ["materia_id"])
    op.create_index("idx_matriculas_student", "matriculas", ["student_id"])

    op.create_table(
        "dba_catalog",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("area", sa.String(length=100), nullable=False),
        sa.Column("grado", sa.String(length=30), nullable=False),
        sa.Column("codigo", sa.String(length=80), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("fuente", sa.Text(), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_dba_area_grado", "dba_catalog", ["area", "grado"])

    op.create_table(
        "evaluaciones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(length=220), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("tipo_origen", sa.String(length=40), nullable=False),
        sa.Column("nota_maxima", sa.Numeric(6, 2), nullable=False, server_default="5.0"),
        sa.Column("estado", sa.String(length=40), nullable=False, server_default="borrador"),
        sa.Column("fecha_publicacion", sa.DateTime(), nullable=True),
        sa.Column("dba_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("metas_profesor", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("criterios", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("preguntas", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("respuestas_esperadas", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"]),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"]),
        sa.CheckConstraint(
            "tipo_origen IN ('nativa', 'externa_digitalizada', 'sorpresa')",
            name="ck_evaluaciones_tipo_origen",
        ),
        sa.CheckConstraint(
            "estado IN ('borrador', 'publicada', 'en_calificacion', 'pendiente_revision', 'cerrada')",
            name="ck_evaluaciones_estado",
        ),
    )
    op.create_index("idx_evaluaciones_materia", "evaluaciones", ["materia_id"])
    op.create_index("idx_evaluaciones_profesor", "evaluaciones", ["profesor_id"])
    op.create_index("idx_evaluaciones_estado", "evaluaciones", ["estado"])

    op.create_table(
        "evaluation_blueprints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("evaluacion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nivel_contexto", sa.String(length=30), nullable=False, server_default="completo"),
        sa.Column("dba", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("metas", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("criterios", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("preguntas", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("respuestas_esperadas", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("errores_comunes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("contexto_rag", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("reglas_feedback", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["evaluacion_id"], ["evaluaciones.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("evaluacion_id", name="uq_evaluation_blueprints_evaluacion"),
        sa.CheckConstraint(
            "nivel_contexto IN ('completo', 'reconstruido', 'minimo')",
            name="ck_evaluation_blueprints_nivel_contexto",
        ),
    )
    op.create_index("idx_evaluation_blueprints_evaluacion", "evaluation_blueprints", ["evaluacion_id"])


def downgrade() -> None:
    op.drop_index("idx_evaluation_blueprints_evaluacion", table_name="evaluation_blueprints")
    op.drop_table("evaluation_blueprints")
    op.drop_index("idx_evaluaciones_estado", table_name="evaluaciones")
    op.drop_index("idx_evaluaciones_profesor", table_name="evaluaciones")
    op.drop_index("idx_evaluaciones_materia", table_name="evaluaciones")
    op.drop_table("evaluaciones")
    op.drop_index("idx_dba_area_grado", table_name="dba_catalog")
    op.drop_table("dba_catalog")
    op.drop_index("idx_matriculas_student", table_name="matriculas")
    op.drop_index("idx_matriculas_materia", table_name="matriculas")
    op.drop_table("matriculas")
    op.drop_index("idx_materias_codigo", table_name="materias")
    op.drop_index("idx_materias_profesor", table_name="materias")
    op.drop_table("materias")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
