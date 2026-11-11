# Tareas: Guardar al reabrir una evaluación generada sin rúbrica

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), hotfix de #349. El usuario ordenó reparar los hallazgos de la auditoría el 2026-11-11; la etiqueta `spec-approved` la registra él.

## Fase 1: Pruebas primero (RED)

- [X] T001 Pruebas de regresión en `generationWizardModel.test.ts`: criterios con peso cero abren con la rúbrica apagada y sin error; pesos mayores que cero o niveles la mantienen encendida; la limpieza quita pesos y puntajes. RED: 2 de 3 fallan. (FR-001, FR-002, FR-003, FR-004)
- [X] T002 Prueba de regresión en `GenerationWizard.test.tsx`: reabrir una evaluación guardada con peso cero deja «Guardar cambios» habilitado y guarda. RED: falla por el aviso del peso. (FR-001, FR-004)

## Fase 2: Corrección (GREEN)

- [X] T003 `evaluationToWizardState` enciende la rúbrica solo con peso mayor que cero o niveles. (FR-001)
- [X] T004 `criteriaWithoutRubric` y su uso en `evaluationPayload` cuando la rúbrica está apagada; con rúbrica no cambia. (FR-002, FR-003)

## Fase final: Validación

- [X] T005 Ejecutar las pruebas de evaluaciones, lint, tipos, el inventario y la gobernanza, repetir el caso en el navegador y registrar resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004)

## Dependencias

T001 y T002 → T003 y T004 → T005. Sin backend, sin IA y sin datos reales en las pruebas.
