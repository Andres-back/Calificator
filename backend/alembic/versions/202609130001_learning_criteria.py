"""Add versioned learning criteria without replacing DBA history.

Revision ID: 202609130001
Revises: 202609100001
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "202609130001"
down_revision: Union[str, None] = "202609100001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "learning_criterion_sets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("materia_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("materias.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("titulo", sa.String(180), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("estado", sa.String(30), nullable=False, server_default="activo"),
        sa.Column("current_version_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("legacy_dba_personalizado_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("dba_personalizados.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("legacy_evaluation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("evaluaciones.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("estado IN ('activo','archivado')", name="ck_learning_criterion_set_estado"),
    )
    op.create_index("idx_learning_criterion_sets_materia", "learning_criterion_sets", ["materia_id", "estado"])
    op.create_index("idx_learning_criterion_sets_profesor", "learning_criterion_sets", ["profesor_id"])
    op.create_index("uq_learning_criterion_sets_legacy", "learning_criterion_sets", ["legacy_dba_personalizado_id"], unique=True, postgresql_where=sa.text("legacy_dba_personalizado_id IS NOT NULL"))
    op.create_index("uq_learning_criterion_sets_legacy_evaluation", "learning_criterion_sets", ["legacy_evaluation_id"], unique=True, postgresql_where=sa.text("legacy_evaluation_id IS NOT NULL"))

    op.create_table(
        "learning_criterion_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("set_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("learning_criterion_sets.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("estado", sa.String(30), nullable=False, server_default="borrador"),
        sa.Column("teacher_intent_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("generation_meta_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("coverage_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("source_fingerprint", sa.String(64), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("set_id", "version_number", name="uq_learning_criterion_version_number"),
        sa.CheckConstraint("version_number >= 1", name="ck_learning_criterion_version_number"),
        sa.CheckConstraint("estado IN ('borrador','procesando','requiere_revision','aprobada','sustituida')", name="ck_learning_criterion_version_estado"),
    )
    op.create_index("idx_learning_criterion_versions_set", "learning_criterion_versions", ["set_id", "version_number"])
    op.create_index("uq_learning_criterion_versions_draft", "learning_criterion_versions", ["set_id"], unique=True, postgresql_where=sa.text("estado IN ('borrador','procesando','requiere_revision')"))
    op.create_foreign_key("fk_learning_criterion_sets_current_version", "learning_criterion_sets", "learning_criterion_versions", ["current_version_id"], ["id"], ondelete="RESTRICT")

    op.create_table(
        "learning_criteria",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("learning_criterion_versions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("stable_key", sa.String(80), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(180), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=False, server_default=""),
        sa.Column("evidencia_esperada", sa.Text(), nullable=False, server_default=""),
        sa.Column("peso_porcentaje", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("puntaje_maximo", sa.Numeric(8, 2), nullable=True),
        sa.Column("niveles_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("source_refs_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("official_standard_refs_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("version_id", "stable_key", name="uq_learning_criteria_key"),
        sa.UniqueConstraint("version_id", "orden", name="uq_learning_criteria_order"),
        sa.CheckConstraint("orden >= 1", name="ck_learning_criteria_order"),
        sa.CheckConstraint("peso_porcentaje >= 0 AND peso_porcentaje <= 100", name="ck_learning_criteria_weight"),
        sa.CheckConstraint("puntaje_maximo IS NULL OR puntaje_maximo >= 0", name="ck_learning_criteria_points"),
    )
    op.create_index("idx_learning_criteria_version_order", "learning_criteria", ["version_id", "orden"])

    op.create_table(
        "learning_criterion_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("learning_criterion_versions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("tipo", sa.String(30), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("private_file_key", sa.Text(), nullable=True),
        sa.Column("mime_type", sa.String(120), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("rag_source_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rag_sources.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("reference_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("extraction_status", sa.String(30), nullable=False, server_default="pendiente"),
        sa.Column("content_hash", sa.String(64), nullable=True),
        sa.Column("visible_to_student", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("error", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("version_id", "orden", name="uq_learning_criterion_source_order"),
        sa.CheckConstraint("orden >= 1", name="ck_learning_criterion_source_order"),
        sa.CheckConstraint("tipo IN ('foto','pdf','documento','texto','material_existente','estandar_oficial')", name="ck_learning_criterion_source_type"),
        sa.CheckConstraint("extraction_status IN ('pendiente','procesando','lista','error','eliminada')", name="ck_learning_criterion_source_status"),
        sa.CheckConstraint("size_bytes IS NULL OR size_bytes >= 0", name="ck_learning_criterion_source_size"),
        sa.CheckConstraint("page_count IS NULL OR page_count >= 1", name="ck_learning_criterion_source_pages"),
    )
    op.create_index("idx_learning_criterion_sources_version", "learning_criterion_sources", ["version_id", "orden"])
    op.create_index(
        "uq_learning_criterion_sources_hash",
        "learning_criterion_sources",
        ["version_id", "content_hash"],
        unique=True,
        postgresql_where=sa.text("content_hash IS NOT NULL AND deleted_at IS NULL"),
    )

    op.create_table(
        "learning_criterion_applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("learning_criterion_versions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("target_type", sa.String(30), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("snapshot_json", postgresql.JSONB(), nullable=False),
        sa.Column("snapshot_hash", sa.String(64), nullable=False),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("applied_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("target_type IN ('evaluacion','recurso')", name="ck_learning_criterion_application_target"),
    )
    op.create_index("idx_learning_criterion_applications_target", "learning_criterion_applications", ["target_type", "target_id"])
    op.create_index("uq_learning_criterion_applications_current", "learning_criterion_applications", ["target_type", "target_id"], unique=True, postgresql_where=sa.text("is_current = true"))

    op.create_table(
        "grading_component_criteria",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("component_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("calificacion_componentes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("learning_criterion_applications.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("criterion_stable_key", sa.String(80), nullable=False),
        sa.Column("criterion_snapshot_json", postgresql.JSONB(), nullable=False),
        sa.Column("max_points", sa.Numeric(12, 4), nullable=False),
        sa.Column("awarded_points", sa.Numeric(12, 4), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("component_id", "application_id", "criterion_stable_key", name="uq_grading_component_criterion"),
        sa.CheckConstraint("max_points >= 0", name="ck_grading_component_criterion_max"),
        sa.CheckConstraint("awarded_points >= 0 AND awarded_points <= max_points", name="ck_grading_component_criterion_awarded"),
    )
    op.create_index("idx_grading_component_criteria_component", "grading_component_criteria", ["component_id"])

    # Importación compatible de criterios personalizados. Los UUID heredados se
    # conservan como vínculo, no se alteran las filas DBA originales.
    op.execute(sa.text("""
        INSERT INTO learning_criterion_sets
            (id, materia_id, profesor_id, titulo, descripcion, estado, legacy_dba_personalizado_id, created_at, updated_at)
        SELECT uuid_generate_v4(), d.materia_id, d.profesor_id,
               LEFT(d.enunciado, 180), d.ejemplo, CASE WHEN d.activo THEN 'activo' ELSE 'archivado' END,
               d.id, d.created_at, d.updated_at
        FROM dba_personalizados d
        ON CONFLICT (legacy_dba_personalizado_id) WHERE legacy_dba_personalizado_id IS NOT NULL DO NOTHING
    """))
    op.execute(sa.text("""
        INSERT INTO learning_criterion_versions
            (id, set_id, version_number, estado, teacher_intent_json, generation_meta_json,
             coverage_json, source_fingerprint, created_by, approved_by, approved_at, created_at, updated_at)
        SELECT uuid_generate_v4(), s.id, 1, 'aprobada',
               jsonb_build_object('origen', 'legacy_dba_personalizado'),
               jsonb_build_object('origen', 'legacy_dba_personalizado'), '{}'::jsonb,
               md5(s.legacy_dba_personalizado_id::text), s.profesor_id, s.profesor_id, s.created_at,
               s.created_at, s.updated_at
        FROM learning_criterion_sets s
        WHERE s.legacy_dba_personalizado_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM learning_criterion_versions v WHERE v.set_id=s.id)
    """))
    op.execute(sa.text("""
        INSERT INTO learning_criterion_sets
            (id, materia_id, profesor_id, titulo, descripcion, estado, legacy_evaluation_id, created_at, updated_at)
        SELECT uuid_generate_v4(), e.materia_id, e.profesor_id, LEFT('Histórico: ' || e.nombre, 180),
               'Snapshot reconstruido sin modificar la evaluación original', 'archivado', e.id, e.created_at, e.updated_at
        FROM evaluaciones e
        LEFT JOIN evaluacion_blueprints b ON b.evaluacion_id=e.id
        WHERE (jsonb_array_length(COALESCE(b.criterios, e.criterios, '[]'::jsonb)) > 0
               OR jsonb_array_length(COALESCE(e.dba_ids, '[]'::jsonb)) > 0
               OR jsonb_array_length(COALESCE(e.dba_personalizado_ids, '[]'::jsonb)) > 0)
        ON CONFLICT (legacy_evaluation_id) WHERE legacy_evaluation_id IS NOT NULL DO NOTHING
    """))
    op.execute(sa.text("""
        INSERT INTO learning_criterion_versions
            (id, set_id, version_number, estado, teacher_intent_json, generation_meta_json,
             coverage_json, source_fingerprint, created_by, approved_by, approved_at, created_at, updated_at)
        SELECT uuid_generate_v4(), s.id, 1, 'aprobada',
               jsonb_build_object('origen', 'legacy_evaluation_snapshot'),
               jsonb_build_object('origen', 'legacy_reconstructed'), '{}'::jsonb,
               md5(s.legacy_evaluation_id::text), s.profesor_id, s.profesor_id, s.created_at,
               s.created_at, s.updated_at
        FROM learning_criterion_sets s
        WHERE s.legacy_evaluation_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM learning_criterion_versions v WHERE v.set_id=s.id)
    """))
    op.execute(sa.text("""
        INSERT INTO learning_criteria
            (version_id, stable_key, orden, nombre, descripcion, evidencia_esperada,
             peso_porcentaje, niveles_json, source_refs_json, official_standard_refs_json)
        SELECT v.id, 'legacy-' || d.id::text, 1, LEFT(d.enunciado, 180), d.enunciado,
               COALESCE(d.evidencias_aprendizaje, ''), 100, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
        FROM learning_criterion_versions v
        JOIN learning_criterion_sets s ON s.id=v.set_id
        JOIN dba_personalizados d ON d.id=s.legacy_dba_personalizado_id
        WHERE NOT EXISTS (SELECT 1 FROM learning_criteria c WHERE c.version_id=v.id)
    """))
    op.execute(sa.text("""
        UPDATE learning_criterion_sets s SET current_version_id=v.id
        FROM learning_criterion_versions v
        WHERE v.set_id=s.id AND v.estado='aprobada' AND s.current_version_id IS NULL
    """))

    # Aplicación histórica por evaluación; el hash hace la operación reejecutable.
    op.execute(sa.text("""
        INSERT INTO learning_criterion_applications
            (version_id, target_type, target_id, snapshot_json, snapshot_hash, is_current, applied_by, applied_at)
        SELECT v.id, 'evaluacion', e.id,
               jsonb_build_object(
                   'origen', 'legacy_snapshot', 'criterios', COALESCE(b.criterios, e.criterios, '[]'::jsonb),
                   'dba', COALESCE(b.dba, '[]'::jsonb), 'dba_ids', COALESCE(e.dba_ids, '[]'::jsonb),
                   'dba_personalizado_ids', COALESCE(e.dba_personalizado_ids, '[]'::jsonb)
               ),
               md5(e.id::text || COALESCE(b.updated_at, e.updated_at)::text), true, e.profesor_id,
               COALESCE(b.created_at, e.created_at)
        FROM evaluaciones e
        LEFT JOIN evaluacion_blueprints b ON b.evaluacion_id=e.id
        JOIN learning_criterion_sets ls ON ls.legacy_evaluation_id=e.id
        JOIN learning_criterion_versions v ON v.set_id=ls.id AND v.version_number=1
        WHERE (jsonb_array_length(COALESCE(b.criterios, e.criterios, '[]'::jsonb)) > 0
               OR jsonb_array_length(COALESCE(e.dba_ids, '[]'::jsonb)) > 0
               OR jsonb_array_length(COALESCE(e.dba_personalizado_ids, '[]'::jsonb)) > 0)
          AND NOT EXISTS (
              SELECT 1 FROM learning_criterion_applications a
              WHERE a.target_type='evaluacion' AND a.target_id=e.id AND a.is_current
          )
    """))


def downgrade() -> None:
    op.drop_index("idx_grading_component_criteria_component", table_name="grading_component_criteria")
    op.drop_table("grading_component_criteria")
    op.drop_index("uq_learning_criterion_applications_current", table_name="learning_criterion_applications")
    op.drop_index("idx_learning_criterion_applications_target", table_name="learning_criterion_applications")
    op.drop_table("learning_criterion_applications")
    op.drop_index("uq_learning_criterion_sources_hash", table_name="learning_criterion_sources")
    op.drop_index("idx_learning_criterion_sources_version", table_name="learning_criterion_sources")
    op.drop_table("learning_criterion_sources")
    op.drop_index("idx_learning_criteria_version_order", table_name="learning_criteria")
    op.drop_table("learning_criteria")
    op.drop_constraint("fk_learning_criterion_sets_current_version", "learning_criterion_sets", type_="foreignkey")
    op.drop_index("uq_learning_criterion_versions_draft", table_name="learning_criterion_versions")
    op.drop_index("idx_learning_criterion_versions_set", table_name="learning_criterion_versions")
    op.drop_table("learning_criterion_versions")
    op.drop_index("uq_learning_criterion_sets_legacy_evaluation", table_name="learning_criterion_sets")
    op.drop_index("uq_learning_criterion_sets_legacy", table_name="learning_criterion_sets")
    op.drop_index("idx_learning_criterion_sets_profesor", table_name="learning_criterion_sets")
    op.drop_index("idx_learning_criterion_sets_materia", table_name="learning_criterion_sets")
    op.drop_table("learning_criterion_sets")
