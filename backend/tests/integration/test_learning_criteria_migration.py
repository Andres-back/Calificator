import importlib.util
import json
import os
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text
from alembic.script import ScriptDirectory

from alembic.migration import MigrationContext
from alembic.operations import Operations

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "alembic" / "versions" / "202609130001_learning_criteria.py"


def test_learning_criteria_migration_is_additive_and_idempotent() -> None:
    source = MIGRATION.read_text(encoding="utf-8")

    assert 'down_revision: Union[str, None] = "202609100001"' in source
    for table in (
        "learning_criterion_sets",
        "learning_criterion_versions",
        "learning_criteria",
        "learning_criterion_sources",
        "learning_criterion_applications",
        "grading_component_criteria",
    ):
        assert f'"{table}"' in source
    assert "ON CONFLICT (legacy_dba_personalizado_id)" in source
    assert "ON CONFLICT (legacy_evaluation_id)" in source
    assert source.count("NOT EXISTS") >= 4


def test_backfill_does_not_update_legacy_grades_blueprints_or_incidents() -> None:
    source = MIGRATION.read_text(encoding="utf-8").lower()

    assert "update calificaciones" not in source
    assert "update calificacion_componentes" not in source
    assert "update calificacion_incidencias" not in source
    assert "update evaluacion_blueprints" not in source
    assert "update evaluaciones" not in source
    assert "drop_table(\"dba" not in source


