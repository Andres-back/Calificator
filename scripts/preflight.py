#!/usr/bin/env python3
"""Validate deploy-time configuration without printing secret values."""
from __future__ import annotations

import os
import stat
import sys
from pathlib import Path
from urllib.parse import urlparse


PLACEHOLDER_MARKERS = ("change-me", "replace-with", "example.com", "your-")


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def is_placeholder(value: str) -> bool:
    lowered = value.lower()
    return not value or any(marker in lowered for marker in PLACEHOLDER_MARKERS)


def main() -> int:
    env_path = Path(sys.argv[1] if len(sys.argv) > 1 else ".env").resolve()
    if not env_path.is_file():
        print(f"ERROR: missing environment file: {env_path}", file=sys.stderr)
        return 1

    values = load_env(env_path)
    errors: list[str] = []
    warnings: list[str] = []

    environment = (values.get("ENV") or values.get("ENVIRONMENT") or "").lower()
    if environment != "production":
        errors.append("ENV or ENVIRONMENT must be 'production'")

    secret = values.get("SECRET_KEY") or values.get("JWT_SECRET") or ""
    if len(secret) < 32 or is_placeholder(secret):
        errors.append("SECRET_KEY/JWT_SECRET must be a random value of at least 32 characters")

    for name, minimum in (
        ("POSTGRES_PASSWORD", 16),
        ("REDIS_PASSWORD", 16),
    ):
        value = values.get(name, "")
        if len(value) < minimum or is_placeholder(value):
            errors.append(f"{name} must be a non-default value of at least {minimum} characters")

    database_url = values.get("DATABASE_URL", "")
    if is_placeholder(database_url) or urlparse(database_url).hostname != "postgres":
        errors.append("DATABASE_URL must use the internal 'postgres' service and non-default credentials")

    redis_url = urlparse(values.get("REDIS_URL", ""))
    if redis_url.hostname != "redis" or not redis_url.password:
        errors.append("REDIS_URL must use the internal 'redis' service and include its password")

    trusted_hosts = [host.strip() for host in values.get("TRUSTED_HOSTS", "").split(",") if host.strip()]
    if not trusted_hosts or "*" in trusted_hosts:
        errors.append("TRUSTED_HOSTS must explicitly list the public domain or VPS address")

    server_name = values.get("SERVER_NAME", "")
    if not server_name or server_name == "_" or is_placeholder(server_name):
        errors.append("SERVER_NAME must be the public domain or VPS address")
    elif server_name not in trusted_hosts:
        errors.append("SERVER_NAME must also be present in TRUSTED_HOSTS")

    cors_origins = [origin.strip() for origin in values.get("CORS_ORIGINS", "").split(",") if origin.strip()]
    if not cors_origins or any(not origin.startswith("https://") for origin in cors_origins):
        errors.append("CORS_ORIGINS must contain only explicit HTTPS origins in production")

    for name in ("APP_UID", "APP_GID"):
        raw_value = values.get(name, "1000")
        if not raw_value.isdigit() or int(raw_value) < 100:
            errors.append(f"{name} must be a numeric, non-privileged Linux id")

    if os.name != "nt":
        mode = stat.S_IMODE(env_path.stat().st_mode)
        if mode & 0o077:
            warnings.append(".env is readable by group/others; run chmod 600 .env")

    for warning in warnings:
        print(f"WARNING: {warning}")
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)

    if errors:
        print(f"Preflight failed with {len(errors)} configuration error(s).", file=sys.stderr)
        return 1

    print("Preflight passed: production configuration is complete and no secret values were printed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
