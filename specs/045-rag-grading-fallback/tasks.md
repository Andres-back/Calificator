# Tareas del hotfix 045

Issue #90; aprobación humana registrada el 2026-09-16.

- [x] T001 (FR-001, FR-002, FR-005) Aislar la recuperación RAG opcional en `backend/app/modules/calificaciones/orchestrator.py` sin alterar la valoración.
- [x] T002 (FR-003, FR-004) Registrar estado sanitizado de disponibilidad RAG en la salida auditable.
- [x] T003 (FR-004, FR-006) Actualizar la regresión de fallo RAG para exigir continuidad y ausencia de contenido sensible.
- [x] T004 (FR-005, FR-006) Ejecutar pruebas focalizadas, Ruff, gobernanza y revisión del diff.
- [x] T005 (FR-001, FR-005) Preparar el runbook de PR/CI, despliegue desde main y repetición de la medición no persistente; su ejecución posterior requiere CI verde.
