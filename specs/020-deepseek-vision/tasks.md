# Tareas: extracción visual robusta con DeepSeek

## Fase 1: Preparación

- [x] T001 Registrar configuración principal, fallback, timeout, retry y concurrencia en backend/app/core/config.py y backend/.env.example
- [x] T002 [P] Crear contrato Pydantic y errores tipados en backend/app/services/vision_extractor.py
- [x] T003 [P] Documentar benchmark previo y protocolo en specs/020-deepseek-vision/research.md

## Fase 2: Fundamentos

- [x] T004 Implementar preparación de imagen/PDF, EXIF, límites y páginas en backend/app/services/vision_extractor.py
- [x] T005 Implementar cliente OpenCode Chat Completions con credencial efectiva, timeouts y retry acotado en backend/app/services/vision_extractor.py
- [x] T006 Implementar validación, reparación única, merge por página y fallo parcial en backend/app/services/vision_extractor.py
- [x] T007 Implementar eventos estructurados seguros y metadatos de fallback en backend/app/services/vision_extractor.py

## Fase 3: Historia 1 - Extracción fiel

- [x] T008 [US1] Integrar VisionExtractor en backend/app/modules/calificaciones/agents.py
- [x] T009 [US1] Consumir respuestas estructuradas y cobertura por página en backend/app/modules/calificaciones/orchestrator.py
- [x] T010 [US1] Integrar propósito evaluation_document en backend/app/modules/evaluaciones/digitalize_service.py
- [x] T011 [P] [US1] Probar JPG, PNG, PDF, rotación, borrosa, ilegible y corrupta en backend/tests/unit/test_vision_extractor.py
- [x] T012 [P] [US1] Probar PDF multipágina y fallo parcial en backend/tests/unit/test_vision_extractor.py

## Fase 4: Historia 2 - Calificación desacoplada

- [x] T013 [US2] Excluir respuestas ilegibles de validación determinista en backend/app/modules/calificaciones/orchestrator.py
- [x] T014 [US2] Preservar grader textual solo para evidencia normalizada en backend/app/modules/calificaciones/orchestrator.py
- [x] T015 [P] [US2] Probar preguntas objetivas y abiertas en backend/tests/unit/test_vision_extractor.py
- [x] T016 [P] [US2] Probar que evaluaciones online no usan visión en backend/tests/unit/test_photo_grading_persistence.py

## Fase 5: Historia 3 - Operación recuperable

- [x] T017 [US3] Propagar estados terminales y tiempos de extracción en backend/app/workers/tasks_grading.py
- [x] T018 [US3] Añadir fallback explícito y limitado en backend/app/services/vision_extractor.py
- [x] T019 [P] [US3] Probar timeout, 429, 500, retry y fallback en backend/tests/unit/test_vision_extractor.py
- [x] T020 [P] [US3] Probar JSON inválido y reparación única en backend/tests/unit/test_vision_extractor.py

## Fase 6: Medición y regresión

- [x] T021 Ejecutar tres mediciones directas y registrar promedio/mínimo/máximo en specs/020-deepseek-vision/research.md
- [x] T022 Ejecutar medición mediante Calificator y registrar tiempos por etapa en specs/020-deepseek-vision/research.md
- [x] T023 Ejecutar pytest completo, pruebas frontend, TypeScript, lint y build
- [x] T024 Revisar seguridad de logs, compatibilidad online y marcar todas las tareas completas

## Dependencias

T001-T003 preceden T004-T007. T004-T007 preceden T008-T020. T021-T024 cierran la función.

## Estrategia


## Cobertura de requisitos

- FR-001, FR-002, FR-003: T001, T002, T005, T008 y T010.
- FR-004, FR-005, FR-006: T004, T006, T009, T011 y T012.
- FR-007, FR-008, FR-009: T001, T005, T018 y T019.
- FR-010, FR-011: T007, T009, T012 y T017.
- FR-012, FR-013: T013, T014, T015 y T017.
- FR-014, FR-015: T008, T010, T016 y T024.
- FR-016: T003, T021 y T022.
El MVP es T001-T016: extractor principal válido, multipágina y calificación desacoplada. La fase operativa y la medición son obligatorias antes de considerar completa la función.
