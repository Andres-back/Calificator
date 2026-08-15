from __future__ import annotations

import re
import re
from dataclasses import asdict, dataclass, field
from typing import Any

VALID_KINDS = {"endpoint", "frontend_route", "frontend_call", "table", "job", "integration"}
VALID_ACTORS = {"public", "authenticated", "profesor", "estudiante", "admin", "ambiguous", "system"}
VALID_SEVERITIES = {"critical", "high", "medium", "low"}


def normalize_path(value: str) -> str:
    value = value.strip().replace("\\", "/")
    if not value.startswith("/"):
        value = "/" + value
    while "//" in value:
        value = value.replace("//", "/")
    if len(value) > 1:
        value = value.rstrip("/")
    return value


def canonical_id(kind: str, signature: str, source_path: str = "") -> str:
    if kind not in VALID_KINDS:
        raise ValueError(f"Tipo de superficie desconocido: {kind}")
    if kind == "endpoint":
        method, path = signature.split(":", 1)
        return f"backend:{method.upper()}:{normalize_path(path)}"
    if kind == "frontend_route":
        route = re.sub(r"\{[^}]+\}", "{}", normalize_path(signature))
        return f"frontend:{route}"
    if kind == "frontend_call":
        method, path = signature.split(":", 1)
        return f"frontend_call:{method.upper()}:{normalize_path(path)}:{source_path.replace(chr(92), '/')}"
    return f"{kind}:{signature.strip()}"


@dataclass(slots=True)
class Surface:
    kind: str
    signature: str
    source_path: str
    source_line: int
    id: str = ""
    owner_spec: str = ""
    actors: list[str] = field(default_factory=lambda: ["ambiguous"])
    authorization: list[str] = field(default_factory=list)
    states: list[str] = field(default_factory=list)
    tests: list[dict[str, str]] = field(default_factory=list)
    coverage: str = "missing"
    consumers: list[str] = field(default_factory=list)
    details: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.source_path = self.source_path.replace("\\", "/")
        self.id = self.id or canonical_id(self.kind, self.signature, self.source_path)
        unknown = set(self.actors) - VALID_ACTORS
        if unknown:
            raise ValueError(f"Actores desconocidos para {self.id}: {sorted(unknown)}")
        self.actors = sorted(set(self.actors))
        self.authorization = sorted(set(self.authorization))
        self.states = sorted(set(self.states))
        self.consumers = sorted(set(self.consumers))
        self.tests = sorted(self.tests, key=lambda item: (item.get("test_path", ""), item.get("reference", "")))
        self.details = dict(sorted(self.details.items()))

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        return {key: data[key] for key in (
            "id", "kind", "signature", "source_path", "source_line", "owner_spec",
            "actors", "authorization", "states", "tests", "coverage", "consumers", "details"
        )}


@dataclass(slots=True)
class Finding:
    id: str
    severity: str
    category: str
    surface_ids: list[str]
    description: str
    issue_url: str = ""

    def __post_init__(self) -> None:
        if self.severity not in VALID_SEVERITIES:
            raise ValueError(f"Severidad desconocida: {self.severity}")
        self.surface_ids = sorted(set(self.surface_ids))

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)