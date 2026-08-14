# Plan: DBA, asistencia y currículo

**Rama**: codex/004-dba-asistencia-curriculo | **Fecha**: 2026-08-14 | **Spec**: [spec.md](./spec.md) | **Issue**: #5

## Resumen
Documentar el comportamiento existente mediante inspección estática, contratos, modelo y escenarios reproducibles, sin modificar API ni lógica.

## Contexto técnico
**Lenguajes**: Python 3.11+ y TypeScript 5
**Dependencias**: FastAPI, SQLAlchemy, Celery, React 18, Vite, TanStack Query
**Persistencia**: PostgreSQL/pgvector, Redis y archivos autorizados
**Pruebas**: pytest, Vitest y Playwright
**Alcance**: backend/app/modules/dba, asistencia y frontend/src/modules/materias

## Verificación constitucional
Roles, trazabilidad, datos, accesibilidad, asincronía y gobernanza están cubiertos sin excepciones.

## Estructura
El directorio de la especificación contiene spec, plan, research, data-model, quickstart, contracts, checklist y tasks.

**Decisión**: conservar la arquitectura actual; discrepancias pasan al backlog.
