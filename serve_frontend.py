import http.server, socketserver, os, urllib.request, urllib.error

PORT = 3001
DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
BACKEND = "http://127.0.0.1:8000"

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/") or self.path.startswith("/health") or self.path.startswith("/uploads/"):
            try:
                url = BACKEND + self.path
                if self.headers.get("Cookie"):
                    req = urllib.request.Request(url, headers={"Cookie": self.headers["Cookie"]})
                else:
                    req = urllib.request.Request(url)
                resp = urllib.request.urlopen(req, timeout=10)
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() not in ("transfer-encoding", "content-encoding", "content-length"):
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(resp.read())
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.end_headers()
                self.wfile.write(e.read())
            except Exception as e:
                self.send_response(502)
                self.end_headers()
                self.wfile.write(f"Proxy error: {e}".encode())
            return
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/") or self.path.startswith("/health"):
            try:
                body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
                req = urllib.request.Request(BACKEND + self.path, data=body, headers={"Content-Type": self.headers.get("Content-Type", "application/json")})
                if self.headers.get("Cookie"):
                    req.add_header("Cookie", self.headers["Cookie"])
                if self.headers.get("Authorization"):
                    req.add_header("Authorization", self.headers["Authorization"])
                resp = urllib.request.urlopen(req, timeout=10)
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() not in ("transfer-encoding", "content-encoding"):
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(resp.read())
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.end_headers()
                self.wfile.write(e.read())
            except Exception as e:
                self.send_response(502)
                self.end_headers()
                self.wfile.write(f"Proxy error: {e}".encode())
            return
        self.send_response(405)
        self.end_headers()

    def translate_path(self, path):
        fs_path = super().translate_path(path)
        if not os.path.exists(fs_path):
            return os.path.join(DIR, "index.html")
        return fs_path

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"Serving frontend+api proxy at http://0.0.0.0:{PORT}")
        httpd.serve_forever()
