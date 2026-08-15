from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

DOMAIN_SPECS = (
    "002-arquitectura-roles-seguridad", "003-usuarios-materias-matriculas",
    "004-dba-asistencia-curriculo", "005-evaluaciones", "006-recursos-actividades",
    "007-entregas-estudiante", "008-calificaciones", "009-xali-rag-refuerzos",
    "010-presentaciones-imagenes", "011-reportes-analitica-impacto", "012-ia-jobs-produccion",
)


def json_text(inventory: dict[str, Any]) -> str:
    return json.dumps(inventory, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def domain_markdown(spec: str, inventory: dict[str, Any]) -> str:
    surfaces = [item for item in inventory["surfaces"] if item["owner_spec"] == spec]
    lines = [
        f"# Inventario técnico: {spec}", "",
        "> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.", "",
        f"**Superficies propietarias:** {len(surfaces)}", "",
        "| Tipo | Firma | Actores | Cobertura | Fuente |", "|---|---|---|---|---|",
    ]
    for item in surfaces:
        actors = ", ".join(item["actors"])
        source = f"`{item['source_path']}:{item['source_line']}`"
        lines.append(f"| {item['kind']} | `{item['signature']}` | {actors} | {item['coverage']} | {source} |")
    if not surfaces:
        lines.append("| — | Sin superficies detectadas | — | — | — |")

    explicit = [item for item in surfaces if item.get("details", {}).get("permission_override_issue")]
    lines.extend(["", "## Decisiones explícitas de permiso", ""])
    if explicit:
        for item in explicit:
            details = item["details"]
            evidence = ", ".join(f"`{path}`" for path in details["permission_override_evidence"])
            lines.append(
                f"- `{item['id']}` — {details['permission_override_reason']} "
                f"([issue]({details['permission_override_issue']})). Evidencia: {evidence}."
            )
    else:
        lines.append("Sin decisiones explícitas de permiso para este dominio.")

    findings = [finding for finding in inventory["findings"] if any(identifier in {item["id"] for item in surfaces} for identifier in finding["surface_ids"])]
    lines.extend(["", "## Hallazgos", ""])
    if findings:
        for finding in findings:
            issue = f" ([issue]({finding['issue_url']}))" if finding.get("issue_url") else ""
            lines.append(f"- **{finding['severity']} · {finding['category']}**: {finding['description']}{issue}")
    else:
        lines.append("Sin hallazgos específicos del dominio.")
    return "\n".join(lines) + "\n"


def output_contents(root: Path, inventory: dict[str, Any]) -> dict[Path, str]:
    outputs = {root / "specs/system-inventory/current.json": json_text(inventory)}
    for spec in DOMAIN_SPECS:
        outputs[root / "specs" / spec / "inventory.md"] = domain_markdown(spec, inventory)
    return outputs


def write_atomic(outputs: dict[Path, str]) -> None:
    prepared: dict[Path, Path] = {}
    originals: dict[Path, bytes | None] = {}
    try:
        for target, content in outputs.items():
            target.parent.mkdir(parents=True, exist_ok=True)
            originals[target] = target.read_bytes() if target.exists() else None
            handle, temp_name = tempfile.mkstemp(prefix=f".{target.name}.", suffix=".tmp", dir=target.parent)
            os.close(handle)
            temp_path = Path(temp_name)
            temp_path.write_text(content, encoding="utf-8", newline="\n")
            prepared[target] = temp_path
        for target in sorted(prepared, key=lambda path: path.as_posix()):
            os.replace(prepared[target], target)
    except Exception:
        for target, original in originals.items():
            if original is None:
                target.unlink(missing_ok=True)
            else:
                target.write_bytes(original)
        raise
    finally:
        for temp_path in prepared.values():
            temp_path.unlink(missing_ok=True)
