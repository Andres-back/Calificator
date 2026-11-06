# Tareas: El calificador sin nota conserva su motivo y se reintenta una vez

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados como hotfix el 2026-11-06 (`spec-approved`, `hotfix` en #318).

## Fase 1: Pruebas primero (RED)

- [X] T001 Prueba de regresión en `backend/tests/unit/test_grader_missing_score.py`: forma sin texto privado, motivo y forma en `grader_agent`, reintento único, tope de dos intentos, sin nota inventada y otros errores sin reintento. RED: no existía `grader_output_shape`. (FR-001, FR-002, FR-003, FR-004, FR-005)
- [X] T002 Ampliar `test_both_failed_graders_return_no_score` con `grader_missing_score`. (FR-002)

## Fase 2: Corrección (GREEN)

- [X] T003 `RETRYABLE_STAGE_ERRORS` en `execution_policy.py` y su uso en `recovery.py`. (FR-001, FR-004)
- [X] T004 `grader_output_shape` en `agents.py`; `recovery.py` y `orchestrator.py` conservan motivo y forma. (FR-002, FR-003)

## Fase final: Validación

- [X] T005 Ejecutar la suite unitaria de backend, ruff, el inventario y la gobernanza, y registrar resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Dependencias

T001 y T002 → T003 y T004 → T005. Sin IA ni datos reales en las pruebas.
