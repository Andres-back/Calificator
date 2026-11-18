# Tareas: Xali docente conoce los datos de la materia seleccionada

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #419. Aprobados por el usuario el 2026-11-17: pidió adaptar el asistente a cada profesor y materia con los datos existentes (`spec-approved` y `plan-approved` en #419).

### Pruebas

- [X] T001 El panorama resume materia, evaluaciones, promedios en escala 5, preguntas difíciles, asistencia y recursos. (FR-001, FR-002, FR-003)
- [X] T002 Los estudiantes viajan con código, ordenados por promedio, sin nombres en el texto. (FR-004)
- [X] T003 El servidor restaura y vuelve a ocultar los nombres; la mención se resuelve sin reescribir el mensaje. (FR-005, FR-006)
- [X] T004 Materia vacía, títulos que parecen instrucciones, reglas y nota de procedencia. (FR-001, FR-007, FR-010)
- [X] T005 Pantalla: sugerencias y bienvenida con y sin materia; la sugerencia se envía con la materia. (FR-009)

### Implementación

- [X] T006 `teacher_insights.py`: consultas, panorama, códigos y reglas. (FR-001, FR-002, FR-003, FR-004, FR-007)
- [X] T007 `service.chat`: panorama, historial sin nombres, nota de mención y nombres restaurados. (FR-005, FR-006)
- [X] T008 Conversación general con nombre y materias del docente. (FR-008)
- [X] T009 Nota de procedencia y pantalla. (FR-009, FR-010)

### Validación

- [X] T010 Conversación real en local con el modelo económico: saludo, mejor estudiante, estudiante nombrado, dato inexistente y conversación general. (FR-001, FR-005, FR-006, FR-007, FR-008)
- [X] T011 Armado sobre tres materias reales de producción en solo lectura, sin nombres en el texto. (FR-001, FR-002, FR-003, FR-004)
- [X] T012 Pruebas, tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010)

## Dependencias

T001–T005 → T006–T009. T010–T012 al final.
