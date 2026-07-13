"""Phases 3-8: RAG, calificaciones, jobs, presentaciones, xali, admin_ai_config.

Revision ID: 202606290002
Revises: 202606290001
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202606290002"
down_revision = "202606290001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── RAG ────────────────────────────────────────────────────────────────────
    op.create_table(
        "rag_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tipo", sa.String(60), nullable=False),
        sa.Column("titulo", sa.Text(), nullable=False),
        sa.Column("contenido_original", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"]),
    )
    op.create_index("idx_rag_sources_materia", "rag_sources", ["materia_id"])
    op.create_index("idx_rag_sources_profesor", "rag_sources", ["profesor_id"])

    op.create_table(
        "rag_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tipo", sa.String(60), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("embedding", postgresql.ARRAY(sa.Float()), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["source_id"], ["rag_sources.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"]),
    )
    op.create_index("idx_rag_chunks_materia", "rag_chunks", ["materia_id"])
    op.create_index("idx_rag_chunks_profesor", "rag_chunks", ["profesor_id"])
    op.create_index("idx_rag_chunks_tipo", "rag_chunks", ["tipo"])
    # HNSW index for vector similarity – uses pgvector operator class
    op.execute(
        "ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS embedding_vec vector(1536)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_hnsw "
        "ON rag_chunks USING hnsw (embedding_vec vector_cosine_ops)"
    )

    # ── Entregas ───────────────────────────────────────────────────────────────
    op.create_table(
        "entregas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("evaluacion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tipo", sa.String(40), nullable=False),
        sa.Column("respuesta_texto", sa.Text(), nullable=True),
        sa.Column("archivo_url", sa.Text(), nullable=True),
        sa.Column("visual_text_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("estado", sa.String(40), nullable=False, server_default="pendiente"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["evaluacion_id"], ["evaluaciones.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"]),
        sa.CheckConstraint("tipo IN ('online','foto','pdf','captura')", name="ck_entregas_tipo"),
        sa.CheckConstraint(
            "estado IN ('pendiente','recibida','calificada','revisada','requiere_reintento')",
            name="ck_entregas_estado",
        ),
    )
    op.create_index("idx_entregas_evaluacion", "entregas", ["evaluacion_id"])
    op.create_index("idx_entregas_student", "entregas", ["student_id"])
    op.create_index("idx_entregas_materia", "entregas", ["materia_id"])

    # ── Calificaciones ─────────────────────────────────────────────────────────
    op.create_table(
        "calificaciones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("evaluacion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entrega_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nota_sugerida", sa.Numeric(6, 2), nullable=True),
        sa.Column("nota_confirmada", sa.Numeric(6, 2), nullable=True),
        sa.Column("confianza", sa.Numeric(5, 2), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("resultado_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("revisado_por_docente", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("estado", sa.String(40), nullable=False, server_default="sugerida"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["evaluacion_id"], ["evaluaciones.id"]),
        sa.ForeignKeyConstraint(["entrega_id"], ["entregas.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"]),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"]),
        sa.CheckConstraint(
            "estado IN ('sugerida','confirmada','ajustada','requiere_revision')",
            name="ck_calificaciones_estado",
        ),
    )
    op.create_index("idx_calificaciones_student_materia", "calificaciones", ["student_id", "materia_id"])
    op.create_index("idx_calificaciones_evaluacion", "calificaciones", ["evaluacion_id"])

    # ── Materiales generados ───────────────────────────────────────────────────
    op.create_table(
        "materiales_generados",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tipo", sa.String(60), nullable=False),
        sa.Column("titulo", sa.Text(), nullable=False),
        sa.Column("input_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("contenido_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("archivo_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"]),
    )
    op.create_index("idx_materiales_profesor", "materiales_generados", ["profesor_id"])

    # ── Presentaciones ─────────────────────────────────────────────────────────
    op.create_table(
        "presentaciones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("titulo", sa.Text(), nullable=False),
        sa.Column("estado", sa.String(40), nullable=False, server_default="queued"),
        sa.Column("slides_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("pptx_url", sa.Text(), nullable=True),
        sa.Column("pdf_url", sa.Text(), nullable=True),
        sa.Column("presenton_id", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"]),
    )
    op.create_index("idx_presentaciones_profesor", "presentaciones", ["profesor_id"])

    # ── Xali chat ─────────────────────────────────────────────────────────────
    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("role", sa.String(30), nullable=False),
        sa.Column("mensaje", sa.Text(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["materia_id"], ["materias.id"]),
        sa.CheckConstraint("role IN ('user','assistant','system')", name="ck_chat_role"),
    )
    op.create_index("idx_chat_student_materia", "chat_messages", ["student_id", "materia_id"])

    # ── Jobs ───────────────────────────────────────────────────────────────────
    op.create_table(
        "ai_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tipo", sa.String(60), nullable=False),
        sa.Column("estado", sa.String(40), nullable=False, server_default="queued"),
        sa.Column("progreso", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("input_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("resultado_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("idx_ai_jobs_user", "ai_jobs", ["user_id"])
    op.create_index("idx_ai_jobs_estado", "ai_jobs", ["estado"])

    # ── AI usage logs ──────────────────────────────────────────────────────────
    op.create_table(
        "ai_usage_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("provider", sa.String(80), nullable=True),
        sa.Column("model", sa.String(120), nullable=True),
        sa.Column("tipo", sa.String(80), nullable=True),
        sa.Column("tokens_input", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tokens_output", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("costo_estimado", sa.Numeric(10, 6), nullable=True),
        sa.Column("latencia_ms", sa.Integer(), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("idx_ai_usage_logs_user", "ai_usage_logs", ["user_id"])
    op.create_index("idx_ai_usage_logs_provider", "ai_usage_logs", ["provider"])

    # ── AI global config ───────────────────────────────────────────────────────
    op.create_table(
        "ai_global_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("openai_key_encrypted", sa.Text(), nullable=True),
        sa.Column("cloudflare_token_encrypted", sa.Text(), nullable=True),
        sa.Column("cloudflare_account_id", sa.Text(), nullable=True),
        sa.Column("presenton_password_encrypted", sa.Text(), nullable=True),
        sa.Column("open_code_key_encrypted", sa.Text(), nullable=True),
        sa.Column("groq_key_encrypted", sa.Text(), nullable=True),
        sa.Column("modelo_llm_default", sa.String(120), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "profesor_ai_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("openai_key_encrypted", sa.Text(), nullable=True),
        sa.Column("cloudflare_token_encrypted", sa.Text(), nullable=True),
        sa.Column("cloudflare_account_id", sa.Text(), nullable=True),
        sa.Column("modelo_llm_preferido", sa.String(120), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["profesor_id"], ["users.id"]),
        sa.UniqueConstraint("profesor_id", name="uq_profesor_ai_configs_profesor"),
    )


def downgrade() -> None:
    op.drop_table("profesor_ai_configs")
    op.drop_table("ai_global_config")
    op.drop_table("ai_usage_logs")
    op.drop_table("ai_jobs")
    op.drop_table("chat_messages")
    op.drop_table("presentaciones")
    op.drop_table("materiales_generados")
    op.drop_table("calificaciones")
    op.drop_table("entregas")
    op.drop_table("rag_chunks")
    op.drop_table("rag_sources")