@pytest.mark.skipif(
    not os.getenv("SPEC042_TEST_DATABASE_URL"),
    reason="Requiere PostgreSQL para esquema transaccional aislado SPEC042_TEST_DATABASE_URL",
)
def test_postgresql_backfill_twice_preserves_legacy_records_and_snapshots() -> None:
    """Ejecuta el DDL real y dos importaciones dentro de un esquema reversible."""
    module_spec = importlib.util.spec_from_file_location("criteria_migration", MIGRATION)
    migration = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(migration)
    engine = create_engine(os.environ["SPEC042_TEST_DATABASE_URL"])
    schema = "test_criteria_042_" + uuid4().hex
    legacy_tables = (
        "dba_catalog", "dba_personalizados", "evaluaciones", "evaluacion_blueprints",
        "calificaciones", "calificacion_desgloses", "calificacion_componentes",
        "calificacion_incidencias",
    )
    new_tables = (
        "learning_criterion_sets", "learning_criterion_versions", "learning_criteria",
        "learning_criterion_sources", "learning_criterion_applications", "grading_component_criteria",
    )

    def snapshot(connection, tables):
        return {
            name: connection.execute(text(
                f"SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY id), '[]'::jsonb) FROM {name} t"
            )).scalar_one()
            for name in tables
        }

    try:
        with engine.connect() as connection:
            transaction = connection.begin()
            try:
                connection.exec_driver_sql(f'CREATE SCHEMA "{schema}"')
                connection.exec_driver_sql(f'SET LOCAL search_path TO "{schema}", public')
                for ddl in (
                    "CREATE TABLE users (id uuid PRIMARY KEY)",
                    "CREATE TABLE materias (id uuid PRIMARY KEY, profesor_id uuid NOT NULL REFERENCES users(id))",
                    "CREATE TABLE rag_sources (id uuid PRIMARY KEY)",
                    "CREATE TABLE dba_catalog (id uuid PRIMARY KEY, descripcion text NOT NULL)",
                    "CREATE TABLE dba_personalizados (id uuid PRIMARY KEY, materia_id uuid NOT NULL, profesor_id uuid NOT NULL, enunciado text NOT NULL, ejemplo text, evidencias_aprendizaje text, activo boolean NOT NULL, created_at timestamp NOT NULL, updated_at timestamp NOT NULL)",
                    "CREATE TABLE evaluaciones (id uuid PRIMARY KEY, materia_id uuid NOT NULL, profesor_id uuid NOT NULL, nombre text NOT NULL, estado text NOT NULL, criterios jsonb NOT NULL, dba_ids jsonb NOT NULL, dba_personalizado_ids jsonb NOT NULL, created_at timestamp NOT NULL, updated_at timestamp NOT NULL)",
                    "CREATE TABLE evaluacion_blueprints (id uuid PRIMARY KEY, evaluacion_id uuid NOT NULL, criterios jsonb NOT NULL, dba jsonb NOT NULL, preguntas jsonb NOT NULL, created_at timestamp NOT NULL, updated_at timestamp NOT NULL)",
                    "CREATE TABLE calificaciones (id uuid PRIMARY KEY, evaluacion_id uuid NOT NULL, nota_confirmada numeric NOT NULL, estado text NOT NULL, resultado_json jsonb NOT NULL)",
                    "CREATE TABLE calificacion_desgloses (id uuid PRIMARY KEY, calificacion_id uuid NOT NULL, nota_final numeric NOT NULL, version integer NOT NULL, activo boolean NOT NULL)",
                    "CREATE TABLE calificacion_componentes (id uuid PRIMARY KEY, desglose_id uuid NOT NULL, puntos_obtenidos numeric NOT NULL, puntos_maximos numeric NOT NULL)",
                    "CREATE TABLE calificacion_incidencias (id uuid PRIMARY KEY, calificacion_id uuid NOT NULL, descripcion text NOT NULL, estado text NOT NULL)",
                ):
                    connection.exec_driver_sql(ddl)
                ids = {key: uuid4() for key in (
                    "teacher", "subject", "official", "custom", "closed", "published",
                    "blueprint", "grade", "breakdown", "component", "incident",
                )}
                params = {
                    **ids,
                    "criteria": json.dumps([{"nombre": "Comprensión", "peso": 100}]),
                    "official_ids": json.dumps([str(ids["official"])]),
                    "custom_ids": json.dumps([str(ids["custom"])]),
                    "standards": json.dumps([{"id": str(ids["official"]), "descripcion": "Referencia original"}]),
                    "questions": json.dumps([{"numero": 1, "puntaje": 1}]),
                }
                for query in (
                    "INSERT INTO users VALUES (:teacher)",
                    "INSERT INTO materias VALUES (:subject, :teacher)",
                    "INSERT INTO dba_catalog VALUES (:official, 'Referencia original')",
                    "INSERT INTO dba_personalizados VALUES (:custom, :subject, :teacher, 'Comprende lo trabajado en clase', 'Ejemplo original', 'Respuesta sustentada', true, '2026-09-01', '2026-09-02')",
                    "INSERT INTO evaluaciones VALUES (:closed, :subject, :teacher, 'Lectura cerrada', 'cerrada', CAST(:criteria AS jsonb), CAST(:official_ids AS jsonb), CAST(:custom_ids AS jsonb), '2026-09-01', '2026-09-02')",
                    "INSERT INTO evaluaciones VALUES (:published, :subject, :teacher, 'Lectura publicada', 'publicada', CAST(:criteria AS jsonb), CAST(:official_ids AS jsonb), '[]'::jsonb, '2026-09-01', '2026-09-02')",
                    "INSERT INTO evaluacion_blueprints VALUES (:blueprint, :closed, CAST(:criteria AS jsonb), CAST(:standards AS jsonb), CAST(:questions AS jsonb), '2026-09-01', '2026-09-02')",
                    "INSERT INTO calificaciones VALUES (:grade, :closed, 3.5, 'publicada', '{\"feedback\":\"Identifica la idea principal\"}'::jsonb)",
                    "INSERT INTO calificacion_desgloses VALUES (:breakdown, :grade, 3.5, 1, true)",
                    "INSERT INTO calificacion_componentes VALUES (:component, :breakdown, 0.7, 1)",
                    "INSERT INTO calificacion_incidencias VALUES (:incident, :grade, 'Revisar pregunta uno', 'abierta')",
                ):
                    connection.execute(text(query), params)
                before = snapshot(connection, legacy_tables)
                with Operations.context(MigrationContext.configure(connection)):
                    migration.upgrade()
                    first = snapshot(connection, new_tables)
                    migration.backfill()
                    second = snapshot(connection, new_tables)

                assert snapshot(connection, legacy_tables) == before
                assert second == first
                assert len(first["learning_criterion_sets"]) == 3
                assert len(first["learning_criterion_versions"]) == 3
                assert len(first["learning_criterion_applications"]) == 2
                assert first["grading_component_criteria"] == []
                applied = next(item for item in first["learning_criterion_applications"] if item["target_id"] == str(ids["closed"]))
                assert applied["snapshot_json"]["criterios"] == json.loads(params["criteria"])
                assert applied["snapshot_json"]["dba_ids"] == [str(ids["official"])]
                assert applied["snapshot_json"]["dba_personalizado_ids"] == [str(ids["custom"])]
            finally:
                transaction.rollback()
    finally:
        engine.dispose()


def test_criteria_and_production_migrations_have_one_merged_head():
    directory = ScriptDirectory(str(Path(__file__).resolve().parents[2] / "alembic"))
    assert len(directory.get_heads()) == 1
    assert set(directory.get_revision("202609270001").down_revision) == {"202609130001", "202609240001"}
