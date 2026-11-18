# Tareas: La revisión adicional de calificación no agota su límite de salida

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #429. Aprobados por el usuario el 2026-11-18: ante el hallazgo respondió «sí, revisa» (`spec-approved` y `plan-approved` en #429).

### Pruebas

- [X] T001 La revisión adicional se envía con 2.048 tokens y la instrucción pide brevedad; la respuesta se interpreta igual. (FR-001, FR-002, FR-003)

### Implementación

- [X] T002 Constante de límite de salida en `comparator_agent`. (FR-001)
- [X] T003 Extensión máxima en `COMPARATOR_PROMPT`. (FR-002)

### Validación

- [X] T004 Pruebas del comparador, del presupuesto de salida y del contexto documental; lint, inventario y gobernanza. (FR-001, FR-002, FR-003)

## Dependencias

T001 → T002 y T003. T004 al final.
