# Plan: Evaluaciones

**Rama**: codex/005-evaluaciones | **Fecha**: 2026-08-14 | **Spec**: spec.md | **Issue**: #6

## Resumen
Documentar comportamiento existente mediante inspección, contratos, modelo y escenarios, sin cambiar API ni lógica.

## Contexto técnico
**Stack**: Python 3.11+, FastAPI, SQLAlchemy, Celery, PostgreSQL/pgvector, Redis, React 18, Vite y TypeScript.
**Pruebas**: pytest, Vitest y Playwright.
**Alcance**: backend/app/modules/evaluaciones y frontend/src/modules/evaluaciones, materias

## Verificación constitucional
Roles, trazabilidad, datos, accesibilidad, asincronía y gobernanza quedan cubiertos.

## Decisión
Conservar arquitectura; discrepancias pasan a backlog.

## Incremento 096

El [plan 096](../096-evaluacion-dos-pantallas/plan.md) reutiliza GenerationWizard, editores y API actuales, con dos etapas y selector compartido de métodos. El formulario manual existente se comparte entre acceso general y materia; no se duplica su validación ni transporte. Sin migraciones ni cambios backend; guardado diferencial y expected_updated_at conservados.
