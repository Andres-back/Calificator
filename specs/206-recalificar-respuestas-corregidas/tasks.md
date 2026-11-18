# Tareas: Recalificar con las respuestas esperadas corregidas

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #430. Aprobados por el usuario el 2026-11-18: pidió usar como respuesta correcta la que el docente ya validó y dejó aprobadas las specs que dejen hechas las mejoras (`spec-approved` y `plan-approved` en #430).

### Pruebas

- [X] T001 Unitarias: clave corregida ofrecida por número sin revelar respuestas; lectura corregida; otras reglas siguen siendo cambio de contenido. (FR-001, FR-002, FR-006)
- [X] T002 Unitarias: sin elección se conserva la versión original; con elección se devuelve la versión objetivo; comprobantes vencidos o incompletos se rechazan. (FR-003, FR-004, FR-005)
- [X] T003 Integración: adopción real con base de datos, entrega asociada a la versión nueva, historial y entrega vecina intacta. (FR-003, FR-004, FR-005, FR-006)
- [X] T004 Pantalla: aviso, preguntas afectadas, casilla opcional y envío con y sin elección. (FR-007)

### Implementación

- [X] T005 Comparación sin clave y estado `respuestas_actualizadas`. (FR-001, FR-002, FR-006)
- [X] T006 Validación opcional de la adopción y metadatos del historial. (FR-003, FR-004, FR-005)
- [X] T007 Contrato de la consulta. (FR-002)
- [X] T008 Diálogo «Volver a calificar» y tipo de la API. (FR-007)

### Validación

- [X] T009 Ensayo local de punta a punta: edición real de respuestas, propuesta reconocida y recalificación encolada con la versión nueva. (FR-001, FR-003, FR-005)
- [X] T010 Suites de recalificación, tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)

## Dependencias

T001 → T005. T002 → T006. T004 → T008. T003 y T009 después de T005 a T007. T010 al final.
