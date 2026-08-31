"""Ownership rules for Alembic schema comparisons.

Some XCalificator operational tables are intentionally maintained with explicit
SQL migrations because their services use SQLAlchemy Core. Alembic must not
interpret those reflected-only objects as candidates for deletion.
"""
from __future__ import annotations

from typing import Any


SQL_MANAGED_TABLES = frozenset(
    {
        "ai_config_audit_logs",
        "ai_feature_routing",
        "ai_global_config",
        "ai_global_limits",
        "ai_jobs",
        "ai_provider_settings",
        "ai_usage_events",
        "chat_messages",
        "materiales_generados",
        "mail_global_config",
        "password_reset_requests",
        "profesor_ai_configs",
        "profesor_ai_provider_models",
    }
)

DEPRECATED_SQL_TABLES = frozenset({"ai_usage_logs"})

REFLECTED_ONLY_TABLES = SQL_MANAGED_TABLES | DEPRECATED_SQL_TABLES

# Objects created deliberately with SQL or retained for compatibility. They are
# not represented by the ORM and must not become destructive autogenerate ops.
SQL_MANAGED_COLUMNS = frozenset({("rag_chunks", "embedding_vec")})
SQL_MANAGED_INDEXES = frozenset(
    {
        "idx_rag_chunks_embedding_hnsw",
        "idx_asistencia_estudiante",
    }
)
PRESERVED_CONSTRAINTS = frozenset({"uq_users_email"})


def _parent_table_name(obj: Any) -> str | None:
    table = getattr(obj, "table", None)
    return getattr(table, "name", None)


def include_schema_object(
    obj: Any,
    name: str | None,
    type_: str,
    reflected: bool,
    compare_to: Any,
) -> bool:
    """Return whether Alembic should compare an object with ORM metadata."""
    del compare_to

    if type_ == "table" and reflected and name in REFLECTED_ONLY_TABLES:
        return False

    table_name = _parent_table_name(obj)
    if reflected and table_name in REFLECTED_ONLY_TABLES:
        return False

    if type_ == "column" and reflected and (table_name, name) in SQL_MANAGED_COLUMNS:
        return False

    if type_ == "index" and reflected and name in SQL_MANAGED_INDEXES:
        return False

    if type_ in {"unique_constraint", "check_constraint"} and reflected:
        if name in PRESERVED_CONSTRAINTS:
            return False

    if type_ == "foreign_key_constraint" and reflected:
        for element in getattr(obj, "elements", ()):  # pragma: no branch - tiny collection
            target = str(getattr(element, "target_fullname", ""))
            target_table = target.split(".", 1)[0]
            if target_table in REFLECTED_ONLY_TABLES:
                return False

    return True
