from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import create_app


def test_uploaded_evidence_is_not_served_anonymously(tmp_path, monkeypatch) -> None:
    evidence = tmp_path / "entregas" / "evidencia.jpeg"
    evidence.parent.mkdir()
    evidence.write_bytes(b"student-evidence")
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_UPLOADS_BASE_URL", "/uploads")

    with TestClient(create_app()) as client:
        response = client.get("/uploads/entregas/evidencia.jpeg")

    assert response.status_code in {400, 404}
    assert response.content != b"student-evidence"


def test_private_original_is_not_served_anonymously(tmp_path, monkeypatch) -> None:
    original = tmp_path / ".private" / "evaluation-visuals" / "original.png"
    original.parent.mkdir(parents=True)
    original.write_bytes(b"private-original")
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    with TestClient(create_app()) as client:
        for path in ("/uploads/.private/evaluation-visuals/original.png", "/uploads/%2eprivate/evaluation-visuals/original.png"):
            response = client.get(path)
            assert response.status_code in {400, 404}
            assert response.content != b"private-original"
