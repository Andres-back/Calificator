"""Single-conversion internal DOCX service. No uploads, secrets or remote URLs."""
from __future__ import annotations

import json
import os
import signal
import subprocess
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from document_archive import validate_docx

MAX_BYTES = 20 * 1024 * 1024
TIMEOUT_SECONDS = 45
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
CONVERSION_SLOT = threading.BoundedSemaphore(1)
PROFILE = b'''<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry">
<item oor:path="/org.openoffice.Office.Common/Security/Scripting">
<prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop>
</item></oor:items>'''


def convert_docx(content: bytes) -> bytes:
    if not content or len(content) > MAX_BYTES:
        raise ValueError("El Word supera el límite permitido.")
    validate_docx(content)
    with tempfile.TemporaryDirectory(prefix="xcal-render-") as directory:
        work = Path(directory)
        profile = work / "profile"
        (profile / "user").mkdir(parents=True)
        (profile / "user/registrymodifications.xcu").write_bytes(PROFILE)
        source = work / "input.docx"
        source.write_bytes(content)
        process = subprocess.Popen([
            "/usr/bin/libreoffice", "--headless", "--nologo", "--nodefault", "--norestore", "--nolockcheck",
            "-env:UserInstallation=" + profile.as_uri(), "--convert-to", "pdf:writer_pdf_Export",
            "--outdir", str(work), str(source),
        ], shell=False, start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            env={"PATH": "/usr/bin:/bin", "HOME": str(work), "TMPDIR": str(work), "LANG": "C.UTF-8"})
        try:
            process.communicate(timeout=TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired as exc:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            process.communicate()
            raise TimeoutError("La conversión tardó demasiado; vuelve a intentar con un archivo más pequeño.") from exc
        output = work / "input.pdf"
        if process.returncode != 0 or not output.is_file() or not 0 < output.stat().st_size <= MAX_BYTES:
            raise ValueError("No pudimos convertir el Word completo. Revisa el archivo o súbelo como PDF.")
        result = output.read_bytes()
        if not result.startswith(b"%PDF"):
            raise ValueError("No pudimos comprobar el PDF convertido.")
        return result


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Do not log document bytes, headers, paths or request bodies.

    def _send(self, status, content, mime="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)

    def _error(self, status, message):
        self._send(status, json.dumps({"detail": message}, ensure_ascii=False).encode())

    def do_GET(self):
        if self.path != "/health":
            self._error(404, "Ruta no disponible")
            return
        self._send(200, b'{"status":"ok"}')

    def do_POST(self):
        if self.path != "/convert":
            self._error(404, "Ruta no disponible")
            return
        if self.headers.get("Content-Type", "").split(";")[0] != DOCX_MIME:
            self._error(415, "Selecciona un documento Word DOCX")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if not 0 < length <= MAX_BYTES or self.headers.get("Transfer-Encoding"):
            self._error(413, "El Word no es válido o supera el límite permitido")
            return
        if not CONVERSION_SLOT.acquire(blocking=False):
            self._error(503, "El conversor está ocupado; conserva el trabajo y vuelve a intentarlo")
            return
        try:
            self.connection.settimeout(10)
            content = self.rfile.read(length)
            if len(content) != length:
                raise ValueError("No recibimos el archivo completo")
            result = convert_docx(content)
            self._send(200, result, "application/pdf")
        except TimeoutError:
            self._error(504, "La conversión tardó demasiado. Conservamos el trabajo para reintentar.")
        except ValueError as exc:
            self._error(422, str(exc))
        except OSError:
            self._error(503, "El conversor no está disponible; conserva el trabajo para reintentar")
        finally:
            CONVERSION_SLOT.release()


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
