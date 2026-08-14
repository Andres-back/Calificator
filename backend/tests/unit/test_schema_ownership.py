from sqlalchemy import (
    Column,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    Table,
    UniqueConstraint,
)

from app.db.schema_ownership import (
    DEPRECATED_SQL_TABLES,
    SQL_MANAGED_TABLES,
    include_schema_object,
)


def test_known_sql_and_external_tables_are_excluded_when_reflected() -> None:
    metadata = MetaData()
    for table_name in SQL_MANAGED_TABLES | DEPRECATED_SQL_TABLES:
        table = Table(table_name, metadata, Column("id", Integer, primary_key=True))
        assert include_schema_object(table, table_name, "table", True, None) is False


def test_orm_managed_tables_remain_in_alembic_comparison() -> None:
    table = Table("evaluaciones", MetaData(), Column("id", Integer, primary_key=True))
    assert include_schema_object(table, table.name, "table", True, None) is True
    assert include_schema_object(table, table.name, "table", False, table) is True


def test_sql_managed_artifacts_are_preserved() -> None:
    metadata = MetaData()
    rag = Table("rag_chunks", metadata, Column("embedding_vec", Integer))
    vector_column = rag.c.embedding_vec
    assert (
        include_schema_object(
            vector_column,
            vector_column.name,
            "column",
            True,
            None,
        )
        is False
    )

    attendance = Table(
        "asistencia_registros", metadata, Column("estudiante_id", Integer)
    )
    legacy_index = Index("idx_asistencia_estudiante", attendance.c.estudiante_id)
    assert (
        include_schema_object(legacy_index, legacy_index.name, "index", True, None)
        is False
    )

    users = Table(
        "users",
        metadata,
        Column("email", Integer),
        UniqueConstraint("email", name="uq_users_email"),
    )
    constraint = next(
        item for item in users.constraints if item.name == "uq_users_email"
    )
    assert (
        include_schema_object(
            constraint,
            constraint.name,
            "unique_constraint",
            True,
            None,
        )
        is False
    )


def test_foreign_key_to_sql_managed_table_is_preserved() -> None:
    metadata = MetaData()
    Table("materiales_generados", metadata, Column("id", Integer, primary_key=True))
    evaluations = Table(
        "evaluaciones",
        metadata,
        Column("material_origen_id", ForeignKey("materiales_generados.id")),
    )
    foreign_key = next(iter(evaluations.foreign_key_constraints))
    assert (
        include_schema_object(
            foreign_key,
            foreign_key.name,
            "foreign_key_constraint",
            True,
            None,
        )
        is False
    )
