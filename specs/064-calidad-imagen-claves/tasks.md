# Tareas: Calidad de fotografía y claves seguras

## Fase 1 — Base compartida

- [x] T001 Añadir diagnóstico conservador y metadatos compatibles en `backend/app/services/image_preprocessing.py`.
- [x] T002 Añadir análisis ligero de imagen en navegador en `frontend/src/components/evidence/imageQuality.ts`.

## Fase 2 — Historia 1: clave independiente (P1)

- [x] T003 [US1] Cambiar prompts y normalización para separar respuesta observada y clave propuesta en `backend/app/modules/evaluaciones/digitalize_service.py`.
- [x] T004 [US1] Permitir claves pendientes en borradores y mantener el bloqueo de publicación en `backend/app/modules/evaluaciones/digitalize_service.py` y pruebas.
- [x] T005 [US1] Corregir el proveedor visual alternativo para reconocer hojas ya resueltas en `backend/app/services/vision_service.py`.
- [x] T006 [US1] Crear regresiones con respuestas manuscritas erróneas en `backend/tests/unit/test_evaluation_digitalization.py`.

## Fase 3 — Historia 2: fotos difíciles (P2)

- [x] T007 [US2] Incorporar diagnóstico y advertencias del servidor antes de visión en `backend/app/modules/evaluaciones/digitalize_service.py`.
- [x] T008 [US2] Mostrar diagnóstico no bloqueante y acción para reemplazar en `frontend/src/modules/evaluaciones/components/DigitalizarEvaluacionModal.tsx`.
- [x] T009 [US2] Mostrar diagnóstico por hoja en `frontend/src/components/evidence/MultiPageEvidencePicker.tsx` y extender `evidencePayload.ts`.
- [x] T010 [US2] Crear pruebas unitarias sintéticas de oscuridad, desenfoque, resolución y archivo corrupto en `backend/tests/unit/test_image_preprocessing.py`.

## Fase 4 — Historia 3: revisión segura (P3)

- [x] T011 [US3] Propagar claves pendientes y advertencias al resultado durable del job en `backend/app/workers/tasks_digitalization.py`.
- [x] T012 [US3] Verificar que el editor represente claves pendientes como campos vacíos y no permita confirmar sin completarlas.

## Fase 5 — Cierre

- [x] T013 Ejecutar pytest específico, Vitest específico, TypeScript y lint de archivos modificados.
- [x] T014 Actualizar `specs/064-calidad-imagen-claves/tasks.md`, ejecutar análisis/convergencia y preparar PR enlazado a #129.
