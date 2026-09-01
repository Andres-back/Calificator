from __future__ import annotations

import ast
from pathlib import Path

from .model import Surface, normalize_path
from .sources import SourceReader

HTTP_METHODS = {"get", "post", "put", "patch", "delete", "options", "head"}


def _string(node: ast.AST | None, default: str = "") -> str:
    return node.value if isinstance(node, ast.Constant) and isinstance(node.value, str) else default


def _name(node: ast.AST) -> str:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        prefix = _name(node.value)
        return f"{prefix}.{node.attr}" if prefix else node.attr
    if isinstance(node, ast.Call):
        return _name(node.func)
    return ""


def _roles(node: ast.AST) -> set[str]:
    found: set[str] = set()
    for child in ast.walk(node):
        if isinstance(child, ast.Attribute) and isinstance(child.value, ast.Name) and child.value.id == "UserRole":
            found.add(child.attr.lower())
        elif isinstance(child, ast.Constant) and child.value in {"profesor", "estudiante", "admin"}:
            found.add(str(child.value))
    return found


def _permission_actors(reader: SourceReader) -> dict[str, set[str]]:
    """Derive legacy actors from the canonical modular-permission catalog."""
    path = reader.root / "backend/app/modules/authorization/catalog.py"
    if not path.exists():
        return {}
    tree = ast.parse(reader.read_text(path), filename=reader.relative(path))
    role_assignments = {
        "STUDENT_DEFAULT_PERMISSIONS": "estudiante",
        "PROFESSOR_DEFAULT_PERMISSIONS": "profesor",
    }
    result: dict[str, set[str]] = {}
    for node in tree.body:
        if not isinstance(node, (ast.Assign, ast.AnnAssign)):
            continue
        targets = node.targets if isinstance(node, ast.Assign) else [node.target]
        names = {target.id for target in targets if isinstance(target, ast.Name)}
        role = next((value for name, value in role_assignments.items() if name in names), None)
        if not role:
            continue
        for child in ast.walk(node.value):
            if isinstance(child, ast.Constant) and isinstance(child.value, str) and "." in child.value:
                result.setdefault(child.value, {"admin"}).add(role)
    return result


def _permission_keys(node: ast.Call) -> set[str]:
    return {
        child.value
        for child in node.args
        if isinstance(child, ast.Constant)
        and isinstance(child.value, str)
        and "." in child.value
    }


def _authorization(
    function: ast.AsyncFunctionDef | ast.FunctionDef,
    permission_actors: dict[str, set[str]],
) -> tuple[list[str], list[str]]:
    actors: set[str] = set()
    auth: set[str] = set()
    for node in ast.walk(function):
        if not isinstance(node, ast.Call):
            continue
        name = _name(node.func).split(".")[-1]
        if name == "Depends" and node.args:
            dependency = _name(node.args[0]).split(".")[-1]
            if dependency == "get_current_user":
                auth.add("get_current_user")
                if not actors:
                    actors.add("authenticated")
            elif dependency == "require_roles" or isinstance(node.args[0], ast.Call) and _name(node.args[0].func).split(".")[-1] == "require_roles":
                auth.add("require_roles")
                actors.update(_roles(node.args[0]))
        elif name == "require_roles":
            auth.add("require_roles")
            actors.update(_roles(node))
        elif name == "require_role":
            auth.add("require_role")
            actors.update(_roles(node))
        elif name in {
            "require_permission",
            "require_permission_now",
            "require_any_permission",
            "require_any_permission_now",
        }:
            keys = _permission_keys(node)
            for key in keys:
                auth.add(f"{name}:{key}")
                actors.update(permission_actors.get(key, {"admin"}))
        elif name == "get_current_user":
            auth.add("get_current_user")
            if not actors:
                actors.add("authenticated")
    if actors - {"authenticated"}:
        actors.discard("authenticated")
    return sorted(actors or {"ambiguous"}), sorted(auth)


def _router_prefixes(tree: ast.Module) -> dict[str, str]:
    prefixes: dict[str, str] = {}
    for node in tree.body:
        if not isinstance(node, (ast.Assign, ast.AnnAssign)):
            continue
        value = node.value
        if not isinstance(value, ast.Call) or _name(value.func).split(".")[-1] != "APIRouter":
            continue
        targets = node.targets if isinstance(node, ast.Assign) else [node.target]
        prefix = next((_string(kw.value) for kw in value.keywords if kw.arg == "prefix"), "")
        for target in targets:
            if isinstance(target, ast.Name):
                prefixes[target.id] = prefix
    return prefixes



def _registered_router_sources(reader: SourceReader) -> set[str]:
    api_path = reader.root / "backend/app/api.py"
    if not api_path.exists():
        return set()
    tree = ast.parse(reader.read_text(api_path), filename="backend/app/api.py")
    aliases: dict[str, str] = {}
    included: set[str] = set()
    for node in tree.body:
        if isinstance(node, ast.ImportFrom) and node.module and node.module.endswith("router"):
            module_path = "backend/" + node.module.replace(".", "/") + ".py"
            for alias in node.names:
                aliases[alias.asname or alias.name] = module_path
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and _name(node.func).endswith("include_router") and node.args:
            alias = _name(node.args[0])
            if alias in aliases:
                included.add(aliases[alias])
    return included

def extract_backend(reader: SourceReader) -> list[Surface]:
    surfaces: list[Surface] = []
    registered_sources = _registered_router_sources(reader)
    permission_actors = _permission_actors(reader)
    for path in reader.files(("backend/app",), {".py"}):
        source_path = reader.relative(path)
        try:
            tree = ast.parse(reader.read_text(path), filename=source_path)
        except SyntaxError as exc:
            raise ValueError(f"Python inválido en {source_path}:{exc.lineno}: {exc.msg}") from exc
        prefixes = _router_prefixes(tree)
        for function in (node for node in ast.walk(tree) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))):
            for decorator in function.decorator_list:
                if not isinstance(decorator, ast.Call) or not isinstance(decorator.func, ast.Attribute):
                    continue
                method = decorator.func.attr.lower()
                router_name = _name(decorator.func.value)
                if method not in HTTP_METHODS or router_name not in prefixes and router_name != "app":
                    continue
                route = _string(decorator.args[0]) if decorator.args else ""
                full_path = normalize_path(prefixes.get(router_name, "") + route)
                actors, authorization = _authorization(function, permission_actors)
                if router_name == "app" and not authorization:
                    actors = ["public"]
                surfaces.append(Surface(
                    kind="endpoint",
                    signature=f"{method.upper()}:{full_path}",
                    source_path=source_path,
                    source_line=getattr(decorator, "lineno", function.lineno),
                    actors=actors,
                    authorization=authorization,
                    details={"function": function.name, "router": router_name, "registered": router_name == "app" or source_path in registered_sources},
                ))
    unique = {surface.id: surface for surface in surfaces}
    return [unique[key] for key in sorted(unique)]
