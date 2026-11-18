"""Spec 204: toda tarea de IA resuelve una ruta que el panel de administración publica."""
from __future__ import annotations

import re
from pathlib import Path

from app.modules.herramientas.tool_registry import TOOLS
from app.services.ai_capability_registry import editable_runtime_features
from app.services.ai_config_service import (
    LEGACY_ROUTE_SOURCES,
    _feature_candidates,
    align_legacy_routes,
)

APP = Path(__file__).resolve().parents[2] / "app"
TASK_CALL = re.compile(r"\.generate(?:_json|_text)?\(\s*(?:task_type\s*=\s*)?\"([a-z_.]+)\"")


def panel_routes() -> set[str]:
    return editable_runtime_features() | {f"herramienta.{tool.tool_id}" for tool in TOOLS}


def tasks_in_code() -> dict[str, str]:
    found: dict[str, str] = {}
    for path in APP.rglob("*.py"):
        for task in TASK_CALL.findall(path.read_text(encoding="utf-8")):
            found.setdefault(task, path.relative_to(APP).as_posix())
    return found


def test_toda_tarea_de_texto_del_codigo_resuelve_una_ruta_del_panel():
    tasks = tasks_in_code()
    assert len(tasks) >= 15, "la búsqueda de tareas dejó de encontrar las llamadas"

    routes = panel_routes()
    without_route = {
        task: where for task, where in tasks.items() if not routes.intersection(_feature_candidates(task))
    }

    assert without_route == {}, (
        "Estas tareas no pasan por el panel de IA. Dales una etapa en ai_capability_registry "
        f"o un alias en _feature_candidates: {without_route}"
    )


def test_la_etapa_del_panel_va_antes_que_la_ruta_antigua():
    for task, stage, legacy in (
        ("grading_photo", "calificacion.valoracion", "calificacion_foto"),
        ("grading_text", "calificacion.valoracion", "calificacion_texto"),
        ("presentacion", "presentaciones.contenido", "presentaciones"),
    ):
        candidates = _feature_candidates(task)
        assert candidates.index(stage) < candidates.index(legacy)


def test_las_etapas_siguen_heredando_de_su_ruta_antigua_si_falta_la_propia():
    assert _feature_candidates("calificacion.valoracion")[:2] == ("calificacion.valoracion", "calificacion_texto")
    assert _feature_candidates("presentaciones.contenido")[:2] == ("presentaciones.contenido", "presentaciones")


def route(feature: str, provider: str, model: str | None, **extra: object) -> dict:
    return {
        "feature": feature, "label": feature, "capability": "text", "primary_provider": provider,
        "primary_model": model, "fallback_provider": None, "fallback_model": None, "active": True, **extra,
    }


def test_al_guardar_la_ruta_antigua_queda_igual_a_su_etapa():
    features = [
        route("calificacion_texto", "open_code", "modelo-retirado", label="Calificación de texto", rollout_enabled=True),
        route("calificacion.valoracion", "api_propia", "claude-sonnet-5-5", fallback_provider="open_code", fallback_model="gpt-6-luna"),
        route("presentaciones", "open_code", "modelo-retirado", fallback_provider="groq", active=False),
        route("presentaciones.contenido", "open_code", "claude-haiku-5-5", fallback_provider="open_code", fallback_model="gpt-6-luna"),
        route("xali", "open_code", "gpt-6-luna"),
    ]

    aligned = {item["feature"]: item for item in align_legacy_routes(features)}

    legacy = aligned["calificacion_texto"]
    assert (legacy["primary_provider"], legacy["primary_model"]) == ("api_propia", "claude-sonnet-5-5")
    assert (legacy["fallback_provider"], legacy["fallback_model"]) == ("open_code", "gpt-6-luna")
    assert legacy["label"] == "Calificación de texto" and legacy["rollout_enabled"] is True
    presentations = aligned["presentaciones"]
    assert (presentations["primary_model"], presentations["fallback_model"], presentations["active"]) == (
        "claude-haiku-5-5", "gpt-6-luna", True,
    )
    assert aligned["xali"] == features[4]
    assert [item["feature"] for item in align_legacy_routes(features)] == [item["feature"] for item in features]


def test_una_ruta_antigua_sin_su_etapa_se_conserva():
    features = [route("evaluacion_digitalizar", "open_code", "modelo-propio")]

    assert align_legacy_routes(features) == features


def test_cada_ruta_antigua_apunta_a_una_etapa_editable():
    assert set(LEGACY_ROUTE_SOURCES.values()) <= editable_runtime_features()
    for legacy, stage in LEGACY_ROUTE_SOURCES.items():
        assert legacy in _feature_candidates(stage)
