# XCalificator — Software Integral de Apoyo Académico basado en LLM

**Institución Educativa San Agustín — Mocoa, Putumayo**  
*Sistema de gestión docente, evaluación asistida por IA y generación de contenido pedagógico*

---

## 📌 Objetivo General

Evaluar el impacto de la implementación de un software integral de apoyo académico basado en modelos de lenguaje (LLM) en la eficiencia de la gestión docente y el proceso evaluativo en la Institución Educativa San Agustín del municipio de Mocoa, Putumayo.

---

## 🎯 Objetivos Específicos

1. **Analizar** la literatura relacionada con el uso de software educativo y modelos de lenguaje (LLM) en procesos de evaluación y gestión académica.

2. **Diseñar** la arquitectura y los componentes funcionales del sistema XCalificator, definiendo los flujos de generación de contenido, calificación asistida, retroalimentación y gestión académica.

3. **Desarrollar** el sistema XCalificator como una aplicación web que integre modelos de lenguaje (LLM), técnicas RAG y OCR, para la generación de actividades, procesamiento de evaluaciones y registro académico.

4. **Implementar** el sistema en un entorno piloto en la Institución Educativa San Agustín, permitiendo su uso por parte de docentes en actividades reales de evaluación.

5. **Evaluar** el impacto del sistema en la eficiencia del proceso evaluativo de los docentes.

---

## 🏗️ Arquitectura

| Componente | Tecnología |
|---|---|
| Backend | FastAPI + PostgreSQL/pgvector + Redis + Celery |
| Frontend | React 18 + Vite + TypeScript |
| IA / LLM | Proveedores configurables (OpenAI-compatible, Groq, Ollama) |
| RAG | pgvector (búsqueda semántica + chunking) |
| OCR | Procesamiento de imágenes de evaluaciones físicas |
| Contenedores | Docker Compose |

**Principio rector:** *La IA sugiere. El docente decide.*

---

## 🧩 Módulos Principales

| Módulo | Descripción |
|---|---|
| **Evaluaciones** | Creación, publicación, resolución online/física/mixta, calificación con IA |
| **Herramientas** | 15 tipos de materiales didácticos generados por IA (examen, crucigrama, guía, taller, flashcards, etc.) |
| **Calificaciones** | Calificación por foto, modo salón, boletín, resumen académico |
| **Presentaciones** | Generación automática de presentaciones educativas |
| **Xali** | Asistente IA conversacional para estudiantes y docentes |
| **Reportes** | Estadísticas por materia, promedio, rendimiento académico |

---

## 🚀 Desarrollo

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

Si PostgreSQL nativo corre en el host:
```bash
POSTGRES_PORT=5433 docker compose up -d
```

---

## 📚 Documentación del Proyecto

| Archivo | Contenido |
|---|---|
| [MANUAL_NEGOCIO.md](./MANUAL_NEGOCIO.md) | Reglas de negocio, actores, flujos pedagógicos |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Despliegue en servidor VPS |

---

## 📁 Estructura del Repositorio

```
/mnt/Calificator/
├── backend/          # FastAPI + Celery + SQLAlchemy + pgvector
│   ├── app/
│   │   ├── modules/  # Módulos funcionales (evaluaciones, herramientas, calificaciones, xali, rag...)
│   │   ├── services/  # LLM router, embeddings, OCR, imágenes
│   │   └── shared/   # Prompts, enums, utilerías
│   └── tests/
├── frontend/         # React + Vite + TypeScript
│   └── src/
│       ├── modules/  # Páginas por módulo
│       └── components/ # UI compartida
├── prototypes/       # Prototipos funcionales (ej. examen-chat, herramienta-chat)
└── docs/             # Documentación adicional
```

---

## 🧪 Prototipos

| Prototipo | Puerto | Descripción |
|---|---|---|
| [examen-chat](prototypes/examen-chat/) | `:3099` | Asistente conversacional para crear exámenes. Pregunta tipos y cantidades de preguntas, acepta texto/libro como referencia RAG aislada, guarda sesiones en SQLite local. |
| [herramienta-chat](prototypes/herramienta-chat/) | `:3100` | Asistente conversacional para generar otros materiales didácticos. |

---

## 🔬 Estado del Proyecto

Proyecto de investigación en fase de implementación piloto. El sistema se encuentra operativo en la Institución Educativa San Agustín para pruebas con docentes reales.

---
