# Tareas: La prueba E2E del editor de criterios no mide durante la animación

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), hotfix de #366. Aprobados por el usuario el 2026-11-12 (`spec-approved` y `plan-approved` en #366).

## Fase 1: Diagnóstico (RED)

- [X] T001 Localizar el fallo de la prueba de regresión en la CI (fragmento 3/4 del PR #352) y la animación que lo explica; queda enlazado en `quickstart.md`. (FR-001)

## Fase 2: Corrección (GREEN)

- [X] T002 La medición de cabecera y botones se repite con `toPass()` y conserva el resto de comprobaciones. (FR-001, FR-002, FR-003)

## Fase final: Validación

- [X] T003 Ejecutar la prueba cinco veces en Chromium, lint, tipos, el inventario y la gobernanza, y registrar resultados en `quickstart.md`. (FR-001, FR-002, FR-003)

## Dependencias

T001 → T002 → T003. Solo cambia una prueba.
