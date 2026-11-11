# Tareas: La prueba del aviso de evaluación asignada no depende de la velocidad del runner

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), hotfix de #357. El usuario ordenó reparar los hallazgos de la auditoría el 2026-11-11; la etiqueta `spec-approved` la registra él.

## Fase 1: Diagnóstico (RED)

- [X] T001 Medir con una prueba temporal la opacidad de los contenedores del aviso justo después de renderizar y 800 ms después. Resultado: `opacity: 0` al inicio y sin opacidad reducida después. El fallo de la prueba de regresión en la CI queda enlazado en `quickstart.md`. (FR-001)

## Fase 2: Corrección (GREEN)

- [X] T002 La prueba de regresión del aviso espera la visibilidad con `waitFor` y conserva sus demás comprobaciones. (FR-001, FR-002, FR-003)

## Fase final: Validación

- [X] T003 Ejecutar el archivo de la prueba seis veces, las pruebas de evaluaciones, lint, tipos, el inventario y la gobernanza, y registrar resultados en `quickstart.md`. (FR-001, FR-002, FR-003)

## Dependencias

T001 → T002 → T003. Solo cambia una prueba.
