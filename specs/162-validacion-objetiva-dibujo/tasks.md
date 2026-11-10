# Tareas: La nota del dibujo no impide reconocer la opción marcada

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-10 (`spec-approved`, `plan-approved` en #344).

### Pruebas primero (RED)

- [X] T001 Pruebas en `backend/tests/unit/test_objective_drawing_note.py`: opción correcta e incorrecta con nota, solo dibujo, dos marcas, y palabras completas en verdadero o falso. RED: 9 fallas. (FR-001, FR-002, FR-003)

### Corrección (GREEN)

- [X] T002 `VISUAL_NOTE_PREFIX` y `_read_answer`; `build_objective_validation` compara sin la nota y omite la lectura vacía. (FR-001, FR-002)
- [X] T003 `_truth_value` por palabras completas, con "V", "F", opción con letra y dos marcas; letra sola según las opciones de la pregunta. (FR-002, FR-003)

### Validación

- [X] T004 Repetir la comparación sobre las 155 calificaciones reales, en solo lectura y sin guardar nada; ejecutar pruebas, inventario y gobernanza, y registrar los resultados en `quickstart.md`. (FR-001, FR-004)

## Dependencias

T001 → T002 → T003 → T004.
