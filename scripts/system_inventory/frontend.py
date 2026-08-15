from __future__ import annotations

import re

from .model import Surface, normalize_path
from .sources import SourceReader

ROUTE_PATTERN = re.compile(r"\bpath\s*:\s*(['\"`])([^'\"`]+)\1")
CONFIG_ROUTE_PATTERN = re.compile(r"\b\w+\s*:\s*(?:\([^)]*\)\s*=>\s*)?(['\"`])(/(?:app|login)[^'\"`]*)\1", re.S)
CALL_PATTERN = re.compile(r"\bapi\.(get|post|put|patch|delete)(?:<[^;()]*?>)?\s*\(\s*(['\"`])(.+?)\2", re.S)
CONCAT_CALL_PATTERN = re.compile(r"\bapi\.(get|post|put|patch|delete)(?:<[^;()]*?>)?\s*\(\s*([\'\"])(.+?)\2\s*\+\s*([A-Za-z_][\w.]*)")
CONST_PATTERN = re.compile(r"\bconst\s+(\w+)\s*=\s*(['\"`])([^'\"`]+)\2")
ROLE_PATTERN = re.compile(r"(?:allow\s*=\s*\{\s*\[|allow\s*:\s*\[)([^\]]+)\]")


def _template(value: str, constants: dict[str, str]) -> str:
    for name, replacement in constants.items():
        value = value.replace("${" + name + "}", replacement)
    value = re.sub(r"\$\{([^}]+)\}", lambda match: "{" + re.sub(r"\W+", "_", match.group(1).replace("encodeURIComponent(", "").rstrip(")")).strip("_").split("_")[-1] + "}", value)
    value = value.split("?", 1)[0]
    return normalize_path(value)


def _roles_from_context(context: str, path: str) -> tuple[list[str], list[str]]:
    match = ROLE_PATTERN.search(context)
    if match:
        roles = sorted(set(re.findall(r"['\"](profesor|estudiante|admin)['\"]", match.group(1))))
        if roles:
            return roles, ["RequireRole"]
    if path in {"/", "/login"}:
        return ["public"], []
    if "/admin/" in path:
        return ["admin"], ["RequireRole"]
    if path == "/app/calificaciones/boletin" or any(token in path for token in ("/resolver", "/recursos/")):
        return ["estudiante"], ["RequireRole"]
    if re.search(r"/materias/[^/]+/(?:calificar|asistencia|dba)$", path):
        return ["admin", "profesor"], ["RequireRole"]
    if any(token in path for token in ("/herramientas", "/presentaciones", "/reportes", "/analytics", "/calificaciones/workspace")):
        return ["admin", "profesor"], ["RequireRole"]
    if path.startswith("/app"):
        return ["authenticated"], ["RequireAuth"]
    return ["ambiguous"], []



def _route_catalog(reader: SourceReader) -> dict[str, dict[str, object]]:
    config_path = reader.root / "frontend/src/config/routes.ts"
    router_path = reader.root / "frontend/src/router.tsx"
    if not router_path.exists():
        return {}
    config_text = reader.read_text(config_path) if config_path.exists() else ""
    key_paths: dict[str, str] = {}
    for match in re.finditer(r"^\s*(\w+)\s*:\s*(?:\([^)]*\)\s*=>\s*)?(['\"`])(/[^'\"`]+)\2", config_text, re.M | re.S):
        key_paths[match.group(1)] = _template(match.group(3), {})
    router_text = reader.read_text(router_path)
    lazy_modules = {match.group(1): match.group(2) for match in re.finditer(r"const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\(['\"]([^'\"]+)", router_text)}
    catalog: dict[str, dict[str, object]] = {}
    pattern = re.compile(r"\{\s*path:\s*([^,]+),\s*element:\s*(?:lazyPage\()?\s*<(\w+)", re.M)
    known_paths = sorted(set(key_paths.values()))
    for match in pattern.finditer(router_text):
        expression, component = match.group(1).strip(), match.group(2)
        route = ""
        key_match = re.fullmatch(r"routes\.(\w+)", expression)
        quoted = re.fullmatch(r"['\"]([^'\"]+)['\"]", expression)
        if key_match:
            route = key_paths.get(key_match.group(1), "")
        elif quoted:
            raw = quoted.group(1)
            if raw.startswith("/"):
                route = _template(raw, {})
            else:
                normalized_raw = re.sub(r":(\w+)", r"{\1}", raw)
                suffix = "/" + normalized_raw
                candidates = [path for path in known_paths if path.endswith(suffix)]
                if component.startswith("Materia"):
                    candidates = [path for path in candidates if "/materias/{id}/" in path] or candidates
                else:
                    candidates = [path for path in candidates if "/materias/{id}/" not in path] or candidates
                route = candidates[0] if len(candidates) == 1 else ""
        if not route:
            continue
        context = router_text[max(0, match.start()-500):min(len(router_text), match.end()+500)]
        actors, authorization = _roles_from_context(context, route)
        catalog[route] = {"view": lazy_modules.get(component, component), "component": component, "registered": True, "actors": actors, "authorization": authorization}
    for route, component in (("/app", "DashboardPage"), ("/app/materias/{id}", "MateriaVistaGeneral")):
        if component in lazy_modules:
            actors, authorization = _roles_from_context(router_text, route)
            catalog.setdefault(route, {"view": lazy_modules[component], "component": component, "registered": True, "actors": actors, "authorization": authorization})
    return catalog


