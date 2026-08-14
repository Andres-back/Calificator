from app.db.base import Base, import_models


def test_all_declared_models_have_resolvable_metadata_dependencies() -> None:
    import_models()

    table_names = [table.name for table in Base.metadata.sorted_tables]

    assert "evaluaciones" in table_names
    assert "entregas" in table_names
    assert "calificaciones" in table_names
    assert "calificacion_incidencias" in table_names
    assert "analytics_eventos" in table_names
    assert "xali_refuerzos" in table_names
    assert "xali_student_resources" in table_names
