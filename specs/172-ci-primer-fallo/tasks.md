# Tareas: La CI se detiene en el primer fallo de prueba

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #364, pedido por el usuario el 2026-11-11. Las etiquetas `spec-approved` y `plan-approved` las registra él.

## Fase 1: Pruebas primero (RED)

- [X] T001 Pruebas de gobernanza en `tests/spec_governance/test_ci_first_failure.py`: corte por conjunto, cancelación como último paso, permisos por trabajo, instalación de navegadores sin cancelar, fragmentos independientes y solo lectura en los demás trabajos. RED: 12 de 14 fallan; las otras dos protegen reglas vigentes. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)

## Fase 2: Cambio (GREEN)

- [X] T002 Opciones de corte en `pytest`, Vitest y Playwright. (FR-001, FR-002, FR-003)
- [X] T003 Paso final de cancelación y permisos en los cuatro trabajos de pruebas, con la condición propia de los trabajos E2E. (FR-004, FR-005, FR-006)
- [X] T004 Ajustar `test_visual_ci_gates.py`: admite `--max-failures` y el identificador del paso de pruebas; el resto de la compuerta no cambia. (FR-007)

## Fase final: Validación

- [X] T005 Ejecutar las pruebas de gobernanza, validar el YAML y el inventario, comprobar el corte en GitHub Actions con un fallo provocado en el PR y registrar resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)

## Dependencias

T001 → T002, T003 y T004 → T005.
