# Plan: comprobación previa de referencias RAG

**Rama**: `codex/083-rag-preflight` | **Fecha**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Issue**: #172

## Resumen

Antes de generar el vector de consulta, ejecutar una comprobación parametrizada `EXISTS` sobre `rag_chunks JOIN rag_sources`. Compartir los filtros de autorización, materia, tipo, exclusiones y vector no nulo con la consulta final. Ausencia devuelve `[]` sin llamar al proveedor; presencia conserva embedding y compatibilidad exacta de proveedor/modelo/dimensión/versión. No se elimina RAG ni se modifican timeouts.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 del backend actual.
**Dependencias**: SQLAlchemy AsyncSession, PostgreSQL/pgvector y proveedor de embedding existentes.
**Persistencia**: solo lecturas; no migraciones ni nueva caché.
**Pruebas**: pytest async; ampliar `backend/tests/unit/test_rag_embedding_space.py` antes de implementar.
**Plataforma objetivo**: workers y backend existentes en Docker.
**Rendimiento y escala**: evitar una llamada externa inútil cuando no hay candidatos; `EXISTS` termina al primer candidato. Latencia de modelos no garantizada.

## Verificación de la constitución

- Separación de roles: mismos filtros de fuente y fragmento en ambas consultas; regresión de paridad.
- Integridad y trazabilidad: no se cambia persistencia, evaluación, criterios ni prompts.
- Asincronía e idempotencia: continúa el mismo job y entrega.
- Datos y secretos: no registrar texto ni credenciales; prueba productiva exclusivamente demo.
- Accesibilidad: sin cambios de interfaz.
- Gobernanza y pruebas: hotfix aprobado por «RESUELVELO»; issue, rama, regresión y PR con CI obligatorio. Se omite únicamente la pausa humana del plan. Revisión constitucional posterior al diseño: cumple.

## Estructura del proyecto

`backend/app/modules/rag/retrieval_service.py`, `backend/tests/unit/test_rag_embedding_space.py`, actualización del doble de prueba en `backend/tests/integration/test_explainable_grading_pipeline.py`, `specs/083-rag-preflight/` y `specs/README.md`.

## Decisiones y complejidad

Una comprobación conservadora no predice el espacio efectivo del embedding: si hay candidatos incompatibles, todavía puede ejecutarse el embedding, pero no mezclará vectores. Evita duplicar la resolución administrativa y mantiene el contrato de recuperación. Errores de base de datos no se interpretan como ausencia; se traducen a `EmbeddingUnavailableError`. Véase [research.md](research.md). No hay excepciones de datos, permisos o pruebas.
