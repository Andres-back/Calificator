# XCalificator

Plataforma educativa con IA para docentes — crear, resolver y calificar evaluaciones y materiales didácticos.

**Stack:** FastAPI + PostgreSQL/pgvector + Redis + Celery + React/Vite  
**Principio:** *La IA sugiere. El docente decide.*

---

## Módulos principales

| Módulo | Descripción |
|---|---|
| **Evaluaciones** | Creación, publicación, resolución online/física/mixta, calificación con IA |
| **Herramientas** | 15 tipos de materiales didácticos (examen, crucigrama, flashcards, guía, etc.) |
| **Calificaciones** | Calificación por foto, modo salón, boletín, resumen académico |
| **Presentaciones** | Generación de presentaciones educativas con Presenton |
| **Xali** | Asistente IA conversacional para docentes y estudiantes |
| **Reportes** | Estadísticas por materia, promedio, rendimiento |

---

## Desarrollo

```bash
# Backend completo (Docker)
cp .env.example .env
docker compose up -d --build
docker compose exec backend alembic current

# Frontend local (Vite dev server)
cd frontend
npm ci
npm run dev
```

Si PostgreSQL nativo corre en el host, usar `POSTGRES_PORT=5433 docker compose up -d` para evitar conflicto.

---

## Verificación

```bash
# Backend
docker exec -w /app calificator-backend-1 python3 -m pytest tests/unit -v

# Frontend
cd frontend
npm run lint
npm run build
```

---

## Documentación

| Archivo | Contenido |
|---|---|
| [MANUAL_NEGOCIO.md](./MANUAL_NEGOCIO.md) | Reglas de negocio, actores, flujos |
| [GAPS.md](./GAPS.md) | Brechas vs manual, estado de implementación |
| [ESTADO_HERRAMIENTAS.md](./ESTADO_HERRAMIENTAS.md) | Estado de los 15 tipos de herramientas |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Despliegue en VPS |
| [GLOSARIO.md](./GLOSARIO.md) | Variables, endpoints, convenciones |
| [NAMING_CONVENTIONS.md](./NAMING_CONVENTIONS.md) | Convención de nombres |

---

## VPS

Ver [DEPLOYMENT.md](./DEPLOYMENT.md). `.env`, uploads, volúmenes Docker y builds están excluidos de Git y del contexto de Docker por seguridad.
