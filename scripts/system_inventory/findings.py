from __future__ import annotations

import fnmatch
import hashlib
import re
from collections import defaultdict
from typing import Any

from .model import Finding, Surface


def _finding_id(category: str, surface_ids: list[str]) -> str:
    payload = category + "\0" + "\0".join(sorted(surface_ids))
    return "F-" + hashlib.sha256(payload.encode("utf-8")).hexdigest()[:12].upper()


def _contract_key(signature: str) -> str:
    method, path = signature.split(":", 1)
    path = re.sub(r"\{[^}]+\}", "{}", path)
    return f"{method.upper()}:{path}"


def validate_exceptions(surfaces: list[Surface], exceptions: list[dict[str, Any]] | tuple[dict[str, Any], ...]) -> None:
    ids = {surface.id for surface in surfaces}
    seen: set[str] = set()
    for item in exceptions:
        if item["id"] in seen:
            raise ValueError(f"Excepción duplicada: {item['id']}")
        seen.add(item["id"])
        target = item.get("surface_id")
        pattern = item.get("pattern")
        matched = target in ids if target else any(fnmatch.fnmatch(identifier, pattern) for identifier in ids)
        if not matched:
            raise ValueError(f"Excepción {item['id']} no coincide con una superficie activa")
        if not str(item["issue_url"]).startswith("https://"):
            raise ValueError(f"Excepción {item['id']} requiere issue_url HTTPS")


def build_findings(surfaces: list[Surface]) -> list[Finding]:
    findings: list[Finding] = []
    missing_by_owner: dict[str, list[str]] = defaultdict(list)
    for surface in surfaces:
        if surface.coverage == "missing":
            missing_by_owner[surface.owner_spec].append(surface.id)
    for owner, ids in sorted(missing_by_owner.items()):
        findings.append(Finding(
            _finding_id("missing_coverage", ids), "low", "missing_coverage", ids,
            f"{len(ids)} superficies de {owner} no tienen evidencia de prueba observable.",
        ))

    backend = {_contract_key(surface.signature): surface for surface in surfaces if surface.kind == "endpoint"}
    calls: dict[str, list[Surface]] = defaultdict(list)
    for surface in surfaces:
        if surface.kind == "frontend_call":
            calls[_contract_key(surface.signature)].append(surface)
    for key in sorted(backend.keys() & calls.keys()):
        server = backend[key]
        for client in calls[key]:
            if "ambiguous" in server.actors or "ambiguous" in client.actors:
                continue
            server_roles = set(server.actors)
            client_roles = set(client.actors)
            if server_roles == client_roles or "public" in client_roles and "public" in server_roles:
                continue
            if server_roles == {"authenticated"} and client_roles <= {"admin", "profesor", "estudiante"}:
                mismatch = True
            else:
                mismatch = server_roles.isdisjoint(client_roles)
            if mismatch:
                ids = [server.id, client.id]
                findings.append(Finding(
                    _finding_id("authorization_mismatch", ids), "medium", "authorization_mismatch", ids,
                    f"Permisos observables distintos para {key}: backend={server.actors}, frontend={client.actors}.",
                ))
    orphan_ids = sorted(
        surface.id for surface in surfaces
        if surface.details.get("registered") is False
        or surface.kind == "table" and surface.details.get("active") is False
    )
    if orphan_ids:
        findings.append(Finding(
            _finding_id("orphan_candidate", orphan_ids), "low", "orphan_candidate", orphan_ids,
            f"{len(orphan_ids)} superficies no alcanzables o históricas se conservan como candidatas a retiro.",
        ))
    unmatched = sorted(surface.id for surface in surfaces if surface.kind == "frontend_call" and surface.details.get("contract_status") == "unmatched")
    if unmatched:
        findings.append(Finding(
            _finding_id("contract_mismatch", unmatched), "medium", "contract_mismatch", unmatched,
            f"{len(unmatched)} llamadas frontend no tienen endpoint backend canónico coincidente en el análisis estático.",
        ))
    return sorted(findings, key=lambda finding: finding.id)


def validate_findings(findings: list[Finding]) -> None:
    ids: set[str] = set()
    for finding in findings:
        if finding.id in ids:
            raise ValueError(f"Hallazgo duplicado: {finding.id}")
        ids.add(finding.id)
        if finding.severity in {"critical", "high"} and not finding.issue_url.startswith("https://"):
            raise ValueError(f"Hallazgo {finding.id} {finding.severity} requiere issue_url")