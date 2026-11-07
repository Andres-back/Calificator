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

## PR 2: Historia 2, ninguna hoja perdida en silencio

### Pruebas primero (RED)

- [X] T006 Pruebas de `missing_pages` y `fill_missing_pages`: la hoja perdida se lee sola y se inserta en orden, la que sigue fallando se nombra, desaparecen los avisos genéricos y un documento completo no hace llamadas. RED: 5 fallas. (FR-004, FR-013)
- [X] T007 Prueba de regresión del PR 1: al releer la hoja 2 de un PDF, el texto conserva "PÁGINA 2", no "PÁGINA 1". (FR-001)
- [X] T008 Pruebas del aviso por hoja en `VisionExtractor`, del avance publicado por el worker en su propia sesión y de `extract_evaluation_text` con una hoja perdida. (FR-004, FR-005)

### Corrección (GREEN)

- [X] T009 `fill_missing_pages` y numeración corregida en `reading_completeness.py`; conexión en `extract_evaluation_text`. (FR-001, FR-004)
- [X] T010 `_on_page_done` en `VisionExtractor` y `_reading_progress` en el worker, con `lectura_hojas` en el resultado del trabajo. (FR-005)
- [X] T011 "Hojas leídas: N de M" en `DigitalizationJobMonitor`, con su prueba. (FR-005)

### Validación

- [X] T012 Validar con el modelo real la evaluación de 2 hojas y la relectura forzada de la hoja 2; ejecutar pruebas, inventario y gobernanza, y registrar en `quickstart.md`. (FR-004, FR-005, FR-013)

## PR 3 y PR 4: Historias 3 y 4

Sus tareas se añaden en cada PR:
- **PR 3:** "Revisar" abre el borrador, con la lista de pendientes y "Publicar y empezar a calificar". (FR-006, FR-007, FR-008)
- **PR 4:** respuestas propuestas, pregunta por las abiertas y respuesta libre con su regla de calificación. (FR-009, FR-010, FR-011, FR-012)

## Dependencias

T001 y T002 → T003 → T004 → T005. PR 2: T006, T007 y T008 → T009 y T010 → T011 → T012.
