from pathlib import Path

from scripts.system_inventory.backend import extract_backend
from scripts.system_inventory.sources import SourceReader


def test_extracts_backend_endpoints_and_observable_roles(inventory_repo: Path) -> None:
    surfaces = extract_backend(SourceReader(inventory_repo))
    by_id = {item.id: item for item in surfaces}
    assert by_id["backend:GET:/demo/{item_id}"].actors == ["profesor"]
    assert "require_roles" in by_id["backend:GET:/demo/{item_id}"].authorization
    assert by_id["backend:POST:/demo"].actors == ["authenticated"]
    assert by_id["backend:GET:/demo/{item_id}"].details["registered"] is True