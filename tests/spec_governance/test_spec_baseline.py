import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ALL_SPECS = {
    "001-adopt-spec-kit",
    "002-arquitectura-roles-seguridad",
    "003-usuarios-materias-matriculas",
    "004-dba-asistencia-curriculo",
    "005-evaluaciones",
    "006-recursos-actividades",
    "007-entregas-estudiante",
    "008-calificaciones",
    "009-xali-rag-refuerzos",
    "010-presentaciones-imagenes",
    "011-reportes-analitica-impacto",
    "012-ia-jobs-produccion",
    "013-inventario-tecnico-exhaustivo",
    "014-alinear-autorizacion-superficies",
    "016-calificacion-explicable",
    "020-deepseek-vision",
    "017-decoracion-frontend",
    "018-recursos-calificacion-fluida",
    "021-configuracion-ia-docente",
}
OWNED_SPECS = {
    name
    for name in ALL_SPECS
    if name.startswith(tuple(f"{number:03d}-" for number in range(2, 13)))
    or name.startswith("021-")
}


def test_baseline_contains_exactly_nineteen_active_specs() -> None:
    found = {path.name for path in (ROOT / "specs").iterdir() if path.is_dir() and path.name[:3].isdigit()}
    assert found == ALL_SPECS


def test_each_spec_has_complete_core_artifacts_and_index_entry() -> None:
    index = (ROOT / "specs" / "README.md").read_text(encoding="utf-8")
    for name in ALL_SPECS:
        feature = ROOT / "specs" / name
        for artifact in ("spec.md", "plan.md", "tasks.md"):
            assert (feature / artifact).read_text(encoding="utf-8").strip()
        assert name in index


def test_established_baseline_specs_have_completed_tasks() -> None:
    for name in ALL_SPECS - {"013-inventario-tecnico-exhaustivo"}:
        tasks = (ROOT / "specs" / name / "tasks.md").read_text(encoding="utf-8")
        assert "- [ ] T" not in tasks


def test_active_specs_have_no_unresolved_markers() -> None:
    markers = ("[NÚMERO]", "[FECHA]", "[NNN-nombre]", "[NECESITA ACLARACIÓN]")
    for name in ALL_SPECS:
        content = (ROOT / "specs" / name / "spec.md").read_text(encoding="utf-8")
        assert not any(marker in content for marker in markers)


def test_every_requirement_is_mapped_to_a_task() -> None:
    pattern = re.compile(r"\bFR-\d{3}\b")
    for name in ALL_SPECS:
        feature = ROOT / "specs" / name
        requirements = set(pattern.findall((feature / "spec.md").read_text(encoding="utf-8")))
        task_links = set(pattern.findall((feature / "tasks.md").read_text(encoding="utf-8")))
        assert requirements
        assert requirements <= task_links


def test_inventory_ownership_is_limited_to_functional_domains() -> None:
    inventory = json.loads((ROOT / "specs/system-inventory/current.json").read_text(encoding="utf-8"))
    owners = {surface["owner_spec"] for surface in inventory["surfaces"]}
    assert owners == OWNED_SPECS
    assert "001-adopt-spec-kit" not in owners
    assert "013-inventario-tecnico-exhaustivo" not in owners


def test_each_functional_spec_links_its_generated_inventory() -> None:
    for name in OWNED_SPECS:
        spec = (ROOT / "specs" / name / "spec.md").read_text(encoding="utf-8")
        assert "./inventory.md" in spec
        assert (ROOT / "specs" / name / "inventory.md").is_file()


def test_ci_checks_inventory_drift() -> None:
    workflow = (ROOT / ".github/workflows/spec-governance.yml").read_text(encoding="utf-8")
    assert "python scripts/build_system_inventory.py --check" in workflow