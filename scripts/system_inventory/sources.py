from __future__ import annotations

import hashlib
from pathlib import Path

ALLOWED_ROOTS = (
    "backend/app", "backend/alembic", "backend/tests", "frontend/src", "frontend/e2e"
)
ALLOWED_SUFFIXES = {".py", ".ts", ".tsx"}


class SourceReader:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()

    def _assert_allowed(self, path: Path) -> Path:
        resolved = path.resolve()
        try:
            relative = resolved.relative_to(self.root).as_posix()
        except ValueError as exc:
            raise ValueError(f"Ruta fuera del repositorio: {path}") from exc
        if not any(relative == prefix or relative.startswith(prefix + "/") for prefix in ALLOWED_ROOTS):
            raise ValueError(f"Ruta fuera de las raíces permitidas: {relative}")
        current = self.root
        for part in Path(relative).parts:
            current = current / part
            if current.is_symlink():
                raise ValueError(f"No se siguen enlaces simbólicos: {relative}")
        return resolved

    def read_text(self, path: Path) -> str:
        safe = self._assert_allowed(path)
        if safe.suffix not in ALLOWED_SUFFIXES:
            raise ValueError(f"Extensión no permitida: {safe.suffix}")
        return safe.read_text(encoding="utf-8")

    def files(self, prefixes: tuple[str, ...], suffixes: set[str] | None = None) -> list[Path]:
        selected: list[Path] = []
        wanted = suffixes or ALLOWED_SUFFIXES
        for prefix in prefixes:
            if prefix not in ALLOWED_ROOTS:
                raise ValueError(f"Raíz no permitida: {prefix}")
            base = self.root / prefix
            if not base.exists():
                continue
            for path in base.rglob("*"):
                if path.is_file() and path.suffix in wanted:
                    self._assert_allowed(path)
                    selected.append(path)
        return sorted(set(selected), key=lambda item: item.relative_to(self.root).as_posix())

    def relative(self, path: Path) -> str:
        return self._assert_allowed(path).relative_to(self.root).as_posix()

    def source_digest(self) -> str:
        digest = hashlib.sha256()
        for path in self.files(ALLOWED_ROOTS):
            relative = self.relative(path)
            digest.update(relative.encode("utf-8"))
            digest.update(b"\0")
            digest.update(self.read_text(path).replace("\r\n", "\n").encode("utf-8"))
            digest.update(b"\0")
        return digest.hexdigest()