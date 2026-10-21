"""Contrato estático; no sustituye prueba del proxy/contendor en ejecución."""
from pathlib import Path

from app.modules.feedback_sharing.http_policy import PRIVATE_HEADERS


def test_public_json_is_not_cacheable_indexable_or_referrable():
    assert "no-store" in PRIVATE_HEADERS["Cache-Control"]
    assert PRIVATE_HEADERS["Referrer-Policy"] == "no-referrer"
    assert PRIVATE_HEADERS["X-Robots-Tag"] == "noindex, nofollow"


def test_private_spa_has_isolated_proxy_policies():
    root = Path(__file__).resolve().parents[3]
    for relative in ("frontend/nginx.conf", "nginx/templates/default.conf.template"):
        config = (root / relative).read_text(encoding="utf-8")
        section = config.split("location ~ ^/devolucion/?$ {", 1)[1].split("\n    }", 1)[0]
        assert "try_files /index.html =404" in section
        assert 'Cache-Control "private, no-store"' in section
        assert 'Referrer-Policy "no-referrer"' in section
        assert 'X-Robots-Tag "noindex, nofollow"' in section
        assert "script-src 'self';" in section
        assert "connect-src 'self';" in section
        assert "cloudflareinsights" not in section
        assert "access_log off" in section
        api = config.split("location ^~ /api/public/devolucion {", 1)[1].split("\n    }", 1)[0]
        assert "proxy_cache off" in api
        assert "access_log off" in api
        assert 'Cache-Control "private, no-store"' in api
        assert 'Referrer-Policy "no-referrer"' in api
