# Tareas: Acelerar los procesos de IA

## Fase 1: Preparación

- [X] T001 Registrar la línea base anonimizada y los comandos de medición en `specs/031-acelerar-pipelines-ia/quickstart.md`
- [X] T002 [P] Añadir fixtures deterministas de latencia, truncado y fallos de proveedor en `backend/tests/fixtures/ai_pipeline_performance.py`
- [X] T003 [P] Añadir utilidades de prueba para lotes de 30 entregas sin llamadas pagadas en `backend/tests/fixtures/grading_batch.py`
- [X] T004 Verificar patrones de secretos, artefactos y builds en `.gitignore`, `.dockerignore` y `frontend/eslint.config.js`

## Fase 2: Fundamentos

- [X] T005 Escribir pruebas de migración y compatibilidad de trabajos históricos en `backend/tests/integration/test_ai_job_leases.py`
- [X] T006 Crear la migración aditiva de relación padre-hijo, entrega, etapa, intentos y lease en `backend/alembic/versions/202609030001_ai_job_leases.py`
- [X] T007 Ampliar estados y esquemas persistentes de trabajos en `backend/app/shared/enums.py` y `backend/app/modules/jobs/schemas.py`
- [X] T008 Implementar creación, claim, heartbeat, expiración y agregación idempotente en `backend/app/modules/jobs/service.py`
- [X] T009 [P] Escribir pruebas de presupuestos de salida y terminación incompleta para ambos contratos OpenCode en `backend/tests/unit/test_llm_router_output_budget.py`
- [X] T010 Aplicar presupuestos uniformes y detección de respuesta truncada en `backend/app/services/llm_router.py`
- [X] T011 Configurar routing explícito de colas y límites de proveedor en `backend/app/workers/worker.py` y `backend/app/core/config.py`

## Fase 3: Historia 1 — Calificación rápida, transparente y sin cero provisional

**Objetivo**: una entrega recién confirmada queda visible como “Calificando”, conserva transparencia completa y jamás muestra una nota inexistente como cero.

**Prueba independiente**: subir una foto, recorrer vistas de estudiante/profesor mientras el proveedor simulado espera y confirmar que todas muestran “Calificando”; después devolver cero real y comprobar que sí aparece `0.0`.

