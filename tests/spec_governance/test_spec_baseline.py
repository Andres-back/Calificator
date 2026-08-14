from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPECTED = {
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
}


def test_baseline_contains_exactly_twelve_owned_specs() -> None:
    found = {path.name for path in (ROOT / "specs").iterdir() if path.is_dir() and path.name[:3].isdigit()}
    assert found == EXPECTED


def test_each_spec_has_complete_core_artifacts_and_index_entry() -> None:
    index = (ROOT / "specs" / "README.md").read_text(encoding="utf-8")
    for name in EXPECTED:
        feature = ROOT / "specs" / name
        for artifact in ("spec.md", "plan.md", "tasks.md"):
            assert (feature / artifact).read_text(encoding="utf-8").strip()
        tasks = (feature / "tasks.md").read_text(encoding="utf-8")
        assert "- [ ] T" not in tasks
        assert name in index


def test_active_specs_have_no_unresolved_markers() -> None:
    markers = ("[NÚMERO]", "[FECHA]", "[NNN-nombre]", "[NECESITA ACLARACIÓN]")
    for name in EXPECTED:
        content = (ROOT / "specs" / name / "spec.md").read_text(encoding="utf-8")
        assert not any(marker in content for marker in markers)

def test_every_requirement_is_mapped_to_a_task() -> None:
    import re

    pattern = re.compile(r"\bFR-\d{3}\b")
    for name in EXPECTED:
        feature = ROOT / "specs" / name
        requirements = set(pattern.findall((feature / "spec.md").read_text(encoding="utf-8")))
        task_links = set(pattern.findall((feature / "tasks.md").read_text(encoding="utf-8")))
        assert requirements
        assert requirements <= task_links