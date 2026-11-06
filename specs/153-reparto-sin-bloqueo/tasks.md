# Tareas: El reparto de puntos no bloquea publicar ni editar

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados como hotfix el 2026-11-06 (`spec-approved`, `hotfix` en #323).

## Fase 1: Pruebas primero (RED)

- [X] T001 Prueba de regresión en `backend/tests/unit/test_score_revision_without_material.py`: publicar una versión sin material ni cobertura, iniciar y guardar una edición de solo texto, y conservar los rechazos que siguen vigentes. RED: 3 pruebas fallan con los rechazos del incidente. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)

## Fase 2: Corrección (GREEN)

- [X] T002 `publish_evaluation` exige cobertura solo si la versión tiene material. (FR-001, FR-002)
- [X] T003 `prepare_content_edit` y `save_content_revision` aceptan la edición de solo texto con versión anterior. (FR-003, FR-004, FR-005)

## Fase final: Validación

- [X] T004 Ejecutar las pruebas unitarias relacionadas, ruff, el inventario y la gobernanza, y registrar resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)

## Dependencias

T001 → T002 y T003 → T004. Sin IA ni datos reales en las pruebas.