- [X] T012 [P] [US1] Escribir regresiones backend para entrega/calificación `procesando` y nota nula en `backend/tests/unit/test_photo_grading_persistence.py`
- [X] T013 [P] [US1] Escribir regresiones frontend de estado “Calificando” frente a cero real en `frontend/src/modules/evaluaciones/studentProgress.test.ts`, `frontend/src/modules/calificaciones/gradePresentation.test.ts` y el formulario existente `frontend/src/modules/evaluaciones/ResolverEvaluacionPage.test.tsx`
- [X] T014 [US1] Persistir entrega y calificación provisional como `procesando` desde el commit inicial en `backend/app/modules/calificaciones/photo_service.py` y `backend/app/modules/calificaciones/router.py`
- [X] T015 [US1] Proyectar el estado transitorio sin convertir notas nulas en cero en `backend/app/modules/evaluaciones/service.py` y `backend/app/modules/calificaciones/service.py`
- [X] T016 [US1] Centralizar la representación de nota ausente/cero real en `frontend/src/modules/calificaciones/gradePresentation.ts`
- [X] T017 [US1] Aplicar “Calificando” sin número en listas, detalle, boletín y resolución en `frontend/src/modules/evaluaciones/studentProgress.ts`, `frontend/src/modules/evaluaciones/ResolverEvaluacionPage.tsx`, `frontend/src/modules/calificaciones/CalificacionesPage.tsx`, `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y `frontend/src/modules/materias/MateriaBoletin.tsx`
- [X] T018 [US1] Publicar etapas y tiempos del pipeline sin modificar el desglose por respuesta en `backend/app/modules/calificaciones/orchestrator.py` y `backend/app/workers/tasks_grading.py`

## Fase 4: Historia 2 — Digitalización sin repetición

**Objetivo**: una evidencia se lee una sola vez, conserva resultados parciales y muestra etapas comprensibles.

**Prueba independiente**: digitalizar una página y un PDF multihoja con un extractor contado; cada archivo visual se envía una vez y produce un borrador editable.

- [X] T019 [P] [US2] Añadir pruebas de extracción única, multihoja y recuperación en `backend/tests/unit/test_digitalization_queue.py`
- [X] T020 [US2] Persistir extracción normalizada y reutilizarla en estructuración/reintentos en `backend/app/workers/tasks_digitalization.py` y `backend/app/modules/evaluaciones/digitalize_service.py`
- [X] T021 [US2] Exponer y representar etapas de digitalización en `backend/app/modules/jobs/router.py` y `frontend/src/modules/evaluaciones/components/DigitalizationJobMonitor.tsx`

## Fase 5: Historia 3 — Presentaciones menores de 120 segundos

**Objetivo**: conservar diapositivas válidas, reparar solo defectos y acotar salida sin reducir calidad pedagógica.

**Prueba independiente**: generar ocho diapositivas con una inválida; solo esa diapositiva se reenvía, los tres formatos comparten contenido y la prueba simulada termina dentro del presupuesto.

- [X] T022 [P] [US3] Añadir pruebas de reparación localizada, revisión condicional y presupuesto temporal en `backend/tests/unit/test_presentaciones_performance.py`
- [X] T023 [US3] Sustituir regeneraciones completas por validación determinista y reparación focalizada en `backend/app/modules/presentaciones/service.py`
- [X] T024 [US3] Dimensionar el esquema/presupuesto de salida según cantidad de diapositivas en `backend/app/modules/presentaciones/service.py` y `backend/app/services/llm_router.py`
- [X] T025 [US3] Persistir progreso de contenido, reparación, imágenes y exportación en `backend/app/modules/presentaciones/service.py` y `backend/app/workers/tasks_presentations.py`
- [X] T026 [US3] Mostrar etapa, tiempo e imágenes completadas sin sondeo agresivo en `frontend/src/modules/presentaciones/PresentacionesPage.tsx` y `frontend/src/modules/presentaciones/api.ts`

## Fase 6: Historia 4 — Modelos adecuados por función

**Objetivo**: orientar selección de texto, visión e imagen con telemetría segura, respetando excepciones explícitas.

**Prueba independiente**: seleccionar un modelo compatible pero ineficiente, guardar con confirmación y comprobar que se usa la elección y se registra rendimiento sin secretos.

- [X] T027 [P] [US4] Escribir pruebas de capacidad, muestra insuficiente y excepción explícita en `backend/tests/unit/test_admin_ai_model_performance.py`
- [X] T028 [US4] Ampliar catálogo y métricas agregadas por función/modelo en `backend/app/modules/admin_ai_config/usage_service.py` y `backend/app/modules/admin_ai_config/router.py`
- [X] T029 [US4] Mostrar capacidades, p50/p95, tamaño de muestra y confirmación de ineficiencia en `frontend/src/modules/admin/AdminAIConfigPage.tsx` y `frontend/src/modules/profesor_ai/TeacherAIConfigPage.tsx`

## Fase 7: Historia 5 — Aislamiento entre profesores y funciones

**Objetivo**: reservar capacidad para calificaciones y evitar que presentaciones bloqueen otros procesos.

**Prueba independiente**: mantener una presentación activa e iniciar calificación y digitalización desde tres profesores; cada función comienza en su cola.

- [X] T030 [P] [US5] Añadir prueba de routing y recuperación por cola en `backend/tests/unit/test_worker_queue_routing.py`
- [X] T031 [US5] Dividir workers `grading`, `digitalization`, `presentations` y `default` con concurrencia configurable en `docker-compose.yml` y `.env.example`
- [X] T032 [US5] Enrutar publicación inicial y recuperación a la misma cola en `backend/app/modules/jobs/service.py`, `backend/app/modules/calificaciones/router.py`, `backend/app/modules/evaluaciones/router.py` y `backend/app/modules/presentaciones/router.py`

## Fase 8: Historia 6 — Cola grupal de 30 evidencias

**Objetivo**: procesar cada estudiante independientemente con resumen agregado, recuperación y cero duplicados.

**Prueba independiente**: confirmar 30 imágenes/30 estudiantes, inducir un fallo y una caída de worker; 29 continúan, el afectado se recupera o queda identificado y no aparece ninguna asignación cruzada.

- [X] T033 [P] [US6] Escribir pruebas de validación atómica, padre/hijos y asociaciones en `backend/tests/unit/test_calificaciones_lote_async.py`
- [X] T034 [P] [US6] Escribir prueba de carga simulada 30/30, fallo aislado y worker perdido en `backend/tests/integration/test_grading_batch_30.py`
- [X] T035 [US6] Crear el padre y un hijo persistente por entrega antes de publicar mensajes en `backend/app/modules/calificaciones/router.py` y `backend/app/modules/jobs/service.py`
- [X] T036 [US6] Reemplazar el bucle secuencial por una tarea idempotente por entrega y agregación del padre en `backend/app/workers/tasks_grading.py`
- [X] T037 [US6] Añadir detalle paginado, resumen y reintento selectivo autorizados en `backend/app/modules/jobs/router.py` y `backend/app/modules/jobs/schemas.py`
- [X] T038 [P] [US6] Añadir cliente y pruebas de resumen grupal sin 30 sondeos independientes en `frontend/src/modules/calificaciones/gradingJobs.ts` y `frontend/src/modules/calificaciones/GradingJobMonitor.test.tsx`
- [X] T039 [US6] Mostrar conteos del lote y avance individual de la sesión en `frontend/src/modules/calificaciones/GradingJobMonitor.tsx` y `frontend/src/modules/calificaciones/SalonPage.tsx`

## Fase final: Validación y despliegue

- [X] T040 Ejecutar pruebas backend focalizadas y corregir regresiones de calificación, jobs, digitalización y presentaciones
- [X] T041 Ejecutar lint, TypeScript, pruebas frontend focalizadas y build de producción
- [X] T042 Ejecutar migración y prueba Docker de workers/healthchecks en entorno local
- [X] T043 Ejecutar la matriz de `specs/031-acelerar-pipelines-ia/quickstart.md` con proveedores simulados y registrar resultados anonimizados
- [X] T044 Ejecutar `$speckit-converge`, cerrar tareas restantes y comprobar que no quedan brechas de implementación sin tarea trazable
- [X] T045 Preparar y abrir PR asociado al issue #64 con CI obligatorio, smoke mínimo y rollback documentados

## Dependencias

- Fase 2 bloquea todas las historias porque define persistencia, leases, límites de salida y routing.
- US1 puede completarse primero como corrección visible e independiente.
- US2, US3 y US4 pueden avanzar después de Fundamentos sin depender entre sí.
- US5 debe preceder la prueba final de US6 para disponer de capacidad reservada.
- US6 depende de T006–T008 y T011; no depende de cambios visuales de presentaciones.
- La fase final depende de todas las historias completas.

## Oportunidades paralelas

- T002 y T003; T009 mientras se diseña la migración; T012 y T013; T019 y T022; T027 y T030; T033, T034 y T038 afectan archivos distintos.
- Las pruebas marcadas `[P]` pueden escribirse en paralelo, pero cada implementación corre después de su prueba correspondiente.

## Estrategia incremental

1. Entregar primero US1: estado “Calificando” y eliminación del cero provisional.
2. Activar presupuestos uniformes y presentaciones focalizadas.
3. Separar workers y convertir la cola de 30 en padre/hijos.
4. Desplegar gradualmente, medir y ajustar concurrencia sin cancelar solicitudes activas.

## Fase 9: Convergencia

- [X] T046 Conectar una preparación y confirmación grupal de hasta 30 evidencias con `POST /api/calificaciones/lote/asincrono`, persistir el padre en el monitor y cubrir el flujo con pruebas por FR-026 y US6/AC1 (partial)
- [X] T047 Rechazar evidencias binarias duplicadas antes de persistir el lote y eliminar archivos ya guardados si la transacción falla, con regresiones que demuestren atomicidad por FR-027 y SC-011 (partial)
- [X] T048 Mostrar el detalle paginado de casos del lote y permitir reintentar solo hijos fallidos no revisados desde el monitor, con pruebas de autorización y estado por FR-029 y US6/AC2-AC4 (partial)

## Trazabilidad de requisitos

- T001, T018, T021, T025, T026, T039 y T043 cubren FR-001, FR-002, FR-004, FR-008 y FR-022.
- T005, T006, T007, T008, T020, T032, T034, T035, T036 y T037 cubren FR-003, FR-020, FR-021, FR-025, FR-028, FR-030, FR-031 y FR-032.
- T009, T010, T022, T023, T024 y T025 cubren FR-009, FR-010, FR-011, FR-012, FR-013 y FR-014.
- T012, T013, T014, T015, T016, T017, T018 y T040 cubren FR-015, FR-016, FR-017, FR-033, FR-034 y FR-035.
- T027, T028 y T029 cubren FR-005, FR-006, FR-007, FR-023 y FR-024.
- T011, T030, T031 y T032 cubren FR-018 y FR-019.
- T033, T034, T035, T036, T037, T038, T039, T046, T047 y T048 cubren FR-026, FR-027, FR-028, FR-029, FR-030, FR-031 y FR-032.
