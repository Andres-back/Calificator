# Tareas: Recursos fieles al tema que pidió el docente

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #410. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas las mejoras (`spec-approved` y `plan-approved` en #410).

### Pruebas

- [X] T001 Crucigrama con pocas o ninguna palabra: sin relleno y marcado como incompleto. (FR-001, FR-002)
- [X] T002 Pares insuficientes en ambas variantes: sin relleno y marcado como incompleto. (FR-001, FR-002)
- [X] T003 Sopa de letras: sin palabras genéricas; el fallo de la IA sube; las palabras del docente bastan. (FR-001)
- [X] T004 Parejas repetidas descartadas e instrucción con reglas. (FR-003, FR-004)
- [X] T005 Crucigrama con tope de palabras y conectado. (FR-005)
- [X] T006 Para colorear sin dibujo: 503 y nada guardado. (FR-006)

### Implementación

- [X] T007 Quitar el relleno fijo de crucigrama, pares y sopa de letras. (FR-001)
- [X] T008 Mínimos en el control de calidad. (FR-002)
- [X] T009 `unique_pairs` y reglas de la instrucción. (FR-003, FR-004)
- [X] T010 `limit_to_requested` en el crucigrama. (FR-005)
- [X] T011 Para colorear no guarda sin dibujo. (FR-006)

### Validación

- [X] T012 Pruebas reales con el modelo económico, pruebas unitarias, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)

## Dependencias

T001–T006 → T007–T011. T012 al final.
