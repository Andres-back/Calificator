from pathlib import Path

from scripts.system_inventory.data_jobs import extract_data_jobs
from scripts.system_inventory.sources import SourceReader


def test_extracts_tables_relations_and_jobs(inventory_repo: Path) -> None:
    surfaces = extract_data_jobs(SourceReader(inventory_repo))
    by_id = {item.id: item for item in surfaces}
    assert by_id["table:demos"].details["relationships"] == ["users.id"]
    assert by_id["table:demos"].details["active"] is True
    assert by_id["table:demos"].details["identity"] == ["id"]
    assert "backend/alembic/versions/001_demo.py" in by_id["table:demos"].details["migrations"]
    assert "cerrado" in by_id["table:demos"].states
    assert by_id["table:legacy_demos"].details["active"] is False
    job = by_id["job:tasks.demo"]
    assert job.details["bind"] is True
    assert "beat:demo-periodic" in job.details["triggers"]
    assert job.details["terminal_states"] == ["failed", "success"]
    assert "idempotency_evidence" in job.details