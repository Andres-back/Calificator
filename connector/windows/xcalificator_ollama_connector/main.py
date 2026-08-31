from __future__ import annotations

import argparse
import ctypes
import json
import os
import socket
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from ctypes import wintypes
from pathlib import Path
from typing import Any


APP_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "XCalificatorOllamaConnector"
CREDENTIAL_FILE = APP_DIR / "connector.dat"
DEFAULT_OLLAMA_API = "http://127.0.0.1:11434/api"
POLL_SECONDS = 4
HEARTBEAT_SECONDS = 30


class ConnectorError(RuntimeError):
    pass


class DataBlob(ctypes.Structure):
    _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_byte))]


def _blob(data: bytes) -> tuple[DataBlob, Any]:
    buffer = ctypes.create_string_buffer(data)
    return DataBlob(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_byte))), buffer


def _protect(data: bytes) -> bytes:
    if sys.platform != "win32":
        raise ConnectorError("El almacenamiento seguro del conector requiere Windows")
    source, source_buffer = _blob(data)
    output = DataBlob()
    if not ctypes.windll.crypt32.CryptProtectData(
        ctypes.byref(source), "XCalificator Ollama", None, None, None, 0, ctypes.byref(output)
    ):
        raise ctypes.WinError()
    try:
        return ctypes.string_at(output.pbData, output.cbData)
    finally:
        ctypes.windll.kernel32.LocalFree(output.pbData)
        del source_buffer


def _unprotect(data: bytes) -> bytes:
    if sys.platform != "win32":
        raise ConnectorError("El almacenamiento seguro del conector requiere Windows")
    source, source_buffer = _blob(data)
    output = DataBlob()
    if not ctypes.windll.crypt32.CryptUnprotectData(
        ctypes.byref(source), None, None, None, None, 0, ctypes.byref(output)
    ):
        raise ctypes.WinError()
    try:
        return ctypes.string_at(output.pbData, output.cbData)
    finally:
        ctypes.windll.kernel32.LocalFree(output.pbData)
        del source_buffer


def save_identity(identity: dict[str, str]) -> None:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    CREDENTIAL_FILE.write_bytes(_protect(json.dumps(identity).encode("utf-8")))


def load_identity() -> dict[str, str]:
    if not CREDENTIAL_FILE.exists():
        raise ConnectorError("Este equipo aún no está vinculado")
    value = json.loads(_unprotect(CREDENTIAL_FILE.read_bytes()).decode("utf-8"))
    if not isinstance(value, dict) or not value.get("server") or not value.get("token"):
        raise ConnectorError("La identidad guardada no es válida")
    identity = {str(key): str(item) for key, item in value.items()}
    identity["ollama_api"] = _normalize_ollama_api(identity.get("ollama_api", DEFAULT_OLLAMA_API))
    return identity


def _validate_server(server: str, *, allow_http_localhost: bool = False) -> str:
    normalized = server.rstrip("/")
    if normalized.startswith("https://"):
        return normalized
    if allow_http_localhost and normalized.startswith(("http://127.0.0.1:", "http://localhost:")):
        return normalized
    raise ConnectorError("El servidor de XCalificator debe usar HTTPS")


def _normalize_ollama_api(value: str) -> str:
    """Accept only a loopback Ollama API, with an optional custom local port."""
    try:
        parsed = urllib.parse.urlsplit(value.strip())
        port = parsed.port or 11434
    except ValueError as exc:
        raise ConnectorError("La dirección de Ollama local no es válida") from exc
    hostname = (parsed.hostname or "").lower()
    if (
        parsed.scheme != "http"
        or hostname not in {"127.0.0.1", "localhost", "::1"}
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or parsed.path.rstrip("/") not in {"", "/api"}
        or not 1 <= port <= 65535
    ):
        raise ConnectorError("Ollama debe usar una dirección HTTP local de este equipo")
    rendered_host = f"[{hostname}]" if hostname == "::1" else hostname
    return f"http://{rendered_host}:{port}/api"


def request_json(
    method: str,
    url: str,
    *,
    payload: dict[str, Any] | None = None,
    token: str | None = None,
    timeout: float = 35,
) -> dict[str, Any] | None:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read()
            return json.loads(raw.decode("utf-8")) if raw else None
    except urllib.error.HTTPError as exc:
        if exc.code in {401, 403}:
            raise ConnectorError("El conector fue revocado o no está autorizado") from exc
        if exc.code == 409:
            raise ConnectorError("El código o lease ya no es válido") from exc
        raise ConnectorError(f"XCalificator respondió con estado {exc.code}") from exc
    except (urllib.error.URLError, TimeoutError, socket.timeout) as exc:
        raise ConnectorError("No fue posible conectar con el servicio") from exc


def ollama_json(
    path: str,
    payload: dict[str, Any] | None = None,
    *,
    timeout: float = 300,
    api_url: str = DEFAULT_OLLAMA_API,
) -> dict[str, Any]:
    base_url = _normalize_ollama_api(api_url)
    result = request_json("POST" if payload is not None else "GET", base_url + path, payload=payload, timeout=timeout)
    if not isinstance(result, dict):
        raise ConnectorError("Ollama local devolvió una respuesta vacía")
    return result


