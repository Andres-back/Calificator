# Plan: Entregas y experiencia estudiante

**Rama**: codex/007-entregas-estudiante | **Fecha**: 2026-08-14 | **Spec**: spec.md | **Issue**: #8

## Resumen
Documentar comportamiento existente mediante inspección, contratos, modelo y escenarios, sin cambiar API ni lógica.

## Contexto técnico
**Stack**: Python 3.11+, FastAPI, SQLAlchemy, Celery, PostgreSQL/pgvector, Redis, React 18, Vite y TypeScript.
**Pruebas**: pytest, Vitest y Playwright.
**Alcance**: backend/app/modules/calificaciones, evaluaciones y frontend/src/modules/evaluaciones

## Verificación constitucional
Roles, trazabilidad, datos, accesibilidad, asincronía y gobernanza quedan cubiertos.

## Decisión
Conservar arquitectura; discrepancias pasan a backlog.

## Coordinación 130 en curso

La proyección documental pública procede exclusivamente de la revisión fijada a la entrega; respuestas conservan número académico e identidad. Una entrega anterior no hereda secciones nuevas del documento vivo. El alcance y las pruebas nuevos se registran una sola vez en [Spec130](../130-digitalizacion-secciones/spec.md), [su plan](../130-digitalizacion-secciones/plan.md) y [sus tareas](../130-digitalizacion-secciones/tasks.md), issue #274. Esta referencia no acredita cierre, CI ni activación en producción.
