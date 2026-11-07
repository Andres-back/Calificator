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

## PR 4: Historia 4, respuestas correctas y respuesta libre

### Pruebas primero (RED)

- [X] T030 Pruebas en `backend/tests/unit/test_free_answer.py`: clave completa solo con `respuesta_libre: true` en una pregunta abierta; sin la marca sigue faltando; la marca se ignora en opción múltiple, verdadero o falso y completar; publicar una evaluación digitalizada con respuesta libre; la marca llega al mapa de calificación, a la copia de versión y al guardado; la digitalización nunca la pone sola; el estudiante no la recibe. RED: error de importación y luego 7 fallas. (FR-010, FR-011, FR-013)
- [X] T031 Pruebas del calificador con modelo simulado, sin llamadas reales: la regla aparece solo para las preguntas marcadas, también al dividir por pregunta y en el verificador; la validación objetiva no la compara letra por letra; la nota con clave completa no se marca para revisión. (FR-012)
- [X] T032 Pruebas de Vitest del modelo y del editor: la pregunta "¿Tiene una respuesta esperada o es de respuesta libre?", marcar y quitar la respuesta libre, validación, `respuesta_libre` en lo que se guarda y confirmar con un toque una respuesta objetiva propuesta. RED: 8 fallas. (FR-009, FR-010, FR-011)

### Corrección (GREEN)

- [X] T033 `free_answer_numbers` y `normalize_free_answers` en `blueprint_service.py`; `grading_answer_key_status` cuenta la marca; el guardado conserva la marca solo en preguntas abiertas con el texto "Cualquier respuesta válida"; `respuestalibre` entra en las claves ocultas al estudiante. (FR-011, FR-013)
- [X] T034 Regla de respuesta libre en el calificador y el verificador (`agents.py`): puntaje completo si responde de forma pertinente; en blanco, sin relación o ilegible siguen las reglas actuales. `build_objective_validation` omite esas preguntas. (FR-012)
- [X] T035 Editor: pregunta con dos botones, "Escribir la respuesta esperada" y "Respuesta libre"; vista fija "Cualquier respuesta válida" con "Quitar respuesta libre"; botón "Confirmar esta respuesta" para opción múltiple y verdadero o falso. (FR-009, FR-010, FR-011)

### Validación

- [X] T036 E2E a 360 px en `frontend/e2e/evaluation-free-answer.spec.ts`: marcar una pregunta abierta como libre y guardar. Ejecutar pruebas, inventario y gobernanza, y registrar en `quickstart.md`. (FR-010, FR-011, FR-013)

## Dependencias

T001 y T002 → T003 → T004 → T005. PR 2: T006, T007 y T008 → T009 y T010 → T011 → T012. PR 4: T030, T031 y T032 → T033 → T034 y T035 → T036.
