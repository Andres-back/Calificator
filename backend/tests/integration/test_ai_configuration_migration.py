from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = ROOT / "alembic" / "versions"


def _value(path: Path, name: str) -> str:
    match = re.search(rf"^{name}(?:\s*:\s*[^=]+)?\s*=\s*[\"']([^\"']+)[\"']", path.read_text(encoding="utf-8"), re.MULTILINE)
    assert match, f"Missing {name} in {path.name}"
    return match.group(1)


def test_ai_configuration_migrations_form_a_linear_compatible_chain():
    bridge = MIGRATIONS / "202608240001_reconcile_ai_configuration_head.py"
    initial = MIGRATIONS / "202608250001_teacher_ai_configuration.py"
    catalog = MIGRATIONS / "202608250002_complete_ai_model_catalog.py"
    tracing = MIGRATIONS / "202608250003_trace_ai_route_selection.py"
    history = MIGRATIONS / "202608250004_ai_configuration_history.py"

    assert _value(bridge, "down_revision") == "202608210001"
    assert _value(initial, "down_revision") == "202608240001"
    assert _value(catalog, "down_revision") == "202608250001"
    assert _value(tracing, "down_revision") == "202608250002"
    assert _value(history, "down_revision") == "202608250003"


def test_initial_migration_keeps_legacy_teacher_configuration_and_adds_new_tables():
    source = (MIGRATIONS / "202608250001_teacher_ai_configuration.py").read_text(encoding="utf-8")
    assert 'op.add_column("profesor_ai_configs"' in source
    assert 'op.drop_table("profesor_ai_configs")' not in source
    assert '"profesor_ai_credentials"' in source
    assert '"profesor_ai_feature_preferences"' in source
    assert '"ai_provider_models"' in source


def test_incremental_catalog_migration_has_reversible_new_entries():
    source = (MIGRATIONS / "202608250002_complete_ai_model_catalog.py").read_text(encoding="utf-8")
    for model in ("gpt-4.1-mini", "text-embedding-3-small", "stable-diffusion-xl-lightning"):
        assert source.count(model) >= 2

def test_configuration_history_is_sanitized_and_reversible():
    source = (MIGRATIONS / "202608250004_ai_configuration_history.py").read_text(encoding="utf-8")
    assert '"ai_configuration_versions"' in source
    assert '"snapshot"' in source
    assert 'op.drop_table("ai_configuration_versions")' in source
    assert "secret_encrypted" not in source
    assert "api_key" not in source