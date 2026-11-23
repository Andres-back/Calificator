# Tareas: Preguntas en hoja aparte en el PDF de cuentos y lecturas

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #224. La issue ya tenía `spec-approved` y `plan-approved` desde la Spec 108. El 2026-11-23, ante la pregunta de qué hacer con ella, el usuario eligió «Rehacerla pequeña»: una spec nueva y un PR pequeño, solo en `pdf_render.py`, con preguntas en hoja nueva tras la lectura y renglones según la respuesta esperada, validado contando páginas y sin IA.

### Pruebas primero (RED)

- [X] T001 Pruebas de estructura en `backend/tests/unit/test_lectura_preguntas_hoja_aparte.py`: hoja nueva tras el texto, sin hoja extra cuando falta el texto o las preguntas, nombre y numeración, renglones por extensión y solucionario. RED: falla la importación de `_answer_lines`. (FR-001, FR-002, FR-003, FR-004)
- [X] T002 Pruebas de PDF real en el mismo archivo, con WeasyPrint y PyMuPDF: lectura corta y de varias hojas, 14 preguntas largas, y cuento con y sin ilustración. (FR-001, FR-005)

### Implementación (GREEN)

- [X] T003 `_answer_lines`, `_answer_space` y `_questions_sheet`, con los estilos `.newpage`, `.aline` y `.sheet-name`. (FR-001, FR-002, FR-003)
- [X] T004 `_render_lectura_comprensiva` y `_render_cuento_mejorado` usan la hoja de preguntas; el solucionario conserva las respuestas y no trae renglones. (FR-001, FR-003, FR-004)
- [X] T005 La prueba del cuento en `test_herramientas_pdf_imprimibles.py` espera tres renglones altos. Los demás recursos no cambian. (FR-003, FR-006)

### Validación

- [X] T006 Pruebas de PDF real dentro del contenedor de pruebas y revisión a la vista de un PDF de cada caso. (FR-001, FR-002, FR-003, FR-005)
- [X] T007 Pruebas unitarias, lint, inventario y gobernanza, con los resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)

## Dependencias

T001 y T002 → T003 → T004 → T005 → T006 → T007.
