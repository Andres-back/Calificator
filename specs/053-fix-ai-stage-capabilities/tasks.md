# Tareas: Capacidades correctas por etapa de IA

## Fase 1: Preparación

- [x] T001 Registrar el hotfix y su aprobación en `specs/053-fix-ai-stage-capabilities/spec.md` y el issue #105.

## Fase 2: Historia 1 - Selección correcta de modelos por función

- [x] T002 [US1] [FR-001] [FR-002] [FR-003] [FR-004] Implementar la migración de capacidades en `backend/alembic/versions/202609200002_fix_ai_stage_capabilities.py`.
- [x] T003 [US1] [FR-005] [FR-006] [FR-007] Añadir regresión de alcance y rollback en `backend/tests/unit/test_ai_stage_capability_migration.py`.

## Fase 3: Cierre

- [x] T004 [FR-007] Actualizar trazabilidad en `specs/README.md` y `tests/spec_governance/test_spec_baseline.py`.
- [x] T005 [FR-007] Regenerar el inventario técnico y ejecutar pruebas enfocadas, Ruff y validación Alembic.
- [x] T006 [FR-001] [FR-002] [FR-003] Definir la comprobación posterior al despliegue para las tres capacidades persistidas.

## Dependencias

- T002 depende de T001.
- T003 valida T002.
- T004 y T005 dependen de T002 y T003.
- T006 prepara la comprobación que se ejecutará después del merge y despliegue de T005.

## Estrategia de entrega

El hotfix es una única unidad reversible: migración, regresión, gobernanza, CI, merge y comprobación de las tres rutas en producción.
