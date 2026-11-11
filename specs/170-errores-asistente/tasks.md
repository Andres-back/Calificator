# Tareas: El asistente deja ver por qué falló al generar o guardar

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #359. Aprobados por el usuario el 2026-11-11 (`spec-approved` y `plan-approved` en #359).

## Fase 1: Pruebas primero (RED)

- [X] T001 Pruebas de regresión en `GenerationWizard.test.tsx`: un fallo al generar deja el contenido al inicio; un rechazo al guardar muestra el motivo del servidor y deja el contenido al inicio; sin respuesta se conserva el aviso de conexión. RED: 2 de 3 fallan. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Fase 2: Corrección (GREEN)

- [X] T002 Efecto que devuelve el contenido del asistente al inicio cuando aparece un aviso de error. (FR-001)
- [X] T003 El `onError` del guardado muestra el motivo filtrado por `toApiError` cuando hay respuesta y conserva el aviso de conexión cuando no la hay. (FR-002, FR-003, FR-004)

## Fase final: Validación

- [X] T004 Ejecutar las pruebas de evaluaciones, lint, tipos, el inventario y la gobernanza, repetir el rechazo al guardar en el navegador y registrar resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Dependencias

T001 → T002 y T003 → T004. Sin backend, sin IA y sin datos reales en las pruebas.