def _contract_key(signature: str) -> str:
    method, path = signature.split(":", 1)
    return method.upper() + ":" + re.sub(r"\{[^}]+\}", "{}", path)


def link_frontend_contracts(frontend: list[Surface], backend: list[Surface]) -> None:
    endpoints = {_contract_key(surface.signature): surface for surface in backend if surface.kind == "endpoint"}
    for surface in frontend:
        if surface.kind != "frontend_call":
            continue
        endpoint = endpoints.get(_contract_key(surface.signature))
        candidates: list[Surface] = []
        if not endpoint:
            method, path = surface.signature.split(":", 1)
            if re.search(r"/\{[^}]+\}$", path):
                prefix = path.rsplit("/", 1)[0] + "/"
                candidates = sorted(
                    (item for item in backend if item.kind == "endpoint" and item.signature.startswith(method + ":" + prefix)
                     and "{" not in item.signature[len(method) + 1 + len(prefix):]
                     and "/" not in item.signature[len(method) + 1 + len(prefix):]),
                    key=lambda item: item.id,
                )
        surface.details["backend_contract"] = endpoint.id if endpoint else None
        surface.details["backend_contract_candidates"] = [item.id for item in candidates]
        surface.details["contract_status"] = "matched" if endpoint else "family" if candidates else "unmatched"
        surface.details = dict(sorted(surface.details.items()))

def extract_frontend(reader: SourceReader) -> list[Surface]:
    surfaces: list[Surface] = []
    route_catalog = _route_catalog(reader)
    for file_path in reader.files(("frontend/src",), {".ts", ".tsx"}):
        source_path = reader.relative(file_path)
        if ".test." in source_path or "/test/" in source_path:
            continue
        text = reader.read_text(file_path)
        constants = {match.group(1): match.group(3) for match in CONST_PATTERN.finditer(text)}
        route_matches = list(ROUTE_PATTERN.finditer(text))
        if source_path.endswith("config/routes.ts"):
            route_matches.extend(CONFIG_ROUTE_PATTERN.finditer(text))
        seen_routes: set[str] = set()
        for match in route_matches:
            raw = match.group(2)
            if not raw.startswith("/"):
                continue
            route = _template(raw, constants)
            if route in seen_routes:
                continue
            seen_routes.add(route)
            start = max(0, match.start() - 180)
            end = min(len(text), match.end() + 180)
            actors, authorization = _roles_from_context(text[start:end], route)
            route_info = route_catalog.get(route, {})
            if not route_info:
                shape = re.sub(r"\{[^}]+\}", "{}", route)
                route_info = next((info for known, info in route_catalog.items() if re.sub(r"\{[^}]+\}", "{}", known) == shape), {})
            actors = list(route_info.get("actors", actors))
            authorization = list(route_info.get("authorization", authorization))
            view_match = re.search(r"element:\s*(?:lazyPage\()?\s*<(\w+)", text[start:end])
            view = route_info.get("view") or (view_match.group(1) if view_match else "unresolved")
            surfaces.append(Surface(
                "frontend_route", route, source_path, text.count("\n", 0, match.start()) + 1,
                actors=actors, authorization=authorization,
                details={"view": view, "registered": bool(route_info) or bool(view_match)},
            ))
        for match in CALL_PATTERN.finditer(text):
            if text[match.end():].lstrip().startswith("+"):
                continue
            method = match.group(1).upper()
            path = _template(match.group(3), constants)
            actors, authorization = _roles_from_context(text[max(0, match.start()-600):match.start()], path)
            surfaces.append(Surface(
                "frontend_call", f"{method}:{path}", source_path,
                text.count("\n", 0, match.start()) + 1,
                actors=actors, authorization=authorization,
            ))
        for match in CONCAT_CALL_PATTERN.finditer(text):
            method = match.group(1).upper()
            base = _template(match.group(3), constants)
            parameter = match.group(4).split(".")[-1]
            path = normalize_path(base + "/{" + parameter + "}")
            actors, authorization = _roles_from_context(text[max(0, match.start()-600):match.start()], path)
            surfaces.append(Surface(
                "frontend_call", f"{method}:{path}", source_path,
                text.count("\n", 0, match.start()) + 1,
                actors=actors, authorization=authorization,
            ))
    unique = {surface.id: surface for surface in surfaces}
    return [unique[key] for key in sorted(unique)]