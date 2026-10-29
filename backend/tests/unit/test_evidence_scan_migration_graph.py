"""The scanner must be installable after the current pilot's reading migration."""
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory


def test_scan_and_reading_have_one_head_without_rewriting_existing_revisions():
    root = Path(__file__).resolve().parents[2]
    config = Config()
    config.set_main_option("script_location", str(root / "alembic"))
    scripts = ScriptDirectory.from_config(config)
    assert len(scripts.get_heads()) == 1
    merge = scripts.get_revision("202610290001")
    assert set(merge.down_revision) == {"202610270001", "202610280001"}
    # Include the other branch, as Alembic's upgrade planner does at a merge.
    from_reading = {item.revision for item in scripts.iterate_revisions("head", "202610280001", implicit_base=True)}
    from_scanner = {item.revision for item in scripts.iterate_revisions("head", "202610270001", implicit_base=True)}
    assert {"202610290001", "202610270001"} <= from_reading
    assert {"202610290001", "202610280001"} <= from_scanner


def test_merge_marker_has_no_schema_or_data_operations():
    root = Path(__file__).resolve().parents[2]
    config = Config()
    config.set_main_option("script_location", str(root / "alembic"))
    revision = ScriptDirectory.from_config(config).get_revision("202610290001")
    assert revision.module.upgrade() is None
    assert revision.module.downgrade() is None
