# XCalificator — Backend

> **Proyecto de investigación** — Institución Educativa San Agustín, Mocoa, Putumayo  
> Módulo backend del sistema integral de apoyo académico basado en LLM

Backend FastAPI con arquitectura modular para el sistema XCalificator. Integra modelos de lenguaje (LLM), búsqueda semántica RAG con pgvector, visión por computadora y cola de tareas Celery.

## Stack

- **Framework:** FastAPI + SQLAlchemy async + Alembic
- **Base de datos:** PostgreSQL 16 + pgvector
- **Cache / Cola:** Redis + Celery
- **IA:** LLM Router multicascada (OpenAI-compatible, Groq, Ollama)
- **Búsqueda semántica:** pgvector (cosine similarity sobre embeddings)
- **Visión por computadora:** Procesamiento de imágenes de evaluaciones

## Módulos (backend/app/modules)

| Módulo | Función |
|---|---|
| `auth/` | Autenticación con JWT en cookies httpOnly |
| `users/` | Usuarios con roles admin, profesor, estudiante |
| `materias/` | Materias, grados, código de matrícula |
| `matriculas/` | Matrícula de estudiantes |
| `evaluaciones/` | Creación, publicación, resolución, calificación |
| `herramientas/` | 15 tipos de materiales didácticos generados por IA |
| `calificaciones/` | Calificación, modo salón, boletín |
| `xali/` | Asistente IA conversacional para estudiantes y docentes |
| `rag/` | Ingesta y búsqueda semántica RAG (pgvector) |
| `dba/` | Catalogo de Derechos Básicos de Aprendizaje |
| `presentaciones/` | Generación de presentaciones educativas |
| `imagenes/` | Generación y gestión de imágenes IA |
| `reportes/` | Estadísticas y reportes académicos |
| `admin_ai_config/` | Configuración dinámica de proveedores LLM |
| `jobs/` | Tareas programadas y cola de trabajos |

## Desarrollo

```bash
cd /mnt/Calificator
docker compose up -d backend
# O local:
pip install -e backend/
uvicorn app.main:app --reload --port 8000
```

## Tests

```bash
docker exec -w /app calificator-backend-1 python3 -m pytest tests/ -v
```
