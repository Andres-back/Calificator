# Tareas: Al digitalizar, las instrucciones de lectura llegan al modelo

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #378. El usuario aprobó por adelantado, el 2026-11-12, las specs necesarias para mejorar la digitalización; las etiquetas `spec-approved` y `plan-approved` las registra él.

## Fase 1: Pruebas primero (RED)

- [X] T001 Pruebas en `backend/tests/unit/test_digitalization_reading_prompt.py` que sustituyen solo `VisionExtractor._one` y capturan el texto enviado: reglas de digitalización presentes en foto y en PDF escaneado, sin la prioridad de calificar; reglas de orden y de un elemento por renglón; relectura literal presente; prompts que nombran `page_text`; prompt de documento sin reglas de quien llama. RED: 6 de 6 fallan. (FR-001, FR-002, FR-003, FR-004, FR-007)
- [X] T002 Pruebas del texto que recibe el organizador: una hoja con marcas del estudiante entrega solo lo impreso, y una transcripción guardada pierde el bloque de evidencia sin perder la hoja siguiente. RED: 3 de 3 fallan. (FR-005, FR-007)
- [X] T003 Prueba de guarda: el texto enviado al calificar una entrega conserva sus reglas y no recibe las de digitalización. Pasa antes y después. (FR-006)

## Fase 2: Corrección (GREEN)

- [X] T004 `VisionExtractor`: prompt propio para `evaluation_document`, `document_instructions` en `extract` y `VisionExtraction.printed_text`. (FR-001, FR-003, FR-006)
- [X] T005 `vision_agent` entrega las reglas al lector y devuelve `texto_preguntas` con solo lo impreso. (FR-001, FR-005)
- [X] T006 `DIGITALIZATION_VISION_PROMPT` como reglas para `page_text`; `LITERAL_READING_PROMPT` y `VISUAL_PAGE_PROMPT` nombran `page_text`, `answers` y `warnings`. (FR-002, FR-004)
- [X] T007 `_strip_student_answer_annotations` retira el bloque de evidencia del estudiante. (FR-005)
- [X] T008 Actualizar la aserción de `test_reading_completeness.py` que fijaba el nombre de campo antiguo. (FR-004)

## Fase final: Validación

- [X] T009 Ejecutar las pruebas unitarias del backend, ruff, el inventario y la gobernanza, y registrar resultados y lo no comprobado en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)

## Pendiente antes de fusionar (no es tarea de esta entrega)

Leer las 3 hojas anonimizadas con un modelo de producción y una clave válida, con el costo informado antes (SC-003). No se pudo hacer aquí: la clave de IA local respondió 401. Pasos en [quickstart.md](quickstart.md).

## Dependencias

T001, T002 y T003 → T004 a T008 → T009. Sin IA ni datos reales en las pruebas automáticas.
