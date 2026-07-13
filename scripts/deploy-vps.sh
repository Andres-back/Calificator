#!/bin/sh
set -eu

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$PROJECT_DIR"

python3 scripts/preflight.py .env
chmod 600 .env
mkdir -p uploads/presentations uploads/presenton

docker compose --profile production config --quiet
docker compose --profile production build --pull
docker compose --profile production up -d --remove-orphans --wait --wait-timeout 360

docker compose exec -T backend alembic current
docker compose ps

echo "Deployment completed. Verify the public HTTPS URL and keep port 80 behind your TLS proxy."
