from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from http.cookiejar import CookieJar
from typing import Any


ROOT_URL = os.getenv("ROOT_URL", "http://localhost:8000").rstrip("/")
API_URL = os.getenv("API_URL", f"{ROOT_URL}/api").rstrip("/")
TIMEOUT_SECONDS = int(os.getenv("SMOKE_TIMEOUT_SECONDS", "240"))


cookie_jar = CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
ACCESS_TOKEN: str | None = None


def request(method: str, url: str, payload: dict[str, Any] | None = None) -> tuple[int, Any]:
    body = None
    headers = {"Accept": "application/json"}
    if ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {ACCESS_TOKEN}"
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with opener.open(req, timeout=TIMEOUT_SECONDS) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            parsed: Any = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            parsed = raw
        return exc.code, parsed


def assert_keys(data: dict[str, Any], keys: list[str]) -> list[str]:
    return [key for key in keys if key not in data]


def _norm(word: str) -> str:
    import unicodedata

    word = (word or "").replace("ñ", "\x01").replace("Ñ", "\x02").upper()
    word = "".join(c for c in unicodedata.normalize("NFD", word) if unicodedata.category(c) != "Mn")
    word = word.replace("\x01", "Ñ").replace("\x02", "Ñ")
    return "".join(c for c in word if c.isalpha())


def deep_validate(endpoint: str, content: dict[str, Any]) -> list[str]:
    """Valida la geometría real del puzzle generado (no solo las llaves)."""
    problems: list[str] = []

    if endpoint.endswith("/sopa-letras"):
        grid = content.get("grilla") or content.get("sopa_letras", {}).get("grid")
        if not grid:
            return ["sin grilla"]
        n_rows, n_cols = len(grid), len(grid[0])
        if any(not cell for row in grid for cell in row):
            problems.append("grilla con celdas vacias")
        for p in content.get("palabras", []):
            w = _norm(p.get("palabra", ""))
            r, c = p.get("fila"), p.get("col")
            steps = len(w) - 1
            dr = 0 if steps <= 0 else (p.get("fila_fin", r) - r) // steps
            dc = 0 if steps <= 0 else (p.get("col_fin", c) - c) // steps
            ok = all(
                0 <= r + dr * i < n_rows and 0 <= c + dc * i < n_cols and grid[r + dr * i][c + dc * i] == w[i]
                for i in range(len(w))
            )
            if not ok:
                problems.append(f"palabra '{w}' no coincide en la grilla")

    elif endpoint.endswith("/crucigrama"):
        cru = content.get("crucigrama", {})
        grid = cru.get("grid")
        if not grid:
            return ["sin grilla"]
        n_rows, n_cols = len(grid), len(grid[0])
        for item in content.get("preguntas_horizontales", []):
            r, c, w = item.get("fila"), item.get("columna"), _norm(item.get("respuesta", ""))
            if not all(0 <= c + i < n_cols and grid[r][c + i] == w[i] for i in range(len(w))):
                problems.append(f"H '{w}' no coincide")
        for item in content.get("preguntas_verticales", []):
            r, c, w = item.get("fila"), item.get("columna"), _norm(item.get("respuesta", ""))
            if not all(0 <= r + i < n_rows and grid[r + i][c] == w[i] for i in range(len(w))):
                problems.append(f"V '{w}' no coincide")
        if not content.get("preguntas_horizontales") and not content.get("preguntas_verticales"):
            problems.append("crucigrama sin palabras ubicadas")

    elif endpoint.endswith(("/unir-columnas", "/emparejar")):
        izq = {x["numero"]: x["texto"] for x in content.get("columna_izquierda", [])}
        der = {x["letra"]: x["texto"] for x in content.get("columna_derecha", [])}
        pares = {p["izquierda"]: p["derecha"] for p in content.get("pares", [])}
        sols = content.get("soluciones", [])
        if not sols:
            return ["sin soluciones"]
        for sol in sols:
            a = izq.get(sol.get("numero"))
            b = der.get(sol.get("letra"))
            if a is None or b is None or pares.get(a) != b:
                problems.append(f"solucion invalida num={sol.get('numero')} letra={sol.get('letra')}")

    return problems


def validate_material(endpoint: str, status: int, data: Any, expected_keys: list[str]) -> dict[str, Any]:
    row: dict[str, Any] = {
        "endpoint": endpoint,
        "status": status,
        "ok": False,
        "material_id": None,
        "tipo": None,
        "missing": [],
        "error": None,
    }
    if status != 201:
        row["error"] = data
        return row
    if not isinstance(data, dict):
        row["error"] = "response_not_object"
        return row
    row["material_id"] = data.get("id")
    row["tipo"] = data.get("tipo")
    content = data.get("contenido_json")
    if not isinstance(content, dict):
        row["error"] = "contenido_json_not_object"
        return row
    if content.get("error"):
        row["error"] = content
        return row
    missing = assert_keys(content, expected_keys)
    row["missing"] = missing
    deep_problems = deep_validate(endpoint, content)
    row["deep_problems"] = deep_problems
    row["ok"] = not missing and not deep_problems and bool(row["material_id"])
    if not row["ok"] and not row["error"]:
        row["error"] = "missing_required_output" if missing else "deep_validation_failed"
    return row


