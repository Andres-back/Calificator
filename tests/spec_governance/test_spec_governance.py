from pathlib import Path

from scripts.check_spec_governance import PullRequestContext, validate


def create_spec(root: Path, *, pending: bool = False, regression: bool = False) -> list[str]:
    feature = root / "specs" / "123-demo"
    feature.mkdir(parents=True)
    (feature / "spec.md").write_text(
        "# Demo\n\n**Issue**: #99\n\n- **FR-001**: Demostración.\n",
        encoding="utf-8",
    )
    (feature / "plan.md").write_text("# Plan\n", encoding="utf-8")
    marker = " " if pending else "X"
    suffix = " con prueba de regresión" if regression else ""
    (feature / "tasks.md").write_text(
        f"- [{marker}] T001 Completar tarea para FR-001{suffix}\n",
        encoding="utf-8",
    )
    (root / "specs" / "README.md").write_text("123-demo\n", encoding="utf-8")
    return ["specs/123-demo/spec.md", "specs/123-demo/plan.md", "specs/123-demo/tasks.md"]


def context(*labels: str, body: str = "Closes #99") -> PullRequestContext:
    return PullRequestContext("codex/123-demo", frozenset(labels), body)


def test_feature_approved_passes(tmp_path: Path) -> None:
    changed = create_spec(tmp_path)
    assert validate(tmp_path, changed, context("spec-approved", "plan-approved")) == []


def test_missing_plan_is_rejected(tmp_path: Path) -> None:
    changed = create_spec(tmp_path)
    (tmp_path / "specs" / "123-demo" / "plan.md").unlink()
    errors = validate(tmp_path, changed, context("spec-approved", "plan-approved"))
    assert any("plan.md" in error for error in errors)


def test_pending_task_is_rejected(tmp_path: Path) -> None:
    changed = create_spec(tmp_path, pending=True)
    errors = validate(tmp_path, changed, context("spec-approved", "plan-approved"))
    assert any("tareas pendientes" in error for error in errors)


def test_hotfix_waives_plan_label_but_requires_regression(tmp_path: Path) -> None:
    changed = create_spec(tmp_path)
    errors = validate(tmp_path, changed, context("spec-approved", "hotfix"))
    assert any("regresión" in error for error in errors)
    (tmp_path / "specs" / "123-demo" / "tasks.md").write_text(
        "- [X] T001 Añadir prueba de regresión para FR-001\n",
        encoding="utf-8",
    )
    assert validate(tmp_path, changed, context("spec-approved", "hotfix")) == []


def test_pr_without_linked_issue_is_rejected(tmp_path: Path) -> None:
    changed = create_spec(tmp_path)
    errors = validate(tmp_path, changed, context("spec-approved", "plan-approved", body="Sin issue"))
    assert any("Closes #N" in error for error in errors)


def test_unmapped_requirement_is_rejected(tmp_path: Path) -> None:
    changed = create_spec(tmp_path)
    tasks = tmp_path / "specs" / "123-demo" / "tasks.md"
    tasks.write_text("- [X] T001 Completar tarea sin referencia\n", encoding="utf-8")
    errors = validate(tmp_path, changed, context("spec-approved", "plan-approved"))
    assert any("FR-001" in error for error in errors)