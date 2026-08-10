from pathlib import Path

import pytest

from app.services import storage_service


def test_resolve_upload_path_stays_inside_upload_root(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(storage_service.settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(storage_service.settings, "PUBLIC_UPLOADS_BASE_URL", "/uploads")

    resolved = storage_service.resolve_upload_path("/uploads/entregas/evidencia.jpg")

    assert resolved == (tmp_path / "entregas" / "evidencia.jpg").resolve()


@pytest.mark.parametrize(
    "url",
    [
        "/uploads/../secreto.txt",
        "/uploads/%2e%2e/secreto.txt",
        "/otro/evidencia.jpg",
    ],
)
def test_resolve_upload_path_rejects_traversal(
    monkeypatch, tmp_path: Path, url: str,
) -> None:
    monkeypatch.setattr(storage_service.settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(storage_service.settings, "PUBLIC_UPLOADS_BASE_URL", "/uploads")

    with pytest.raises(ValueError):
        storage_service.resolve_upload_path(url)
