# XCalificator

Plataforma educativa con FastAPI, PostgreSQL/pgvector, Redis, Celery, React y Vite. Incluye evaluaciones, calificación asistida por IA, herramientas docentes, presentaciones y administración de proveedores de IA.

## Desarrollo

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend alembic current
```

Frontend local:

```bash
cd frontend
npm ci
npm run dev
```

## Verificación

```bash
cd backend
python -m compileall app tests
python -m pytest tests/unit -v
python -m pytest tests/integration -v

cd ../frontend
npm ci
npm run typecheck
npm run lint:strict
npm run test:run
npm run build
npm run test:e2e
```

## VPS

El despliegue de producción construye el frontend dentro de una imagen Nginx, ejecuta Alembic antes de iniciar la API y espera healthchecks de PostgreSQL, Redis, Presenton, FastAPI, Celery y Nginx.

Consulta [DEPLOYMENT.md](./DEPLOYMENT.md). El archivo `.env`, uploads, bases de datos, logs, builds y credenciales están excluidos de Git y del contexto de Docker.
