# Tareas: Encolado seguro de calificaciones

## Fase 1: Preparación

- [x] T001 Registrar la fase 040 y su responsabilidad de encolado individual en `specs/README.md`
- [x] T002 Capturar y comprobar la línea base previa de rutas y módulos con `specs/system-inventory/current.json`

## Fase 2: Fundamentos

- [x] T003 Crear pruebas de contrato del coordinador persistente para FR-001, FR-002 y FR-004 en `backend/tests/unit/test_grading_queue_service.py`
- [x] T004 Ajustar la prueba de fallo de publicación para FR-006 y FR-007 sustituyendo dependencias en el nuevo límite en `backend/tests/unit/test_photo_grading_persistence.py`

## Fase 3: Historia 1 - Enviar evidencia sin esperar la calificación

**Objetivo**: separar la coordinación individual sin cambiar la persistencia previa ni la respuesta asíncrona.

**Prueba independiente**: una entrega válida deja evidencia, calificación pendiente y trabajo confirmado antes de publicar el mensaje.

- [x] T005 [US1] Implementar `enqueue_persisted_grading` preservando FR-001, FR-002, FR-003 y FR-004 en `backend/app/modules/calificaciones/grading_queue_service.py`
- [x] T006 [US1] Sustituir la implementación local por un alias compatible que preserve FR-010 y FR-011 en `backend/app/modules/calificaciones/router.py`
- [x] T007 [US1] Ejecutar las regresiones de foto, online y evaluación mixta de FR-014 descritas en `specs/040-modularizar-cola-calificaciones/quickstart.md`

## Fase 4: Historia 2 - Calificar varios estudiantes sin duplicados

**Objetivo**: demostrar que la extracción no altera lote, aislamiento ni ejecución individual concurrente.

**Prueba independiente**: las regresiones de lote y reclamación concurrente conservan un hijo por entrega y una sola ejecución efectiva.

- [x] T008 [US2] Cubrir FR-003 y FR-007 reutilizando una calificación existente sin volver a agregarla en `backend/tests/unit/test_grading_queue_service.py`
- [x] T009 [P] [US2] Ejecutar las regresiones de lote y aislamiento de FR-005 y FR-009 en `backend/tests/unit/test_calificaciones_lote_async.py` y `backend/tests/unit/test_worker_queue_routing.py`
- [x] T010 [P] [US2] Validar FR-008 y FR-009 con la regresión existente de 30 entregas concurrentes de tres docentes y reclamación idempotente en `backend/tests/integration/test_ai_job_leases.py` y `backend/tests/unit/test_tasks_grading.py`

## Fase 5: Historia 3 - Recuperar publicaciones fallidas de forma segura

**Objetivo**: conservar evidencia y reutilizar el mismo trabajo cuando Celery no acepta la publicación inicial.

**Prueba independiente**: un fallo simulado de `apply_async` confirma la calificación y marca el hijo original como recuperable.

- [x] T011 [US3] Cubrir FR-006 y FR-007 ante el fallo de broker y el estado `retrying` del mismo hijo en `backend/tests/unit/test_grading_queue_service.py`
- [x] T012 [US3] Verificar que reintento, reemplazo y mensaje duplicado de FR-007 y FR-014 permanecen cubiertos en `backend/tests/unit/test_photo_grading_persistence.py` y `backend/tests/integration/test_ai_job_leases.py`

## Fase final: Validación y trazabilidad

- [x] T013 Ejecutar Ruff y compilación para comprobar FR-012 y FR-013 según `specs/040-modularizar-cola-calificaciones/quickstart.md`
- [x] T014 Ejecutar la selección completa de pruebas backend indicada en `specs/040-modularizar-cola-calificaciones/quickstart.md`
- [x] T015 Actualizar y validar al final el gobierno Spec Kit e inventario mediante `tests/spec_governance/test_spec_baseline.py` y `scripts/build_system_inventory.py`
- [x] T016 Ejecutar `$speckit-converge`, cerrar cualquier brecha y dejar todas las tareas completas en `specs/040-modularizar-cola-calificaciones/tasks.md`

## Dependencias

- T001 y T002 preparan la trazabilidad y pueden completarse antes del cambio funcional.
- T003 y T004 preceden a T005 y T006 para proteger el comportamiento con pruebas.
- T005 precede a T006; ambos bloquean las regresiones T007, T009, T010 y T012.
- T008 y T011 amplían la misma prueba y se realizan secuencialmente para evitar conflictos de archivo.
- T013–T015 requieren que las tres historias estén implementadas.
- T016 es el cierre posterior a toda implementación y validación.

## Paralelización

- Tras T006, T009 y T010 pueden ejecutarse en paralelo porque validan archivos y capas diferentes.
- No se paralelizan T003, T008 y T011 porque modifican `test_grading_queue_service.py`.
- No se paraleliza la edición de `router.py` con `grading_queue_service.py`; el servicio se completa primero.

## Estrategia de implementación

1. Proteger primero el contrato con pruebas directas.
2. Extraer el coordinador sin alterar sus pasos ni consumidores.
3. Validar cada historia independientemente.
4. Ejecutar controles transversales y convergencia antes del PR.
