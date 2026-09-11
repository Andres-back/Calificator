import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.modules.admin_ai_config.control_center_service import validate_control_center_payload
from app.modules.herramientas.tool_control_service import ensure_generation_enabled, get_tool_catalog
from app.modules.herramientas.tool_registry import TOOLS, canonical_tool_id


class _Result:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class _DB:
    def __init__(self, rows=()):
        self.rows = rows
        self.rollbacks = 0

    async def execute(self, *_args, **_kwargs):
        return _Result(self.rows)

    async def rollback(self):
        self.rollbacks += 1


def _row(tool_id, enabled, reason=None):
    mapping = {
        "tool_id": tool_id,
        "generation_enabled": enabled,
        "pause_reason": reason,
        "config_version": 3,
        "updated_at": None,
    }
    return SimpleNamespace(**mapping, _mapping=mapping)


def test_catalog_has_one_canonical_matching_tool_and_historical_alias():
    assert canonical_tool_id("emparejar") == "unir_columnas"
    matching = [tool for tool in TOOLS if tool.tool_id == "unir_columnas"]
    assert len(matching) == 1
    assert "emparejar" in matching[0].aliases


def test_paused_tool_blocks_alias_and_public_catalog_hides_admin_reason():
    db = _DB([_row("unir_columnas", False, "mantenimiento interno")])
    with pytest.raises(HTTPException) as error:
        asyncio.run(ensure_generation_enabled(db, "emparejar"))
    assert error.value.status_code == 409
    assert error.value.detail["code"] == "tool_generation_paused"
    catalog = asyncio.run(get_tool_catalog(db))
    item = next(tool for tool in catalog if tool["tool_id"] == "unir_columnas")
    assert item["generation_enabled"] is False
    assert "pause_reason" not in item


def test_pause_requires_reason_and_rejects_duplicate_alias():
    validation = validate_control_center_payload([], [], [], [
        {"tool_id": "unir_columnas", "generation_enabled": False},
        {"tool_id": "emparejar", "generation_enabled": True},
    ])
    messages = [item["message"] for item in validation["errors"]]
    assert "Indica el motivo de la pausa." in messages
    assert "Herramienta duplicada o alias repetido." in messages
