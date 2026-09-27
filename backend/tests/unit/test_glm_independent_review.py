from __future__ import annotations

import importlib.util
from pathlib import Path

from app.core.config import Settings


def test_glm_defaults_keep_deepseek_primary_and_add_independent_review() -> None:
    configured = Settings(_env_file=None)

    assert configured.VISION_MODEL == "deepseek-v4-flash-vision-exp"
    assert configured.vision_fallback_models[0] == "glm-5.3-flash"
    assert configured.PHOTO_GRADING_VERIFIER_MODEL == "glm-5.3-flash"
    assert configured.PHOTO_GRADING_COMPARATOR_MODEL == "glm-5.3-flash"


def test_migration_only_changes_unmodified_institutional_routes() -> None:
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "alembic"
        / "versions"
        / "202609200001_glm_independent_review.py"
    )
    spec = importlib.util.spec_from_file_location("glm_review_migration", migration_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    statements: list[str] = []

    class RecordingOp:
        @staticmethod
        def execute(statement: str) -> None:
            statements.append(statement)

    module.op = RecordingOp()
    module.upgrade()

    sql = "\n".join(statements)
    assert "glm-5.3-flash" in sql
    assert "calificacion.verificacion" in sql
    assert "calificacion.revision_adicional" in sql
    assert "updated_by IS NULL" in sql
    assert "calificacion.extraccion" not in sql
