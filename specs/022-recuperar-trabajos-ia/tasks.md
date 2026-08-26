# Tareas: Recuperación de trabajos de IA

## Fase 1: Regresión y corrección

- [x] T001 Reproducir y cubrir el error PostgreSQL UUID/VARCHAR en las lecturas del job (FR-001, FR-005)
- [x] T002 Corregir el tipado UUID de entrada y tiempo de cola en `backend/app/modules/jobs/service.py` (FR-001)
- [x] T003 Garantizar finalización `failed` ante errores ocurridos antes de iniciar el modelo en `backend/app/workers/tasks_grading.py` (FR-002)

## Fase 2: Recuperación automática

- [x] T004 Implementar selección segura de jobs `queued` vencidos y datos mínimos de reencolado (FR-003, FR-004)
- [x] T005 Implementar reconciliador periódico para `calificacion_lote` sin tocar jobs `running` (FR-003, FR-004)
- [x] T006 Reforzar la reclamación idempotente para impedir procesamiento concurrente duplicado (FR-004, FR-005)
- [x] T007 Añadir pruebas de doble recuperación, estados excluidos y unicidad de calificación (FR-002, FR-003, FR-004)

## Fase 3: Validación

- [x] T008 Ejecutar pruebas unitarias e integración backend, compilación y gobernanza Spec Kit (FR-001, FR-002, FR-003, FR-004, FR-005)
- [x] T009 Verificar el trabajo productivo recuperado y documentar el estado terminal sin datos sensibles (FR-002, FR-005)
