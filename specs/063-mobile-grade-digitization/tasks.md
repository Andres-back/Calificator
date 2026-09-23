# Tareas: calificación móvil y digitalización segura

## Historia 1 - Buscar estudiantes sin bloqueos (P1)

- [x] T001 [US1] [FR-001] [FR-002] Añadir prueba de regresión del buscador diferido en `frontend/src/hooks/useDebouncedValue.test.tsx`.
- [x] T002 [US1] [FR-001] [FR-002] Desacoplar escritura y consulta remota, conservando resultados estables, en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`.
- [x] T003 [US1] [FR-003] [FR-004] Añadir pruebas del selector buscable de alumnos en `frontend/src/modules/materias/MateriaCalificar.test.tsx`.
- [x] T004 [US1] [FR-003] [FR-004] Reemplazar el selector largo por búsqueda y selección táctil en `frontend/src/modules/materias/MateriaCalificar.tsx`.

## Historia 2 - Clave independiente de la respuesta estudiantil (P1)

- [x] T005 [US2] [FR-005] [FR-006] [FR-008] Añadir regresiones de saneamiento, preservación de preguntas abiertas y de `270 × 67` en `backend/tests/unit/test_evaluation_digitalization.py`.
- [x] T006 [US2] [FR-005] [FR-008] Excluir etiquetas de respuestas estudiantiles en todas las rutas de estructura de `backend/app/modules/evaluaciones/digitalize_service.py`.
- [x] T007 [US2] [FR-006] [FR-007] Verificar claves deterministas contra el enunciado normalizado y registrar advertencias en `backend/app/modules/evaluaciones/digitalize_service.py`.

## Validación y entrega

- [x] T008 [FR-010] Ejecutar pruebas focalizadas frontend/backend, tipos, build y lint de archivos afectados.
- [x] T009 [FR-004] Validar el recorrido móvil con Playwright en 360×800 y 390×844.
- [x] T010 [FR-009] [FR-010] Actualizar trazabilidad, comprobar que no hay migraciones y abrir PR del issue #125.
