"""Spec 161: reconstruir una imagen no debe cambiar la versión de kombu."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_kombu_is_pinned_with_redis_and_celery() -> None:
    lines = (ROOT / "backend/requirements.txt").read_text(encoding="utf-8").splitlines()
    for prefix in ("kombu==", "redis==", "celery[redis]=="):
        assert any(line.startswith(prefix) for line in lines), prefix
