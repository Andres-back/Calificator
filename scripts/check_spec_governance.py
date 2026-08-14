"""Valida la gobernanza Spec Kit de un pull request de XCalificator."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

SPEC_DIR = re.compile(r"^specs/(?P<name>\d{3}-[a-z0-9][a-z0-9-]*)/")
ISSUE_REF = re.compile(r"(?:#|issues/)(\d+)")
PENDING_TASK = re.compile(r"^\s*- \[ \] T\d{3}\b", re.MULTILINE)
TASK = re.compile(r"^\s*- \[[ xX]\] T\d{3}\b", re.MULTILINE)
REQUIREMENT = re.compile(r"\bFR-\d{3}\b")
PLACEHOLDER = re.compile(r"\[(?:NÚMERO|FECHA|NNN-nombre|NECESITA ACLARACIÓN)\]", re.IGNORECASE)
ISSUE_LINK = re.compile(r"\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#\d+\b", re.IGNORECASE)


@dataclass(frozen=True)
class PullRequestContext:
    branch: str
    labels: frozenset[str]
    body: str


def git_changed_files(repo: Path, base: str, head: str) -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", "--diff-filter=ACMR", f"{base}...{head}"],
        cwd=repo,
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip().replace("\\", "/") for line in result.stdout.splitlines() if line.strip()]


def spec_directories(changed_files: list[str]) -> list[str]:
    return sorted({match.group("name") for path in changed_files if (match := SPEC_DIR.match(path))})


def load_pr_context(event_path: Path) -> PullRequestContext:
    payload = json.loads(event_path.read_text(encoding="utf-8"))
    pr = payload.get("pull_request") or {}
    labels = frozenset(item.get("name", "") for item in pr.get("labels", []))
    return PullRequestContext(
        branch=str((pr.get("head") or {}).get("ref") or ""),
        labels=labels,
        body=str(pr.get("body") or ""),
    )


def validate(repo: Path, changed_files: list[str], context: PullRequestContext) -> list[str]:
    errors: list[str] = []
    dirs = spec_directories(changed_files)
    if not context.branch.startswith("codex/"):
        errors.append("La rama del PR debe usar el prefijo codex/.")
    if not dirs:
        errors.append("Todo PR debe añadir o actualizar al menos un directorio specs/NNN-slug.")
        return errors
    if not ISSUE_LINK.search(context.body):
        errors.append("El cuerpo del PR debe cerrar un issue con 'Closes #N'.")

    hotfix = "hotfix" in context.labels
    if "spec-approved" not in context.labels:
        errors.append("Falta la etiqueta obligatoria spec-approved en el PR.")
    if not hotfix and "plan-approved" not in context.labels:
        errors.append("Falta la etiqueta obligatoria plan-approved en el PR.")

    index_path = repo / "specs" / "README.md"
    index = index_path.read_text(encoding="utf-8") if index_path.is_file() else ""
    for name in dirs:
        feature_dir = repo / "specs" / name
        for artifact in ("spec.md", "plan.md", "tasks.md"):
            path = feature_dir / artifact
            if not path.is_file() or not path.read_text(encoding="utf-8").strip():
                errors.append(f"{name}: falta el artefacto no vacío {artifact}.")

        spec_path = feature_dir / "spec.md"
        tasks_path = feature_dir / "tasks.md"
        requirements: set[str] = set()
        if spec_path.is_file():
            spec = spec_path.read_text(encoding="utf-8")
            if not ISSUE_REF.search(spec):
                errors.append(f"{name}: spec.md no enlaza un issue.")
            if PLACEHOLDER.search(spec):
                errors.append(f"{name}: spec.md conserva marcadores pendientes.")
            requirements = set(REQUIREMENT.findall(spec))
            if not requirements:
                errors.append(f"{name}: spec.md no contiene requisitos FR-NNN.")

        if tasks_path.is_file():
            tasks = tasks_path.read_text(encoding="utf-8")
            if not TASK.search(tasks):
                errors.append(f"{name}: tasks.md no contiene tareas TNNN.")
            if PENDING_TASK.search(tasks):
                errors.append(f"{name}: tasks.md conserva tareas pendientes.")
            missing_requirements = requirements - set(REQUIREMENT.findall(tasks))
            if missing_requirements:
                missing = ", ".join(sorted(missing_requirements))
                errors.append(f"{name}: tasks.md no cubre estos requisitos: {missing}.")
            if hotfix and not re.search(r"regresi[oó]n", tasks, re.IGNORECASE):
                errors.append(f"{name}: un hotfix debe incluir una prueba de regresión en tasks.md.")

        if name not in index:
            errors.append(f"{name}: no está registrado en specs/README.md.")
    return errors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", required=True)
    parser.add_argument("--event-path", type=Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo = args.repo_root.resolve()
    changed = git_changed_files(repo, args.base, args.head)
    context = load_pr_context(args.event_path)
    errors = validate(repo, changed, context)
    if errors:
        print("Spec governance: FAIL", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"Spec governance: PASS ({len(spec_directories(changed))} especificaciones validadas)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())