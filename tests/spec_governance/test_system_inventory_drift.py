from __future__ import annotations

import os
from pathlib import Path

import pytest

from scripts.system_inventory.render import write_atomic
from scripts.system_inventory.validate import structural_diff


def test_structural_diff_names_added_removed_and_modified_surfaces() -> None:
    current = {"surfaces": [{"id": "backend:GET:/old", "actors": ["public"]}, {"id": "table:users", "states": []}]}
    expected = {"surfaces": [{"id": "backend:GET:/new", "actors": ["profesor"]}, {"id": "table:users", "states": ["activo"]}]}
    diff = structural_diff(current, expected)
    assert diff.added == ["backend:GET:/new"]
    assert diff.removed == ["backend:GET:/old"]
    assert diff.modified == ["table:users"]
    assert "--write" in diff.message()


def test_atomic_write_restores_every_target_on_failure(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    first, second = tmp_path / "a.json", tmp_path / "b.md"
    first.write_text("old-a\n", encoding="utf-8")
    second.write_text("old-b\n", encoding="utf-8")
    original_replace = os.replace
    calls = 0

    def fail_second(source: str | os.PathLike[str], target: str | os.PathLike[str]) -> None:
        nonlocal calls
        calls += 1
        if calls == 2:
            raise OSError("fallo sintético")
        original_replace(source, target)

    monkeypatch.setattr(os, "replace", fail_second)
    with pytest.raises(OSError, match="sintético"):
        write_atomic({first: "new-a\n", second: "new-b\n"})
    assert first.read_text(encoding="utf-8") == "old-a\n"
    assert second.read_text(encoding="utf-8") == "old-b\n"
    assert not list(tmp_path.glob("*.tmp"))