# Tareas: Ubicar cada pregunta en la hoja con una cuadrícula

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #384. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas estas mejoras (`spec-approved` y `plan-approved` en #384).

### Pruebas primero (RED)

- [X] T001 `test_answer_grid_locator.py`: cuadrícula, celdas a recuadros, respuesta real de producción (pregunta 13 en el centro), descarte de lo inválido, prompt sin respuestas, ruta sin visión. RED: el módulo no existía. (FR-001, FR-002)
- [X] T002 `test_answer_location.py`: guardado fuera de los componentes con método y versión, hojas sin transacción, huella de la devolución intacta, zona de lectura que no bloquea, intentos de la Spec 175 que no cuentan, fallo total y parcial, recalificación concurrente, números repetidos, prioridad de la cuadrícula solo para el docente. RED: el servicio usaba la lectura. (FR-003, FR-004)
- [X] T003 Frontend: recuadro ceñido para la cuadrícula, «Ubicar de nuevo», `padQuestionRegion`. RED: no existían. (FR-005, FR-006)

### Implementación (GREEN)

- [X] T004 Localizador con cuadrícula y servicio por hoja. (FR-001, FR-002, FR-003)
- [X] T005 Prioridad de la zona en el desglose del docente. (FR-004)
- [X] T006 Visor, evidencia de la pregunta y «Ubicar de nuevo» en la revisión, sin escrituras al abrirla. (FR-005, FR-006)

### Validación

- [X] T007 Pruebas, tipos y lint; inventario y gobernanza; resultados en `quickstart.md`. (FR-001 a FR-006)

## Dependencias

T001 → T004. T002 → T004, T005. T003 → T006. T007 al final.
