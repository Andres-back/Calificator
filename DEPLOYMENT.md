# Despliegue en VPS — XCalificator

> **Proyecto de investigación** — Institución Educativa San Agustín, Mocoa, Putumayo  
> Sistema integral de apoyo académico basado en LLM

## Requisitos

- VPS Linux x86_64 con Docker Engine y Docker Compose v2.
- Dominio o IP pública configurada en `SERVER_NAME` y `TRUSTED_HOSTS`.
- HTTPS terminado por Cloudflare, Caddy, Traefik o el proxy del proveedor. En producción las cookies son `Secure`, por lo que el acceso HTTP directo no permite iniciar sesión.
- Recomendado: 4 vCPU, 8 GB RAM y 30 GB libres. Ollama y los workers de IA son los servicios más pesados.

## Primera instalación

```bash
git clone <URL_DEL_REPOSITORIO> xcalificator
cd xcalificator
cp .env.example .env
chmod 600 .env
```

Completa `.env` con secretos aleatorios y el dominio real. Las contraseñas incluidas en `DATABASE_URL` y `REDIS_URL` deben estar codificadas para URL cuando contienen caracteres reservados.

```bash
python3 scripts/preflight.py .env
sh scripts/deploy-vps.sh
```

Si un proxy HTTPS corre en el mismo VPS, configura `HTTP_BIND_ADDRESS=127.0.0.1`. Si Cloudflare conecta directamente al puerto 80, conserva `0.0.0.0` y limita el firewall a sus rangos de origen.

## Actualización

Antes de desplegar una nueva versión:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > xcalificator-$(date +%Y%m%d-%H%M).sql
git pull --ff-only
sh scripts/deploy-vps.sh
```

Las imágenes y exportaciones de presentaciones viven en `./uploads`; PostgreSQL, Redis y Ollama usan volúmenes Docker persistentes.
Configura `APP_UID` y `APP_GID` en `.env` con la salida de `id -u` e `id -g` del usuario que despliega. Backend y worker se ejecutan sin privilegios y necesitan que ese usuario sea propietario de `./uploads`.

## Operación

```bash
docker compose --profile production ps
docker compose logs backend worker nginx --tail=200
docker compose exec -T backend alembic current
curl -fsS http://127.0.0.1:${HTTP_PORT:-80}/health
```

PostgreSQL, Redis, Ollama y FastAPI solo publican puertos sobre loopback. El único acceso público del stack es Nginx.

## Rollback

1. Restaura el commit o tag anterior con Git.
2. Reconstruye con `sh scripts/deploy-vps.sh`.
3. Si la versión introdujo una migración incompatible, restaura el respaldo de PostgreSQL. No ejecutes `alembic downgrade` sin revisar primero la migración afectada.
