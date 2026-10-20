# Tareas: lectura y preguntas en hojas separadas

Spec y plan aprobados 2026-10-20, issue #224. Las marcas requieren ejecución real; no equivalen a aprobación ni CI.

## Fase 1: Preparación

- [X] T001 Comprobar aprobaciones, checklist, ignores y análisis en `specs/108-lecturas-hojas-separadas/validation.md`, preservando propuesta 098 y trabajo 107. [FR-008]

## Fase 2: Fundamentos

- [X] T002 Escribir fixtures y pruebas puras previas en `backend/tests/unit/test_reading_worksheet_layout.py` para orden, texto largo, ausencia de preguntas/imagen, numeración, espacios, soluciones y conservación del input. [FR-001, FR-002, FR-003, FR-004, FR-005, FR-007, FR-008, FR-009; SC-001..004]

## Fase 3: Historia 1 — Separación de lectura y cuestionario

Prueba independiente: exportar cuento/lectura sintéticos y comprobar orden vertical y cuestionario desde página nueva, sin hoja final vacía.

- [X] T003 [US1] Ajustar render y estilos acotados de cuento/lectura en `backend/app/modules/herramientas/pdf_render.py`, conservando título existente, imágenes y texto completo. [FR-001/002/005/009, SC-001/003]
- [X] T004 [US1] Probar y alinear orden vertical de vistas en `frontend/src/modules/herramientas/views/StoryContent.tsx`, `ContenidoView.tsx` y sus tests, sin papel de ancho fijo. [FR-001/006, SC-001/005]

## Fase 4: Historia 2 — Preguntas con espacio útil

Prueba independiente: numeración consecutiva y 2/4/3 renglones para respuesta breve/explicación/desconocida, sin modificar campos guardados.

- [X] T005 [US2] Implementar proyección de preguntas/espacios y primer renglón junto al enunciado en `backend/app/modules/herramientas/pdf_render.py`; ejecutar pruebas T002 sin usar IA. [FR-003/004/005/008, SC-002/003]
- [X] T006 [US2] Añadir guía de render/fixtures PDF y comparar páginas reales, texto completo y tiempos contra baseline en `specs/108-lecturas-hojas-separadas/validation.md`; artefactos sintéticos solo en `output/qa/`. [FR-002/004/005, SC-001..003]

## Fase 5: Historia 3 — Conservación y permisos

Prueba independiente: recurso antiguo antes/después idéntico y copia alumno sin solucionario.

- [X] T007 [US3] Ejecutar regresiones de contenido/solucionario/exports y verificar no mutación en `backend/tests/unit/test_reading_worksheet_layout.py` y pruebas de permisos existentes de herramientas. [FR-007/008/009, SC-004]

## Fase 6: Historia 4 — Generación coherente e ilustrada (ampliación aprobada)

- [X] T011 [US4] Añadir regresiones previas de repetición, extensión, moraleja, contexto completo e imagen fallida en `backend/tests/unit/test_story_generation_quality.py`. [FR-010, FR-011, FR-012, FR-013, FR-014; SC-006..008]
- [X] T012 [US4] Implementar validación no destructiva de cuento nuevo en `backend/app/modules/herramientas/story_quality.py`, contador real con reserva de imagen en `pdf_render.py` y máximo una corrección en `service.py`, antes de imagen/persistencia. [FR-010/011/014, SC-006/008]
- [X] T013 [US4] Reforzar prompt y contexto completo en `generators/cuento.py`, preferencia opcional de moraleja en `schemas.py` y `frontend/src/modules/herramientas/forms/tools.tsx`; no cambiar históricos. [FR-011, FR-012, FR-013; SC-007/008]
- [X] T014 [US4] Evitar éxito ficticio ante imagen fallida en `service.py` y comprobar estado visible en `StoryContent.test.tsx`. [FR-012, SC-008]
- [X] T015 [US4] Ejecutar una prueba real sintética con imágenes low y revisar texto/imagen/PDF; distinguir fixtures técnicas y fallos sin reintentos inciertos en `validation.md`. [FR-014, SC-007]
- [X] T016 [US4] Probar páginas reales para cuento corto y largo y conservación histórica en `backend/tests/unit/test_story_generation_quality.py` y `backend/tests/unit/test_story_pdf_pages.py` y `validation.md`. [FR-002/010/014, SC-006/008]

## Fase final: Validación transversal

- [X] T008 Probar vistas y visor completo con Playwright Chromium/WebKit, 360/390/1280 px, temas claro/oscuro y documentos largos; registrar evidencia en `specs/108-lecturas-hojas-separadas/validation.md`. [FR-006, SC-005]
- [X] T009 Ejecutar backend/frontend quality, gobernanza e inventario aplicables; sincronizar sin relajar aserciones la prueba de visibilidad de `frontend/src/components/evidence/CameraCapture.test.tsx` si la animación aún no terminó; documentar comandos/resultados en `specs/108-lecturas-hojas-separadas/validation.md`. [FR-008, SC-001..005]
- [X] T010 Ejecutar Converge sobre `specs/108-lecturas-hojas-separadas/tasks.md` y preparar PR enlazado #224 solo con alcance propio y pruebas/CI, sin fusionar ni desplegar anticipadamente. [FR-001..009, SC-001..005]

## Dependencias y estrategia

T001 → T002 → T003 → T005; T004 puede desarrollarse en archivos distintos tras fijar contrato, sin obligación de delegar. Ampliación: T011 → T012/T013 → T014 → T015/T016. Después T006/T007, T008/T009 y T010. MVP US1: orden/separación; entrega completa requiere US2/US3/US4 y validación. US1 2 tareas, US2 2, US3 1, US4 6; preparación/fundamentos 2 y transversal 3. Total 16. Todas tienen ID, ruta y referencias. No hay hooks configurados.

## Reparación de CI autorizada el 2026-10-20

- [X] T017 Corregir exclusivamente la dependencia transitiva `follow-redirects` vulnerable en `frontend/package-lock.json`, comprobar auditoría productiva con el mismo umbral, instalación reproducible, API/sesión, TypeScript/build y registrar evidencia en `validation.md`; preparar el nuevo HEAD del PR #225 para CI, sin bypass ni despliegue. [FR-008; SC-004/005; Constitución VII/VIII]
