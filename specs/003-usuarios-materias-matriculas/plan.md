# Plan: Usuarios, materias y matrículas

**Rama**: codex/003-usuarios-materias-matriculas | **Fecha**: 2026-08-14 | **Spec**: [spec.md](./spec.md) | **Issue**: #4

## Resumen
Documentar el comportamiento existente mediante inspección estática, contratos, modelo y escenarios reproducibles, sin modificar API ni lógica.

## Contexto técnico
**Lenguajes**: Python 3.11+ y TypeScript 5
**Dependencias**: FastAPI, SQLAlchemy, Celery, React 18, Vite, TanStack Query
**Persistencia**: PostgreSQL/pgvector, Redis y archivos autorizados
**Pruebas**: pytest, Vitest y Playwright
**Alcance**: backend/app/modules/auth, users, materias, matriculas y frontend/src/modules/auth, materias

## Verificación constitucional
Roles, trazabilidad, datos, accesibilidad, asincronía y gobernanza están cubiertos sin excepciones.

## Estructura
El directorio de la especificación contiene spec, plan, research, data-model, quickstart, contracts, checklist y tasks.

**Decisión**: conservar la arquitectura actual; discrepancias pasan al backlog.
