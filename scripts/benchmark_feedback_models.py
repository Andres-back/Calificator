"""Comparación offline de ejecuciones medidas y referencia docente.

No invoca proveedores, lee claves ni cambia configuración. IDs deben ser
seudónimos; el informe no copia preguntas, respuestas, nombres ni evidencias.
"""
from __future__ import annotations

import argparse
from decimal import Decimal
import json
import math
from pathlib import Path
import re
import statistics
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.modules.calificaciones.breakdown_policy import calculate_formula  # noqa: E402
from app.modules.feedback_sharing.quality_policy import quality_review_record  # noqa: E402

STAGES = {"total", "queue", "extraction", "grading", "verification", "arbitration", "feedback_refinement", "persistence", "ui"}


def number(value) -> Decimal:
    if isinstance(value, bool):
        raise ValueError("Valor numérico inválido")
    result = Decimal(str(value))
    if not result.is_finite():
        raise ValueError("Los números deben ser finitos")
    return result


def identifier(value) -> str:
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_.:-]{1,80}", value):
        raise ValueError("Usa identificadores seudónimos de hasta 80 caracteres")
    return value


def compare_runs(reference: list[dict], runs: list[dict], baseline: str, candidate: str) -> dict:
    baseline, candidate = identifier(baseline), identifier(candidate)
    if baseline == candidate:
        raise ValueError("Selecciona dos configuraciones distintas")
    refs = {}
    for activity in reference:
        key = identifier(activity["id"])
        if key in refs:
            raise ValueError("Una actividad repetida no es otra referencia independiente")
        if not activity.get("points") or number(activity["max_grade"]) <= 0:
            raise ValueError("La referencia requiere escala y puntajes por pregunta")
        for point in activity["points"].values():
            if not 0 <= number(point["awarded"]) <= number(point["maximum"]) or number(point["maximum"]) <= 0:
                raise ValueError("Puntajes de referencia fuera de escala")
        refs[key] = activity
    if not refs:
        raise ValueError("Falta la referencia docente")
    results = {}
    for config in (baseline, candidate):
        rows = [row for row in runs if row["configuration"] == config]
        seen, timing, routes = set(), {}, set()
        errors = incoherent = grade_errors = ungraded = failed_quality = incidents = questions = 0
        for row in rows:
            key = row["activity_id"]
            if key in seen or key not in refs:
                raise ValueError("Ejecución duplicada o sin referencia independiente")
            seen.add(key)
            ref, observed = refs[key], row.get("points", {})
            if not isinstance(observed, dict):
                raise ValueError("Falta desglose de la ejecución")
            components, gold = [], []
            for question, point in ref["points"].items():
                questions += 1
                value = observed.get(question)
                if value is None:
                    ungraded += 1
                elif number(value) != number(point["awarded"]):
                    errors += 1
                if value is not None and not 0 <= number(value) <= number(point["maximum"]):
                    raise ValueError("La ejecución contiene puntajes fuera de escala")
                components.append({"puntos_obtenidos": value, "puntos_maximos": point["maximum"]})
                gold.append({"puntos_obtenidos": point["awarded"], "puntos_maximos": point["maximum"]})
            extras = len(set(observed) - set(ref["points"]))
            errors += extras
            complete = all(item["puntos_obtenidos"] is not None for item in components) and not extras
            expected = calculate_formula(gold, ref["max_grade"], ref.get("adjustment", 0))["nota_final"]
            proposed = row.get("grade")
            if proposed is None:
                ungraded += 1
            elif number(proposed) != expected:
                grade_errors += 1
            if not complete or proposed is None or calculate_formula(components, ref["max_grade"], ref.get("adjustment", 0))["nota_final"] != number(proposed):
                incoherent += 1
            review = row.get("quality")
            if review is None or not row.get("reviewer_id"):
                failed_quality += 1
            else:
                record = quality_review_record(review, row["reviewer_id"], row.get("severe_incidents", []))
                failed_quality += not record["passed"]
                incidents += record["severe_incident_count"]
            for stage, seconds in row.get("timings", {}).items():
                if stage not in STAGES or number(seconds) < 0:
                    raise ValueError("Etapa/tiempo de medición inválido")
                timing.setdefault(stage, []).append(float(number(seconds)))
            routing = row.get("routes", {})
            for stage, route in routing.items():
                if stage not in STAGES or set(route) - {"provider", "model", "config_version"}:
                    raise ValueError("La procedencia solo admite proveedor, modelo y versión por etapa")
                identifier(route["provider"])
                identifier(route["model"])
            routes.add(json.dumps(routing, sort_keys=True))
        latency = {stage: {"samples": len(values), "p50": statistics.median(values), "p95": sorted(values)[max(0, math.ceil(len(values) * .95) - 1)]} for stage, values in timing.items()}
        results[config] = {
            "activities": len(seen), "missing_activities": len(refs) - len(seen), "questions": questions,
            "component_errors": errors, "grade_errors": grade_errors, "incoherent_totals": incoherent,
            "ungraded_components_or_grades": ungraded, "failed_quality_reviews": failed_quality,
            "severe_incidents": incidents, "latency": latency,
            "routing_versions": [json.loads(value) for value in sorted(routes)],
            "mixed_routes": len(routes) > 1,
        }
    base, proposed = results[baseline], results[candidate]
    sufficient = len(refs) >= 20 and all(ref.get("independent_teacher_reference") is True for ref in refs.values())
    ready = sufficient and all(not results[config]["missing_activities"] and not results[config]["mixed_routes"] and results[config]["latency"].get("total", {}).get("samples", 0) == len(refs) for config in (baseline, candidate))
    ready = ready and proposed["component_errors"] <= base["component_errors"] and proposed["grade_errors"] <= base["grade_errors"] and not any(proposed[field] for field in ("incoherent_totals", "ungraded_components_or_grades", "failed_quality_reviews", "severe_incidents"))
    return {
        "reference_activities": len(refs), "configurations": results,
        "ready_for_human_decision": bool(ready), "activation_authorized": False,
        "notice": "Informe offline: no activa modelos. La referencia y valoraciones requieren validación docente; réplicas no aumentan el corpus.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--candidate", required=True)
    args = parser.parse_args()
    payload = json.loads(args.manifest.read_text(encoding="utf8"))
    print(json.dumps(compare_runs(payload["reference"], payload["runs"], args.baseline, args.candidate), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
