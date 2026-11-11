# Tareas: «Editar datos» funciona después de repartir puntos, imprimir o copiar

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), hotfix de #350. Aprobados por el usuario el 2026-11-11 (`spec-approved` y `plan-approved` en #350).

## Fase 1: Pruebas primero (RED)

- [X] T001 Pruebas de regresión en `frontend/src/modules/materias/MateriaEvaluaciones.test.tsx`: el cuerpo enviado por «Editar datos» incluye la versión abierta, una evaluación sin versión no envía `expected_content_version_id`, y un rechazo conserva el formulario. RED: 2 de 3 fallan porque el cuerpo no trae los campos. (FR-001, FR-002, FR-003, FR-004)

## Fase 2: Corrección (GREEN)

- [X] T002 `MateriaEvaluaciones.handleSubmit` envía `expected_updated_at` y, si existe, `expected_content_version_id`. (FR-001, FR-002)

## Fase final: Validación

- [X] T003 Ejecutar las pruebas de la materia, lint, tipos, el inventario y la gobernanza, repetir el caso en el navegador y registrar resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004)

## Dependencias

T001 → T002 → T003. Sin backend, sin IA y sin datos reales en las pruebas.