def discover_models(api_url: str = DEFAULT_OLLAMA_API) -> list[dict[str, Any]]:
    tags = ollama_json("/tags", timeout=15, api_url=api_url)
    result: list[dict[str, Any]] = []
    for item in tags.get("models") or []:
        if not isinstance(item, dict):
            continue
        model_id = str(item.get("model") or item.get("name") or "").strip()
        if not model_id:
            continue
        capabilities = ["text"]
        try:
            details = ollama_json("/show", {"model": model_id}, timeout=30, api_url=api_url)
            raw = {str(value).lower() for value in details.get("capabilities") or []}
            if "vision" in raw:
                capabilities.append("vision")
            if raw.intersection({"embedding", "embeddings", "embed"}):
                capabilities.append("embedding")
        except ConnectorError:
            pass
        result.append({"model_id": model_id, "capabilities": sorted(set(capabilities))})
    return result


def pair(
    server: str,
    code: str,
    name: str,
    *,
    ollama_api: str = DEFAULT_OLLAMA_API,
    allow_http_localhost: bool = False,
) -> None:
    normalized = _validate_server(server, allow_http_localhost=allow_http_localhost)
    normalized_ollama_api = _normalize_ollama_api(ollama_api)
    response = request_json(
        "POST",
        normalized + "/api/connector/pair",
        payload={"code": code, "name": name, "platform": "windows", "version": "0.1.0"},
    )
    if not response or not response.get("token") or not response.get("connector_id"):
        raise ConnectorError("XCalificator no devolvió una identidad de conector válida")
    save_identity({
        "server": normalized,
        "token": str(response["token"]),
        "connector_id": str(response["connector_id"]),
        "ollama_api": normalized_ollama_api,
    })
    print("Equipo vinculado correctamente.")


def publish_models(identity: dict[str, str]) -> None:
    models = discover_models(identity.get("ollama_api", DEFAULT_OLLAMA_API))
    request_json(
        "PUT",
        identity["server"] + "/api/connector/models",
        payload={"models": models},
        token=identity["token"],
    )
    print(f"Modelos disponibles: {len(models)}")


def _heartbeat(identity: dict[str, str], job_id: str, lease_token: str, stop: threading.Event) -> None:
    while not stop.wait(HEARTBEAT_SECONDS):
        try:
            request_json(
                "POST",
                identity["server"] + f"/api/connector/jobs/{job_id}/heartbeat",
                payload={"lease_token": lease_token},
                token=identity["token"],
            )
        except ConnectorError:
            return


def execute_job(identity: dict[str, str], job: dict[str, Any]) -> None:
    job_id = str(job["job_id"])
    lease_token = str(job["lease_token"])
    payload = dict(job.get("payload") or {})
    stop = threading.Event()
    heartbeat = threading.Thread(target=_heartbeat, args=(identity, job_id, lease_token, stop), daemon=True)
    heartbeat.start()
    try:
        operation = payload.get("operation") or "chat"
        if operation != "chat":
            raise ConnectorError("Operación local no compatible")
        ollama_payload: dict[str, Any] = {
            "model": str(job["model"]),
            "messages": payload.get("messages") or [],
            "stream": False,
        }
        if payload.get("format"):
            ollama_payload["format"] = payload["format"]
        result = ollama_json(
            "/chat",
            ollama_payload,
            timeout=3600,
            api_url=identity.get("ollama_api", DEFAULT_OLLAMA_API),
        )
        request_json(
            "POST",
            identity["server"] + f"/api/connector/jobs/{job_id}/complete",
            payload={"lease_token": lease_token, "result": result},
            token=identity["token"],
        )
    except ConnectorError as exc:
        try:
            request_json(
                "POST",
                identity["server"] + f"/api/connector/jobs/{job_id}/fail",
                payload={"lease_token": lease_token, "error_code": "local_inference_failed"},
                token=identity["token"],
            )
        except ConnectorError:
            pass
        print(f"Trabajo no completado: {exc}", file=sys.stderr)
    finally:
        stop.set()
        heartbeat.join(timeout=1)


def run() -> None:
    identity = load_identity()
    publish_models(identity)
    print("Conector activo. Puedes cerrar esta ventana para detenerlo.")
    while True:
        try:
            job = request_json(
                "POST",
                identity["server"] + "/api/connector/jobs/claim",
                payload={},
                token=identity["token"],
                timeout=40,
            )
            if job:
                execute_job(identity, job)
            else:
                time.sleep(POLL_SECONDS)
        except ConnectorError as exc:
            print(f"Esperando conexión: {exc}", file=sys.stderr)
            time.sleep(10)


def cli() -> None:
    parser = argparse.ArgumentParser(description="Conector seguro entre XCalificator y Ollama local")
    subparsers = parser.add_subparsers(dest="command", required=True)
    pair_parser = subparsers.add_parser("pair", help="Vincular este computador")
    pair_parser.add_argument("--server", required=True)
    pair_parser.add_argument("--code", required=True)
    pair_parser.add_argument("--name", default=socket.gethostname())
    pair_parser.add_argument(
        "--ollama-url",
        default=DEFAULT_OLLAMA_API,
        help="Dirección local de Ollama (por defecto http://127.0.0.1:11434)",
    )
    pair_parser.add_argument("--allow-http-localhost", action="store_true", help=argparse.SUPPRESS)
    subparsers.add_parser("run", help="Iniciar el conector")
    subparsers.add_parser("models", help="Actualizar modelos locales")
    args = parser.parse_args()
    if args.command == "pair":
        pair(
            args.server,
            args.code,
            args.name,
            ollama_api=args.ollama_url,
            allow_http_localhost=args.allow_http_localhost,
        )
    elif args.command == "models":
        publish_models(load_identity())
    else:
        run()


if __name__ == "__main__":
    try:
        cli()
    except (ConnectorError, OSError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1) from None
