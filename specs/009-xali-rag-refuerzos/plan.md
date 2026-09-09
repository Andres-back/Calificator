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
