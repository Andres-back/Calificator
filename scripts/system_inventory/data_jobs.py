from __future__ import annotations

import ast
import re
from collections import defaultdict
from pathlib import Path

from .model import Surface
from .sources import SourceReader

INTEGRATIONS = {
    "celery": ("celery", "backend/app/workers"),
    "redis": ("redis", "backend/app"),
    "openai": ("openai", "backend/app/services"),
    "groq": ("groq", "backend/app/services"),
    "opencode": ("open_code", "backend/app"),
    "ollama": ("ollama", "backend/app/services"),
    "cloudflare": ("cloudflare", "backend/app"),
}


def _name(node: ast.AST) -> str:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return f"{_name(node.value)}.{node.attr}".strip(".")
    if isinstance(node, ast.Call):
        return _name(node.func)
    return ""


def _string(node: ast.AST | None) -> str:
    return node.value if isinstance(node, ast.Constant) and isinstance(node.value, str) else ""


def _truthy(node: ast.AST | None) -> bool:
    return isinstance(node, ast.Constant) and node.value is True


def _enum_values(reader: SourceReader) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for path in reader.files(("backend/app",), {".py"}):
        tree = ast.parse(reader.read_text(path), filename=reader.relative(path))
        for node in tree.body:
            if not isinstance(node, ast.ClassDef) or not any(_name(base).endswith(("Enum", "StrEnum")) for base in node.bases):
                continue
            values = [_string(statement.value) for statement in node.body if isinstance(statement, ast.Assign) and _string(statement.value)]
            if values:
                result[node.name] = sorted(set(values))
    return result


def _migration_tables(reader: SourceReader) -> dict[str, list[tuple[str, int]]]:
    tables: dict[str, list[tuple[str, int]]] = defaultdict(list)
    pattern = re.compile(r"op\.create_table\(\s*['\"]([^'\"]+)['\"]")
    for path in reader.files(("backend/alembic",), {".py"}):
        source_path = reader.relative(path)
        text = reader.read_text(path)
        for match in pattern.finditer(text):
            tables[match.group(1)].append((source_path, text.count("\n", 0, match.start()) + 1))
    return tables


def _column_call(statement: ast.stmt) -> tuple[str, ast.Call] | None:
    if isinstance(statement, ast.AnnAssign) and isinstance(statement.target, ast.Name) and isinstance(statement.value, ast.Call):
        if _name(statement.value.func).split(".")[-1] == "mapped_column":
            return statement.target.id, statement.value
    if isinstance(statement, ast.Assign) and len(statement.targets) == 1 and isinstance(statement.targets[0], ast.Name) and isinstance(statement.value, ast.Call):
        if _name(statement.value.func).split(".")[-1] == "mapped_column":
            return statement.targets[0].id, statement.value
    return None


def _table_surface(source_path: str, node: ast.ClassDef, enums: dict[str, list[str]], migrations: dict[str, list[tuple[str, int]]]) -> Surface | None:
    table_name = ""
    relationships: set[str] = set()
    states: set[str] = set()
    constraints: set[str] = set()
    identity: set[str] = set()
    unique: set[str] = set()
    indexes: set[str] = set()
    enum_refs: set[str] = set()
    for statement in node.body:
        targets = statement.targets if isinstance(statement, ast.Assign) else [statement.target] if isinstance(statement, ast.AnnAssign) else []
        if any(isinstance(target, ast.Name) and target.id == "__tablename__" for target in targets):
            table_name = _string(statement.value)
        column = _column_call(statement)
        if column:
            field_name, call = column
            for keyword in call.keywords:
                if keyword.arg == "primary_key" and _truthy(keyword.value):
                    identity.add(field_name)
                elif keyword.arg == "unique" and _truthy(keyword.value):
                    unique.add(field_name)
                elif keyword.arg == "index" and _truthy(keyword.value):
                    indexes.add(field_name)
                elif keyword.arg in {"default", "server_default"}:
                    reference = _name(keyword.value).split(".")[0]
                    if reference in enums:
                        enum_refs.add(reference)
    for child in ast.walk(node):
        if not isinstance(child, ast.Call):
            continue
        call_name = _name(child.func).split(".")[-1]
        if call_name == "ForeignKey" and child.args:
            value = _string(child.args[0])
            if value:
                relationships.add(value)
        elif call_name == "CheckConstraint" and child.args:
            expression = _string(child.args[0])
            if expression:
                constraints.add(expression)
                states.update(re.findall(r"'([^']+)'", expression))
        elif call_name in {"UniqueConstraint", "Index"}:
            values = [_string(arg) or _name(arg).split(".")[-1] for arg in child.args]
            values = [value for value in values if value]
            if call_name == "UniqueConstraint":
                unique.update(values)
            elif len(values) > 1:
                indexes.update(values[1:])
    if not table_name:
        return None
    for enum_name in enum_refs:
        states.update(enums[enum_name])
    return Surface(
        "table", table_name, source_path, node.lineno, actors=["system"], states=sorted(states),
        details={
            "class": node.name,
            "active": True,
            "historical_only": False,
            "identity": sorted(identity),
            "unique": sorted(unique),
            "indexes": sorted(indexes),
            "relationships": sorted(relationships),
            "constraints": sorted(constraints),
            "enum_refs": sorted(enum_refs),
            "migrations": sorted(path for path, _line in migrations.get(table_name, [])),
        },
    )


