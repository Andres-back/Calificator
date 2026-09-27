from pathlib import Path


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
