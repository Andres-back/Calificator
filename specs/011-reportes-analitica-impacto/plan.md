# Plan: Reportes, analítica e impacto

**Rama**: codex/011-reportes-analitica-impacto | **Fecha**: 2026-08-14 | **Spec**: spec.md | **Issue**: #12

## Resumen
Documentar comportamiento existente mediante inspección, contratos, modelo y escenarios, sin cambiar API ni lógica.

## Contexto técnico
**Stack**: Python 3.11+, FastAPI, SQLAlchemy, Celery, PostgreSQL/pgvector, Redis, React 18, Vite y TypeScript.
**Pruebas**: pytest, Vitest y Playwright.
**Alcance**: backend/app/modules/reportes, analytics, impacto_tesis y frontend/src/modules/reportes, analytics

## Verificación constitucional
Roles, trazabilidad, datos, accesibilidad, asincronía y gobernanza quedan cubiertos.

## Decisión
Conservar arquitectura; discrepancias pasan a backlog.
