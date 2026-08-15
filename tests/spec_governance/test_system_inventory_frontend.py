from pathlib import Path

from scripts.system_inventory.backend import extract_backend
from scripts.system_inventory.frontend import extract_frontend, link_frontend_contracts
from scripts.system_inventory.sources import SourceReader


def test_extracts_routes_guards_and_api_calls(inventory_repo: Path) -> None:
    surfaces = extract_frontend(SourceReader(inventory_repo))
    by_id = {item.id: item for item in surfaces}
    assert by_id["frontend:/app/demo"].actors == ["profesor"]
    assert by_id["frontend:/app/demo"].details["view"] == "RequireRole"
    assert by_id["frontend:/app/demo"].details["registered"] is True
    assert by_id["frontend_call:GET:/demo/{id}:frontend/src/api.ts"].signature == "GET:/demo/{id}"
    assert by_id["frontend_call:POST:/demo:frontend/src/api.ts"].source_line > 0
    link_frontend_contracts(surfaces, extract_backend(SourceReader(inventory_repo)))
    assert by_id["frontend_call:GET:/demo/{id}:frontend/src/api.ts"].details["backend_contract"] == "backend:GET:/demo/{item_id}"