# Plan: Arquitectura, roles y seguridad

**Rama**: codex/002-arquitectura-roles-seguridad | **Fecha**: 2026-08-14 | **Spec**: [spec.md](./spec.md) | **Issue**: #3

## Resumen
Documentar el comportamiento existente mediante inspección estática, contratos, modelo y escenarios reproducibles, sin modificar API ni lógica.

## Contexto técnico
**Lenguajes**: Python 3.11+ y TypeScript 5
**Dependencias**: FastAPI, SQLAlchemy, Celery, React 18, Vite, TanStack Query
**Persistencia**: PostgreSQL/pgvector, Redis y archivos autorizados
**Pruebas**: pytest, Vitest y Playwright
**Alcance**: backend/app/api.py, backend/app/shared, frontend/src/router.tsx y components/auth

## Verificación constitucional
Roles, trazabilidad, datos, accesibilidad, asincronía y gobernanza están cubiertos sin excepciones.

## Estructura
El directorio de la especificación contiene spec, plan, research, data-model, quickstart, contracts, checklist y tasks.

**Decisión**: conservar la arquitectura actual; discrepancias pasan al backlog.
