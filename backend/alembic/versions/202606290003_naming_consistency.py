"""naming_consistency: student_id -> estudiante_id, evaluation_blueprints -> evaluacion_blueprints

Revision ID: 202606290003
Revises: 202606290002
Create Date: 2026-06-29 12:00:00.000000
"""

from alembic import op

revision = "202606290003"
down_revision = "202606290002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── matriculas ────────────────────────────────────────────────────────────
    op.drop_index("idx_matriculas_student", table_name="matriculas")
    op.drop_constraint("uq_matriculas_materia_student", "matriculas", type_="unique")
    op.alter_column("matriculas", "student_id", new_column_name="estudiante_id")
    op.create_unique_constraint(
        "uq_matriculas_materia_estudiante", "matriculas", ["materia_id", "estudiante_id"]
    )
    op.create_index("idx_matriculas_estudiante", "matriculas", ["estudiante_id"])

    # ── entregas ──────────────────────────────────────────────────────────────
    op.drop_index("idx_entregas_student", table_name="entregas")
    op.alter_column("entregas", "student_id", new_column_name="estudiante_id")
    op.create_index("idx_entregas_estudiante", "entregas", ["estudiante_id"])

    # ── calificaciones ────────────────────────────────────────────────────────
    op.drop_index("idx_calificaciones_student_materia", table_name="calificaciones")
    op.alter_column("calificaciones", "student_id", new_column_name="estudiante_id")
    op.create_index(
        "idx_calificaciones_estudiante_materia",
        "calificaciones",
        ["estudiante_id", "materia_id"],
    )

    # ── evaluation_blueprints → evaluacion_blueprints ─────────────────────────
    # Renombrar constraints antes de renombrar tabla
    op.drop_constraint("uq_evaluation_blueprints_evaluacion", "evaluation_blueprints", type_="unique")
    op.drop_constraint("ck_evaluation_blueprints_nivel_contexto", "evaluation_blueprints", type_="check")
    op.drop_index("idx_evaluation_blueprints_evaluacion", table_name="evaluation_blueprints")

    op.rename_table("evaluation_blueprints", "evaluacion_blueprints")

    op.create_unique_constraint(
        "uq_evaluacion_blueprints_evaluacion", "evaluacion_blueprints", ["evaluacion_id"]
    )
    op.execute(
        "ALTER TABLE evaluacion_blueprints ADD CONSTRAINT ck_evaluacion_blueprints_nivel_contexto "
        "CHECK (nivel_contexto IN ('completo', 'reconstruido', 'minimo'))"
    )
    op.create_index(
        "idx_evaluacion_blueprints_evaluacion", "evaluacion_blueprints", ["evaluacion_id"]
    )


def downgrade() -> None:
    # ── evaluacion_blueprints → evaluation_blueprints ─────────────────────────
    op.drop_constraint("uq_evaluacion_blueprints_evaluacion", "evaluacion_blueprints", type_="unique")
    op.execute(
        "ALTER TABLE evaluacion_blueprints DROP CONSTRAINT ck_evaluacion_blueprints_nivel_contexto"
    )
    op.drop_index("idx_evaluacion_blueprints_evaluacion", table_name="evaluacion_blueprints")
    op.rename_table("evaluacion_blueprints", "evaluation_blueprints")
    op.create_unique_constraint(
        "uq_evaluation_blueprints_evaluacion", "evaluation_blueprints", ["evaluacion_id"]
    )
    op.execute(
        "ALTER TABLE evaluation_blueprints ADD CONSTRAINT ck_evaluation_blueprints_nivel_contexto "
        "CHECK (nivel_contexto IN ('completo', 'reconstruido', 'minimo'))"
    )
    op.create_index(
        "idx_evaluation_blueprints_evaluacion", "evaluation_blueprints", ["evaluacion_id"]
    )

    # ── calificaciones ────────────────────────────────────────────────────────
    op.drop_index("idx_calificaciones_estudiante_materia", table_name="calificaciones")
    op.alter_column("calificaciones", "estudiante_id", new_column_name="student_id")
    op.create_index(
        "idx_calificaciones_student_materia", "calificaciones", ["student_id", "materia_id"]
    )

    # ── entregas ──────────────────────────────────────────────────────────────
    op.drop_index("idx_entregas_estudiante", table_name="entregas")
    op.alter_column("entregas", "estudiante_id", new_column_name="student_id")
    op.create_index("idx_entregas_student", "entregas", ["student_id"])

    # ── matriculas ────────────────────────────────────────────────────────────
    op.drop_index("idx_matriculas_estudiante", table_name="matriculas")
    op.drop_constraint("uq_matriculas_materia_estudiante", "matriculas", type_="unique")
    op.alter_column("matriculas", "estudiante_id", new_column_name="student_id")
    op.create_unique_constraint(
        "uq_matriculas_materia_student", "matriculas", ["materia_id", "student_id"]
    )
    op.create_index("idx_matriculas_student", "matriculas", ["student_id"])
