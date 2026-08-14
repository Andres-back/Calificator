from pathlib import Path


def test_production_nginx_enforces_csp_and_blocks_upload_directory() -> None:
    repository_root = Path(__file__).resolve().parents[3]
    config = (
        repository_root / "nginx" / "templates" / "default.conf.template"
    ).read_text(encoding="utf-8")

    assert "Content-Security-Policy" in config
    assert "script-src 'self'" in config
    assert "https://static.cloudflareinsights.com" in config
    assert "https://cloudflareinsights.com" in config
    assert "sha256-8rEbVvLbIj2nfu8eWRg/wLDgvYT9MyBYjN3Lh2QSHjY=" in config
    assert "sha256-bRN0+npVXhManCpmhgLcDwPulOk+b+c9gdWgMncQSlI=" in config
    assert "object-src 'none'" in config
    assert "frame-ancestors 'self'" in config
    assert "'unsafe-eval'" not in config
    assert "location ^~ /uploads/" in config
    assert "return 404;" in config
    assert "resolver 127.0.0.11" in config
    assert "server backend:8000 resolve;" in config
    assert "server presenton:80 resolve;" in config
    assert "http://xcalificator_backend:8000" not in config
    assert "http://xcalificator_presenton:80" not in config