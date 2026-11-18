# Tareas: Toda tarea de IA obedece al panel de administración

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #428. Aprobados por el usuario el 2026-11-18: pidió revisar que el sistema tome la configuración del panel y se actualice todo, para controlar la IA y los proveedores desde la interfaz de administración (`spec-approved` y `plan-approved` en #428).

### Pruebas

- [X] T001 La etapa del panel va antes que la ruta sembrada en `grading_photo`, `grading_text` y `presentacion`. (FR-001, FR-002)
- [X] T002 Las etapas siguen heredando de su ruta sembrada. (FR-006)
- [X] T003 Alineación al guardar: copia los cinco campos, conserva etiqueta y permisos, respeta el orden y no toca rutas sin etapa. (FR-003)
- [X] T004 Gobernanza: toda tarea de texto del código resuelve una ruta del panel. (FR-005)

### Implementación

- [X] T005 Alias en `_feature_candidates`. (FR-001, FR-002, FR-006)
- [X] T006 `align_legacy_routes` en `save_features` y `_replace_configuration`. (FR-003)
- [X] T007 Advertencia `ai_feature_without_route`. (FR-004)

### Validación

- [X] T008 Suite del servidor, lint, inventario y gobernanza de specs. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)
- [X] T009 Sonda de rutas en producción antes del cambio, sin llamar a modelos. (FR-001, FR-002)

## Dependencias

Spec 203 → T005. T001 y T002 → T005. T003 → T006. T008 y T009 al final.
