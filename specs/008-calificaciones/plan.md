# Plan: Calificaciones, visión, PQRS y boletín

**Rama**: codex/008-calificaciones | **Fecha**: 2026-08-14 | **Spec**: spec.md | **Issue**: #9

## Resumen
Documentar comportamiento existente mediante inspección, contratos, modelo y escenarios, sin cambiar API ni lógica.

## Contexto técnico
**Stack**: Python 3.11+, FastAPI, SQLAlchemy, Celery, PostgreSQL/pgvector, Redis, React 18, Vite y TypeScript.
**Pruebas**: pytest, Vitest y Playwright.
**Alcance**: backend/app/modules/calificaciones y frontend/src/modules/calificaciones, materias

## Verificación constitucional
Roles, trazabilidad, datos, accesibilidad, asincronía y gobernanza quedan cubiertos.

## Decisión
Conservar arquitectura; discrepancias pasan a backlog.

## Coordinación con 032

La evolución [032](../032-calificacion-impacto-docente/plan.md) implementa recuperación, revisión contextual y autoridad del escritor dentro de este dominio; las tablas y rutas académicas continúan siendo propiedad de 008.
