from pathlib import Path


def test_production_nginx_enforces_csp_and_blocks_upload_directory() -> None:
    repository_root = Path(__file__).resolve().parents[3]
    config = (
        repository_root / "nginx" / "templates" / "default.conf.template"
    ).read_text(encoding="utf-8")

    assert "Content-Security-Policy" in config
    assert "script-src 'self'" in config
    assert "object-src 'none'" in config
    assert "frame-ancestors 'self'" in config
    assert "'unsafe-eval'" not in config
    assert "location ^~ /uploads/" in config
    assert "return 404;" in config