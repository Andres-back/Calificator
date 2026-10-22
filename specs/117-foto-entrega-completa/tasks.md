# Tareas: entrega de foto completa

## Fase 1 — Reproducción

- [x] T001 [US1] Crear regresión de PostgreSQL en `backend/tests/integration/test_evaluation_visual_permissions.py` para foto y PDF con revisión; demostrar fallo previo docente y cubrir también la misma ruta de estudiante (FR-001, FR-004, SC-001).

## Fase 2 — Reparación

- [x] T002 [US1] Inicializar el tipo en `backend/app/modules/calificaciones/router.py` antes de añadir la entrega y probar la invariante en `backend/tests/unit/test_photo_grading_persistence.py` (FR-001, FR-003).
- [x] T003 [US1] Ejecutar regresiones de permisos, mixta, revisiones, lote, cola y contexto visual; revisar constructores de Entrega sin alterar datos (FR-002, FR-003, SC-002).

## Fase 3 — Entrega

- [x] T004 Revisar diff, inventario y gobernanza con `scripts/build_system_inventory.py` y `scripts/check_spec_governance.py`; registrar evidencia local en `specs/117-foto-entrega-completa/quickstart.md` y preparar PR asociado al issue (FR-004).
- [x] T005 Documentar en `specs/117-foto-entrega-completa/quickstart.md` el control de CI, HEAD exacto, commit/hash/salud desplegados y rollback; ejecutar convergencia. La fusión y verificación reales se registrarán después en el PR, sin declararlas completadas antes de CI (FR-004, SC-003).

Dependencias: T001 → T002 → T003 → T004 → T005. Un único cambio funcional, sin paralelismo de archivos.
