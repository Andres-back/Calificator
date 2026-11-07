# Tareas: Digitalizar desde foto con la lectura completa, una revisión clara y publicar para calificar

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-07 (`spec-approved`, `plan-approved` en #329).

## PR 1: Historia 1, lectura completa

### Pruebas primero (RED)

- [X] T001 Pruebas de `reading_completeness` en `backend/tests/unit/test_reading_completeness.py`: marcadores y resúmenes entre paréntesis; lectura citada pero ausente; casos sin aviso, incluido "responde las preguntas 1 a 10"; una sola relectura solo de la hoja afectada; aviso con la hoja si falla; página de PDF renderizada. RED: el módulo no existía. (FR-001, FR-002, FR-003)
- [X] T002 Pruebas de `extract_evaluation_text` con foto suelta y PDF de varias fotos: relee con el prompt literal solo cuando hace falta. (FR-001, FR-003)

### Corrección (GREEN)

- [X] T003 Crear `reading_completeness.py` con detección, relectura única y prompt literal sin duplicar la hoja en `texto_extraido`. (FR-001, FR-002, FR-003)
- [X] T004 Conectarlo en `extract_evaluation_text` para fotos y PDF escaneados. (FR-001, FR-003)

### Validación

- [X] T005 Validar con las 3 hojas anonimizadas y el modelo real, con tope de llamadas, y repetir el detector sobre las 8 transcripciones reales guardadas; ejecutar pruebas, inventario y gobernanza, y registrar los resultados en `quickstart.md`. (FR-001, FR-003, FR-013)

## PR 2, PR 3 y PR 4: Historias 2, 3 y 4

Sus tareas se añaden en cada PR:
- **PR 2:** hojas pendientes y avance por hoja. (FR-004, FR-005)
- **PR 3:** "Revisar" abre el borrador, con la lista de pendientes y "Publicar y empezar a calificar". (FR-006, FR-007, FR-008)
- **PR 4:** respuestas propuestas, pregunta por las abiertas y respuesta libre con su regla de calificación. (FR-009, FR-010, FR-011, FR-012)

## Dependencias

T001 y T002 → T003 → T004 → T005.
