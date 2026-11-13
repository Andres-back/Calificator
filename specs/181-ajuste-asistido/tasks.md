# Tareas: Ajustar una pregunta sin escribir el motivo y con la explicación redactada por la IA

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #382. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas estas mejoras (`spec-approved` y `plan-approved` en #382).

### Pruebas primero (RED)

- [X] T001 `test_explanation_draft.py`: prompt con estado del docente y reglas formativas, `orientar_sin_dar_respuesta`, datos como datos, rechazo de borradores inservibles, 503 claro, validación de pregunta y puntos, ruta con permiso. RED: el servicio no existía. (FR-003, FR-004, FR-006)
- [X] T002 `GradeComponentEditor.test.tsx`: motivo opcional y propuesto por estado, motivo escrito conservado, borrador al elegir estado, explicación escrita no pisada, fallo de la IA. RED: el motivo era obligatorio y no había borrador. (FR-001, FR-002, FR-005, FR-006)

### Implementación (GREEN)

- [X] T003 Servicio, esquemas y ruta. (FR-003, FR-004, FR-006)
- [X] T004 Editor, cliente de API y conexión en la revisión. (FR-001, FR-002, FR-005, FR-006)

### Validación

- [X] T005 Pruebas, tipos y lint; inventario y gobernanza; resultados en `quickstart.md`. (FR-001 a FR-006)

## Dependencias

T001 → T003. T002 → T004. T005 al final.
