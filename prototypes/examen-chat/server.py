#!/usr/bin/env python3
"""
Servidor del prototipo examen-chat.
- Sirve index.html y estáticos
- Proxea /api/* al backend
- Persiste conversaciones del chat en SQLite local (ligero)
Uso: python3 server.py
"""
import http.server
import urllib.request
from urllib.error import HTTPError, URLError
import json
import sqlite3
import os
import uuid
from datetime import datetime

PORT = 3099
BACKEND = "http://localhost:8000"
PROTO_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(os.path.expanduser("~"), ".hermes", "prototypes", "examen-chat.db")

# ─── SQLite setup ───
_ensure_db_dir = lambda: os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

def get_db():
    _ensure_db_dir()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            materia_id TEXT NOT NULL,
            titulo TEXT NOT NULL DEFAULT '',
            user_id TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_messages_session
        ON chat_messages(session_id)
    """)
    conn.commit()
    return conn

# ─── Session helpers ───
def list_sessions(materia_id=None, user_id=None):
    conn = get_db()
    q = "SELECT cs.*, (SELECT COUNT(*) FROM chat_messages cm WHERE cm.session_id = cs.id) as message_count FROM chat_sessions cs WHERE 1=1"
    params = []
    if materia_id:
        q += " AND cs.materia_id = ?"
        params.append(materia_id)
    if user_id:
        q += " AND cs.user_id = ?"
        params.append(user_id)
    q += " ORDER BY cs.updated_at DESC LIMIT 20"
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_session(session_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM chat_sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        conn.close()
        return None
    msgs = conn.execute(
        "SELECT role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY id ASC",
        (session_id,)
    ).fetchall()
    conn.close()
    return {**dict(row), "messages": [dict(m) for m in msgs]}

def create_session(materia_id, titulo="", user_id="", session_id=None):
    conn = get_db()
    now = datetime.utcnow().isoformat()
    if session_id:
        # Update existing session title
        conn.execute("UPDATE chat_sessions SET titulo = ?, updated_at = ? WHERE id = ?", (titulo, now, session_id))
        conn.commit()
        conn.close()
        return {"id": session_id, "materia_id": materia_id, "titulo": titulo, "updated": True}
    sid = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO chat_sessions (id, materia_id, titulo, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (sid, materia_id, titulo, user_id, now, now),
    )
    conn.commit()
    conn.close()
    return {"id": sid, "materia_id": materia_id, "titulo": titulo, "created_at": now}

def add_messages(session_id, messages):
    """messages = [{"role": "...", "content": "..."}]"""
    conn = get_db()
    now = datetime.utcnow().isoformat()
    for msg in messages:
        conn.execute(
            "INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
            (session_id, msg["role"], msg["content"], now),
        )
    conn.execute("UPDATE chat_sessions SET updated_at = ? WHERE id = ?", (now, session_id))
    conn.commit()
    conn.close()

def delete_session(session_id):
    conn = get_db()
    conn.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
    conn.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()

# ─── HTTP handler ───
def read_body(handler):
    length = int(handler.headers.get("Content-Length", 0))
    return handler.rfile.read(length) if length else b""

def json_response(handler, data, status=200):
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie")
    handler.end_headers()
    handler.wfile.write(json.dumps(data, ensure_ascii=False).encode())

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/chat/sessions"):
            self._handle_chat_get()
        elif self.path.startswith("/api"):
            self._proxy_to_backend("GET")
        elif self.path == "/":
            self.path = "/index.html"
            return http.server.SimpleHTTPRequestHandler.do_GET(self)
        else:
            return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self.path.startswith("/api/chat/sessions"):
            self._handle_chat_post()
        elif self.path.startswith("/api"):
            self._proxy_to_backend("POST")
        else:
            self.send_response(404)
            self.end_headers()

    def do_DELETE(self):
        if self.path.startswith("/api/chat/sessions"):
            self._handle_chat_delete()
        elif self.path.startswith("/api"):
            self._proxy_to_backend("DELETE")
        else:
            self.send_response(404)
            self.end_headers()

    def _handle_chat_get(self):
        path = self.path
        try:
            if path == "/api/chat/sessions" or path.startswith("/api/chat/sessions?"):
                from urllib.parse import urlparse, parse_qs
                qs = parse_qs(urlparse(path).query)
                materia_id = qs.get("materia_id", [None])[0]
                data = list_sessions(materia_id=materia_id)
                json_response(self, data)
            elif path.startswith("/api/chat/sessions/"):
                parts = path.split("/")
                # /api/chat/sessions/{id} or /api/chat/sessions/{id}/messages
                sid = parts[4] if len(parts) > 4 else None
                if not sid:
                    json_response(self, {"error": "Missing session id"}, 400)
                    return
                data = get_session(sid)
                if data:
                    json_response(self, data)
                else:
                    json_response(self, {"error": "Session not found"}, 404)
            else:
                json_response(self, {"error": "Not found"}, 404)
        except Exception as e:
            json_response(self, {"error": str(e)}, 500)

    def _handle_chat_post(self):
        path = self.path
        body = read_body(self)
        try:
            payload = json.loads(body) if body else {}
            # Create session
            if path == "/api/chat/sessions":
                materia_id = payload.get("materia_id", "")
                titulo = payload.get("titulo", "")
                user_id = payload.get("user_id", "")
                session_id = payload.get("session_id", None)
                data = create_session(materia_id, titulo, user_id, session_id)
                json_response(self, data, 201)
            # Add messages: /api/chat/sessions/{id}/messages
            elif "/messages" in path:
                parts = path.split("/")
                sid = parts[4] if len(parts) > 4 else None  # api/chat/sessions/{id}/messages
                if not sid:
                    json_response(self, {"error": "Missing session id"}, 400)
                    return
                messages = payload.get("messages", [])
                if not messages:
                    json_response(self, {"error": "No messages"}, 400)
                else:
                    add_messages(sid, messages)
                    json_response(self, {"ok": True, "count": len(messages)})
            else:
                json_response(self, {"error": "Not found"}, 404)
        except Exception as e:
            json_response(self, {"error": str(e)}, 500)

    def _handle_chat_delete(self):
        path = self.path
        try:
            if path.startswith("/api/chat/sessions/"):
                parts = path.split("/")
                sid = parts[4] if len(parts) > 4 else None
                if not sid:
                    json_response(self, {"error": "Missing session id"}, 400)
                    return
                delete_session(sid)
                json_response(self, {"ok": True})
            else:
                json_response(self, {"error": "Not found"}, 404)
        except Exception as e:
            json_response(self, {"error": str(e)}, 500)

    def _proxy_to_backend(self, method):
        url = BACKEND + self.path
        headers = {k: v for k, v in self.headers.items() if k.lower() in ("cookie", "authorization", "content-type")}
        body = read_body(self) if method in ("POST", "PUT", "PATCH") else None
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() in ("content-type", "set-cookie", "cache-control"):
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(resp.read())
        except HTTPError as e:
            self.send_response(e.code)
            for k, v in e.headers.items():
                if k.lower() in ("content-type", "set-cookie"):
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(e.read())
        except URLError as e:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(b'{"error":"Backend unreachable"}')

if __name__ == "__main__":
    os.chdir(PROTO_DIR)
    # Init DB
    get_db().close()
    server = http.server.HTTPServer(("0.0.0.0", PORT), ProxyHandler)
    print(f"🚀 Prototipo MVP en http://0.0.0.0:{PORT}")
    print(f"   Proxea /api → {BACKEND}")
    print(f"   Chats persistentes en {DB_PATH}")
    print(f"   Presiona Ctrl+C para detener")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nDetenido.")
        server.server_close()
