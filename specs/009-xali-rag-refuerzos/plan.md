# Plan: Xali, RAG y refuerzos

**Rama**: codex/009-xali-rag-refuerzos | **Fecha**: 2026-08-14 | **Spec**: spec.md | **Issue**: #10

## Resumen
Documentar comportamiento existente mediante inspección, contratos, modelo y escenarios, sin cambiar API ni lógica.

## Contexto técnico
**Stack**: Python 3.11+, FastAPI, SQLAlchemy, Celery, PostgreSQL/pgvector, Redis, React 18, Vite y TypeScript.
**Pruebas**: pytest, Vitest y Playwright.
**Alcance**: backend/app/modules/xali, rag y frontend/src/modules/xali

## Verificación constitucional
Roles, trazabilidad, datos, accesibilidad, asincronía y gobernanza quedan cubiertos.

## Decisión
Conservar arquitectura; discrepancias pasan a backlog.

## Coordinación con 032

La evolución [032](../032-calificacion-impacto-docente/plan.md) consume RAG después de extracción y endurece materia/propietario/procedencia; 009 conserva la propiedad de fuentes, fragmentos y recuperación.

## Coordinación con 104

La evolución [104](../104-xali-docente-visual/plan.md) separa contexto docente/estudiantil y conversación general, valida apoyos visuales en metadata existente y limita la recuperación opcional a materia/propietario sin cambiar defaults ajenos. No migra registros académicos ni añade proveedores; sus pruebas sintéticas y limitaciones están en el quickstart de 104.