def main() -> int:
    global ACCESS_TOKEN
    report: dict[str, Any] = {
        "root_url": ROOT_URL,
        "api_url": API_URL,
        "checks": [],
        "tools": [],
    }

    health_status, health_data = request("GET", f"{ROOT_URL}/health")
    report["checks"].append({"name": "health", "status": health_status, "data": health_data})

    openapi_status, openapi_data = request("GET", f"{API_URL}/openapi.json")
    paths = openapi_data.get("paths", {}) if isinstance(openapi_data, dict) else {}
    report["checks"].append(
        {
            "name": "openapi",
            "status": openapi_status,
            "path_count": len(paths),
            "herramientas_paths": sorted(path for path in paths if "/herramientas/" in path),
        }
    )

    suffix = int(time.time())
    register_payload = {
        "nombre": "Smoke Profesor Herramientas",
        "email": f"smoke.profesor.{suffix}@example.com",
        "password": "TestPass123!",
        "rol": "profesor",
    }
    register_status, register_data = request("POST", f"{API_URL}/auth/register", register_payload)
    ACCESS_TOKEN = next((cookie.value for cookie in cookie_jar if cookie.name == "access_token"), None)
    report["checks"].append(
        {
            "name": "auth_register_profesor",
            "status": register_status,
            "detail": register_data if register_status != 201 else None,
            "access_token_cookie": bool(ACCESS_TOKEN),
        }
    )

    me_status, me_data = request("GET", f"{API_URL}/auth/me")
    report["checks"].append({"name": "auth_me", "status": me_status, "user": me_data.get("user") if isinstance(me_data, dict) else None})

    dba_status, dba_data = request(
        "GET",
        f"{API_URL}/dba?area=Ciencias%20Naturales%20y%20Educacion%20Ambiental&grado=1",
    )
    report["checks"].append(
        {
            "name": "dba_list_grado_1",
            "status": dba_status,
            "count": len(dba_data) if isinstance(dba_data, list) else None,
        }
    )

    common = {
        "grado": "3",
        "area": "Ciencias Naturales y Educacion Ambiental",
        "tema": "La luz y los materiales",
        "instrucciones_adicionales": "Alinear con DBA de primaria y usar lenguaje claro.",
    }
    cases = [
        (
            "/herramientas/sopa-letras",
            {
                **common,
                "titulo": "Sopa de letras sobre la luz",
                "palabras_clave": ["LUZ", "SOMBRA", "OPACO", "ESPEJO", "VIDRIO"],
                "tamanio_grilla": 10,
            },
            ["titulo", "instrucciones", "grilla", "palabras", "banco_palabras"],
        ),
        (
            "/herramientas/crucigrama",
            {**common, "titulo": "Crucigrama de materiales", "cantidad_preguntas": 5},
            ["titulo", "instrucciones", "preguntas_horizontales", "preguntas_verticales"],
        ),
        (
            "/herramientas/unir-columnas",
            {**common, "titulo": "Unir columnas: materiales y la luz", "cantidad_pares": 5},
            ["titulo", "instrucciones", "columna_izquierda", "columna_derecha", "soluciones", "pares"],
        ),
        (
            "/herramientas/emparejar",
            {**common, "titulo": "Emparejar materiales con su comportamiento", "cantidad_pares": 5},
            ["titulo", "instrucciones", "columna_izquierda", "columna_derecha", "soluciones", "pares"],
        ),
        (
            "/herramientas/cuento",
            {**common, "titulo": "Cuento de una linterna", "personajes": ["Lina", "Tomas"], "longitud": "corto"},
            ["titulo", "personajes", "parrafos", "moraleja", "preguntas_comprension"],
        ),
        (
            "/herramientas/guia",
            {
                **common,
                "titulo": "Guia sobre propagacion de la luz",
                "objetivos": ["Reconocer materiales opacos, transparentes y translucidos"],
                "cantidad_actividades": 2,
            },
            ["titulo", "objetivos", "introduccion", "secciones", "evaluacion_formativa"],
        ),
        (
            "/herramientas/taller",
            {**common, "titulo": "Taller de sombras", "cantidad_puntos": 2},
            ["titulo", "objetivo", "puntos"],
        ),
        (
            "/herramientas/examen",
            {
                **common,
                "titulo": "Examen corto de luz",
                "cantidad_preguntas": 3,
                "tipos_pregunta": ["opcion_multiple", "abierta"],
            },
            ["titulo", "instrucciones", "preguntas", "total_puntaje"],
        ),
        (
            "/herramientas/rubrica",
            {
                **common,
                "titulo": "Rubrica experimento de luz",
                "criterios": ["Observacion", "Explicacion", "Registro"],
                "escala": ["Excelente", "Bueno", "Regular", "Insuficiente"],
            },
            ["titulo", "escala", "criterios"],
        ),
        (
            "/herramientas/plan-refuerzo",
            {
                **common,
                "titulo": "Plan de refuerzo luz y sombra",
                "nombre_estudiante": "Estudiante Smoke",
                "dificultades": ["Diferencia entre opaco y translucido"],
                "calificacion_actual": 3.1,
            },
            ["estudiante", "objetivo_general", "semanas", "estrategias_apoyo", "indicadores_mejora"],
        ),
    ]

    for endpoint, payload, expected_keys in cases:
        status, data = request("POST", f"{API_URL}{endpoint}", payload)
        report["tools"].append(validate_material(endpoint, status, data, expected_keys))

    ok_checks = (
        health_status == 200
        and openapi_status == 200
        and register_status == 201
        and me_status == 200
        and dba_status == 200
        and isinstance(dba_data, list)
        and len(dba_data) >= 4
    )
    ok_tools = all(row["ok"] for row in report["tools"])
    report["ok"] = ok_checks and ok_tools
    print(json.dumps(report, indent=2, ensure_ascii=False, default=str))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