def _beat_triggers(reader: SourceReader) -> dict[str, list[str]]:
    triggers: dict[str, list[str]] = defaultdict(list)
    for path in reader.files(("backend/app",), {".py"}):
        if "worker" not in path.name.lower():
            continue
        tree = ast.parse(reader.read_text(path), filename=reader.relative(path))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Dict):
                continue
            for key_node, value_node in zip(node.keys, node.values):
                key = _string(key_node)
                if not key or not isinstance(value_node, ast.Dict):
                    continue
                values = {_string(inner_key): inner_value for inner_key, inner_value in zip(value_node.keys, value_node.values) if _string(inner_key)}
                task_name = _string(values.get("task"))
                if task_name:
                    triggers[task_name].append(f"beat:{key}")
    return triggers


def _job_surface(source: str, text: str, function: ast.FunctionDef | ast.AsyncFunctionDef, terminal_states: list[str], triggers: dict[str, list[str]]) -> Surface | None:
    for decorator in function.decorator_list:
        if not isinstance(decorator, ast.Call) or not _name(decorator.func).endswith(".task"):
            continue
        task_name = next((_string(keyword.value) for keyword in decorator.keywords if keyword.arg == "name"), "") or function.name
        bind = next((_truthy(keyword.value) for keyword in decorator.keywords if keyword.arg == "bind"), False)
        function_text = ast.get_source_segment(text, function) or ""
        retry_policy: list[str] = []
        for keyword in decorator.keywords:
            if keyword.arg in {"autoretry_for", "retry_kwargs", "max_retries", "default_retry_delay"}:
                retry_policy.append(keyword.arg)
        if re.search(r"\b(?:self\.)?retry\s*\(", function_text):
            retry_policy.append("explicit_retry")
        idempotency: list[str] = []
        lower = function_text.lower()
        if "idempot" in lower:
            idempotency.append("explicit_marker")
        if any(token in lower for token in ("get_or_create", "on_conflict", "deduplic", "existing_job", "existing_result")):
            idempotency.append("deduplication_check")
        effects: list[str] = []
        if any(token in lower for token in (".commit(", ".flush(", "session.add", "db.add")):
            effects.append("database_write")
        if any(token in lower for token in ("write_text", "write_bytes", "storage", "upload")):
            effects.append("file_or_object_write")
        if any(token in lower for token in ("llm", "openai", "vision", "generate_image")):
            effects.append("external_ai_call")
        return Surface(
            "job", task_name, source, decorator.lineno, actors=["system"],
            states=sorted(set(terminal_states)),
            details={
                "function": function.name,
                "bind": bind,
                "triggers": sorted(set(["celery_queue", *triggers.get(task_name, [])])),
                "terminal_states": sorted(set(terminal_states)),
                "retry_policy": sorted(set(retry_policy)) or ["not_observed"],
                "effects": sorted(set(effects)) or ["not_observed"],
                "idempotency_evidence": sorted(set(idempotency)) or ["not_observed"],
            },
        )
    return None


def extract_data_jobs(reader: SourceReader) -> list[Surface]:
    surfaces: list[Surface] = []
    app_files = reader.files(("backend/app",), {".py"})
    enums = _enum_values(reader)
    migrations = _migration_tables(reader)
    triggers = _beat_triggers(reader)
    terminal_states = [value for value in enums.get("JobEstado", []) if value in {"success", "failed", "cancelled"}]
    active_tables: set[str] = set()
    for path in app_files:
        source_path = reader.relative(path)
        text = reader.read_text(path)
        try:
            tree = ast.parse(text, filename=source_path)
        except SyntaxError as exc:
            raise ValueError(f"Python inválido en {source_path}:{exc.lineno}: {exc.msg}") from exc
        for node in (item for item in ast.walk(tree) if isinstance(item, ast.ClassDef)):
            surface = _table_surface(source_path, node, enums, migrations)
            if surface:
                active_tables.add(surface.signature)
                surfaces.append(surface)
        for node in (item for item in ast.walk(tree) if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))):
            surface = _job_surface(source_path, text, node, terminal_states, triggers)
            if surface:
                surfaces.append(surface)
    for table_name, occurrences in sorted(migrations.items()):
        if table_name in active_tables:
            continue
        source_path, line = sorted(occurrences)[-1]
        surfaces.append(Surface(
            "table", table_name, source_path, line, actors=["system"],
            details={
                "class": "migration_only", "active": False, "historical_only": True,
                "identity": [], "unique": [], "indexes": [], "relationships": [],
                "constraints": [], "enum_refs": [],
                "migrations": sorted(path for path, _line in occurrences),
            },
        ))
    combined = "\n".join(reader.read_text(path).lower() for path in app_files)
    for token, (name, source_hint) in INTEGRATIONS.items():
        if token not in combined:
            continue
        source = next((reader.relative(path) for path in app_files if source_hint in reader.relative(path) and token in reader.read_text(path).lower()), "backend/app")
        surfaces.append(Surface("integration", name, source, 1, actors=["system"], details={"detected_token": token}))
    unique = {surface.id: surface for surface in surfaces}
    return [unique[key] for key in sorted(unique)]