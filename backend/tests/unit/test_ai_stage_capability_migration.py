from __future__ import annotations

import importlib.util
from pathlib import Path

from app.services.ai_configuration_resolver import capability_for


def _load_migration():
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "alembic"
        / "versions"
        / "202609200002_fix_ai_stage_capabilities.py"
    )
    spec = importlib.util.spec_from_file_location("ai_stage_capability_migration", migration_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _record_statements(callback_name: str) -> str:
    module = _load_migration()
    statements: list[str] = []

    class RecordingOp:
        @staticmethod
        def execute(statement: str) -> None:
            statements.append(statement)

    module.op = RecordingOp()
    getattr(module, callback_name)()
    return "\n".join(statements)


def test_canonical_stage_capabilities_match_runtime_contracts() -> None:
    assert capability_for("calificacion.extraccion") == "vision"
    assert capability_for("digitalizacion.extraccion") == "vision"
    assert capability_for("presentaciones.imagenes") == "image"
    assert capability_for("calificacion.verificacion") == "text"
    assert capability_for("calificacion.revision_adicional") == "text"


def test_upgrade_repairs_only_capability_and_is_guarded_against_repetition() -> None:
    sql = _record_statements("upgrade")

    assert sql.count("UPDATE ai_feature_routing") == 3
    assert "feature = 'calificacion.extraccion'" in sql
    assert "feature = 'digitalizacion.extraccion'" in sql
    assert "feature = 'presentaciones.imagenes'" in sql
    assert sql.count("capability = 'vision'") == 2
    assert sql.count("capability = 'image'") == 1
    assert sql.count("capability IS DISTINCT FROM") == 3
    assert "primary_provider" not in sql
    assert "primary_model" not in sql
    assert "fallback_provider" not in sql


def test_downgrade_restores_previous_labels_without_touching_models() -> None:
    sql = _record_statements("downgrade")

    assert sql.count("UPDATE ai_feature_routing") == 3
    assert sql.count("capability = 'text'") == 3
    assert sql.count("capability IS DISTINCT FROM 'text'") == 3
    assert "primary_provider" not in sql
    assert "primary_model" not in sql
