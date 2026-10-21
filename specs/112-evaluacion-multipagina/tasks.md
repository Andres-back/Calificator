# Tareas: Recuperar calificación multipágina

## Fase 1: Preparación

- [x] T001 Registrar diagnóstico de solo lectura y alcance aprobado en specs/112-evaluacion-multipagina/research.md; mantener mejoras documentales en issue233 separado. FR-005 FR-006.

## Fase 2: Fundamentos

- [x] T002 Añadir regresiones de marcadores vacíos/ilegibles, fragmento y página de lectura en backend/tests/unit/test_vision_extractor.py. FR-001 FR-002 FR-003.
- [x] T003 Añadir regresión de timeout parcial y preservación de errores globales en backend/tests/unit/test_vision_extractor.py. FR-004 FR-007.

## Fase 3: Historia 1

- [x] T004 [US1] Reparar unión y contrato de parcialidad en backend/app/services/vision_extractor.py, conservando dibujos, blancos reales, fuentes y conflictos. FR-001 FR-002.
- [x] T005 [US1] Conservar fragmentos con advertencia en prompts y excluirlos del piso objetivo en backend/app/modules/calificaciones/orchestrator.py y agents.py; probar en backend/tests/unit/test_photo_grading_failures.py y test_vision_extractor.py. FR-002 FR-006.

## Fase 4: Historia 2

- [x] T006 [US2] Distinguir rol de página/pregunta ausente y recoger páginas completas al timeout en backend/app/services/vision_extractor.py. FR-003 FR-004.
- [x] T007 [US2] Crear diagnóstico/recuperación acotada con modo seco por defecto, bloqueo de decisiones y respaldo usando servicios existentes en scripts/recover_multipage_grading.py, con regresiones sintéticas. FR-005 FR-006.
- [x] T008 [US2] Documentar procedimiento de recuperación posterior a CI/main en specs/112-evaluacion-multipagina/quickstart.md; no afirmar notas corregidas antes de comprobarlas. FR-005 FR-007.

## Fase final: Validación

- [x] T009 Ejecutar regresiones de visión, orquestación, persistencia y permisos; revisar código, registrar spec en specs/README.md y tests/spec_governance/test_spec_baseline.py, regenerar inventario. FR-001 FR-002 FR-003 FR-004 FR-005 FR-006 FR-007.
- [x] T010 Ejecutar convergencia y preparar PR, con CI verde obligatorio antes de fusión/despliegue, en specs/112-evaluacion-multipagina/quickstart.md. FR-007.

## Dependencias

T001 → T002/T003 → T004 → T005 → T006 → T007/T008 → T009 → T010. MVP historias1/2 completo; documento/impresión/fotos se implementan separadamente en issue233. T002/T003 pueden diseñarse independientemente, pero comparten archivo y se editan de forma secuencial. Convergencia no sustituye CI ni verificación de recuperación real.

## Fase 7: Convergencia

- [x] T011 Invalidar huellas de extracciones previas al arreglo mediante versión de política en backend/app/workers/tasks_grading.py y probar en backend/tests/unit/test_tasks_grading.py. FR-001 FR-006 (partial): un checkpoint antiguo no puede reintroducir respuestas anuladas.
