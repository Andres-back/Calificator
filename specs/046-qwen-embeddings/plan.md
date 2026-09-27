# Plan de implementación: Qwen Embedding institucional

**Rama**: `codex/046-qwen-embeddings` | **Fecha**: 2026-09-17 | **Especificación**: [spec.md](spec.md)

## Resumen

Incorporar un proveedor institucional interno servido por Ollama con `qwen3-embedding:0.6b`, normalizar el espacio RAG a 1024 dimensiones y enlazar correctamente la persistencia con la búsqueda. OpenAI seguirá disponible como ruta controlada que exige reindexación. Una caída de embeddings conservará la degradación segura ya existente en calificación.

## Contexto técnico

**Lenguaje**: Python 3.12 y SQL PostgreSQL 16.
**Dependencias**: FastAPI, SQLAlchemy async, httpx, pgvector, Alembic, Docker Compose y Ollama.
**Almacenamiento**: `rag_sources` conserva originales; `rag_chunks` conserva fragmentos, vector y metadatos del espacio.
**Pruebas**: pytest unitario/integración, Ruff, Alembic, validación Compose y gobierno Spec Kit.
**Plataforma**: VPS Linux sin GPU, 6 CPU y 11 GB RAM; servicio privado en la red de XCalificator.
**Metas**: consulta caliente menor de 5 s; la indisponibilidad del modelo no bloquea calificación.
**Restricciones**: 1024 dimensiones; máximo 2 CPU y 3 GB para Ollama; sin exponer el puerto públicamente ni registrar contenido sensible.

## Verificación constitucional

- **I Roles**: no cambia permisos ni expone nuevos endpoints públicos.
- **II Integridad**: RAG sigue siendo complementario y no concede puntaje.
- **III Recuperabilidad**: fallo del proveedor produce degradación observable, no bloqueo.
- **IV Datos**: Alembic conserva fuentes y marca vectores derivados para reindexación.
- **V Experiencia**: el panel refleja la ruta efectiva; no se agrega una pantalla paralela.
- **VI IA intercambiable**: proveedor interno detrás de un contrato, con OpenAI seleccionable mediante reindexación.
- **VII Pruebas**: issue #92, spec, plan, tareas y regresiones obligatorias.
- **VIII Producción**: rama y PR; servicio reproducible y sin push directo a main.

No hay excepciones constitucionales.

## Estructura afectada

```text
backend/app/core/config.py
backend/app/modules/dba/router.py
backend/app/modules/rag/{models,ingest_service,retrieval_service}.py
backend/app/services/{embedding_service,ai_config_service,ai_capability_registry}.py
backend/app/services/ollama_provider.py
backend/alembic/versions/202609170001_qwen_embeddings.py
backend/scripts/reindex_rag_embeddings.py
backend/tests/unit/
docker-compose.yml
backend/.env.example
specs/046-qwen-embeddings/
```

## Fases

1. Registrar proveedor/modelo/ruta y migrar el espacio a 1024 dimensiones.
2. Implementar cliente interno y contrato de resultado validado.
3. Persistir y consultar el mismo vector con metadatos compatibles.
4. Añadir reindexación, despliegue reproducible y pruebas de degradación.
5. Validar en producción, medir latencia y confirmar que calificación no se bloquea.

## Reversión

Revertir el PR mediante otro PR, detener el servicio interno y restaurar la ruta OpenAI. El downgrade devuelve la dimensión histórica; las fuentes y textos permanecen disponibles para reindexación.
