# Tareas: Digitalización y edición visual completa

**Issue**: #211 | **Rama**: `codex/101-digitalizacion-visual-completa`
**Estado**: Alcance, plan y revisión de requisitos aprobados; implementación en curso. Solo se marcan tareas comprobadas.

Rutas relativas al repositorio. Las pruebas preceden al código de cada fase. Cambiar los mismos archivos exige ejecución secuencial. No se usan documentos reales como fixtures ni se modifica producción.

## Fase 1: Preparación

- [X] T001 Registrar línea base e ignorados existentes en `specs/101-digitalizacion-visual-completa/quickstart.md`, comprobar `.gitignore`, `.dockerignore`, `backend/.dockerignore` y configuración ESLint, y conservar `specs/098-retroalimentacion-recortable/` ajeno sin incluirlo. [FR-013/015]
- [X] T002 Preparar constructores sintéticos para seis clases de documento y sus inventarios humanos en `backend/tests/fixtures/evaluation_visuals.py`; incluir cuatro tablas como imagen, gráfico circular, contexto 1–3, vectoriales y anotaciones incorrectas. No generar assets decorativos con IA. [FR-001–006; SC-001/002]

## Fase 2: Fundamentos de conservación

- [X] T003 Escribir pruebas de contrato y rechazo de referencias/valores inválidos en `backend/tests/unit/test_evaluation_visual_contract.py`: tablas rectangulares, gráficas finitas, tipos permitidos, IDs, relaciones compartidas y privacidad. [FR-003/004/014/019]
- [X] T004 Definir modelos tipados de bloques, manifiesto, cobertura, carga y propuesta en `backend/app/modules/evaluaciones/visual_schemas.py`; mantener preguntas y números anteriores compatibles. [FR-003/004/005/017/019]
- [X] T005 Escribir pruebas de migración y recursos/revisiones en `backend/tests/integration/test_evaluation_visual_persistence.py`, con registros anteriores sintéticos y comparación de notas/claves/evidencias sin backfill. [FR-002/013/016/020; SC-006/009]
- [X] T006 Añadir modelos `EvaluacionRecurso` y `EvaluacionContenidoVersion`, referencias nullable y registro en metadata en `backend/app/modules/evaluaciones/models.py`, `backend/app/modules/calificaciones/models.py` y `backend/app/db/`; crear migración aditiva en `backend/alembic/versions/` sin downgrade destructivo usado para rollback. [FR-002/013/016/020]
- [X] T007 Implementar persistencia privada validada, hash, asociación de staged, estado ready, limpieza sin referencias y lectura confinada en `backend/app/modules/evaluaciones/visual_service.py` y `backend/app/services/storage_service.py`. [FR-002/012/014/016]
- [X] T008 Implementar revisión inmutable, control optimista y conservación de baseline legacy en `backend/app/modules/evaluaciones/visual_service.py`, `service.py` y `schemas.py`; impedir cambio que afecte jobs antiguos activos sin snapshot y marcar claves afectadas para comprobación sin sobrescribirlas. [FR-006/013/018/020]
- [X] T009 Escribir pruebas y añadir endpoints de recurso/propuesta/original con permisos por ámbito en `backend/tests/integration/test_evaluation_visual_permissions.py`, `backend/app/modules/evaluaciones/visual_router.py` y registro del router; impedir exposición por rutas públicas y accesos cruzados. [FR-009/014/015; SC-007]

## Fase 3: Historia 1 — Importación completa (P1)

**Prueba independiente**: las seis muestras conservan sus elementos anotados y asociaciones; omisión/ilegibilidad visible, nunca éxito completo falso.

- [X] T010 [US1] Escribir pruebas de extracción y cobertura de PDF mixto/vectorial, Word nativo/PNG e imagen en `backend/tests/unit/test_evaluation_visual_extraction.py`, incluyendo límites efectivos y recursos duplicados con usos distintos. [FR-001–005; SC-001/002]
- [X] T011 [US1] Crear servicio conversor y pruebas de aislamiento en `document-renderer/`, `docker-compose.yml` y `.github/workflows/ci.yml`; red interna sin Internet, usuario sin privilegios, temporales, timeout, memoria/CPU, macros y vínculos externos denegados, sin uploads ni secretos montados. [FR-001/002/014/015]
- [X] T012 [US1] Implementar extractor ordenado híbrido y adaptador de conversión en `backend/app/modules/evaluaciones/document_visual_extractor.py`; inventariar texto, tablas, imágenes y vectoriales, conservar páginas/regiones legibles y anclas; no alterar helper compartido de DBA. [FR-001–005]
- [X] T013 [US1] Integrar salida visual y asociaciones revisables con normalización y clave independiente en `backend/app/modules/evaluaciones/digitalize_service.py`, `schemas.py` y `service.py`; no copiar anotaciones del alumno ni truncar silenciosamente texto/contexto. [FR-004–006/009/011]
- [X] T014 [US1] Integrar checkpoint versionado y transferencia a almacenamiento durable en `backend/app/workers/tasks_digitalization.py`; invalidar cache textual para nueva ruta, conservar original guardado y cobertura, separar temporales de recursos vigentes. [FR-002/005/012/016]

## Fase 4: Historia 2 — Revisión y documentos (P1)

**Prueba independiente**: comparar y revisar asociaciones; consultar como alumno autorizado; PDF y Word con todos los elementos, sin claves/anotaciones privadas.

- [X] T015 [US2] Escribir pruebas de round-trip y serialización segura en `frontend/src/modules/evaluaciones/components/generationWizardModel.test.ts`, `backend/tests/unit/test_evaluation_visual_contract.py` y `backend/tests/unit/test_evaluation_exports.py`. [FR-004/007–009/014]
- [X] T016 [US2] Añadir tipos y round-trip visual a `frontend/src/types/api.ts`, `frontend/src/modules/evaluaciones/api.ts`, `components/generationWizardModel.ts` y normalizadores backend; editar texto no debe eliminar recursos. [FR-004/007/013/021]
- [X] T017 [US2] Implementar `frontend/src/modules/evaluaciones/components/EvaluationContentViewer.tsx` y `EvaluationSourceReview.tsx`, con pruebas junto a componentes: zoom, tabla local, descripciones, comparar original y corregir asociaciones/seguridad publicable con foco accesible. [FR-004/005/007/009/015; SC-005]
- [X] T018 [US2] Integrar lector en revisión del wizard, `EvaluationPreviewModal.tsx`, `StudentAnswerSheet.tsx` y `StudentActivityPlayer.tsx`; ocultar original contestado, propuestas y soluciones según rol. [FR-007/009/014/021]
- [X] T019 [US2] Implementar representación determinista y material común en `backend/app/modules/evaluaciones/visual_render.py`, `export_service.py` y `backend/app/modules/herramientas/pdf_render.py`; imágenes reales, tablas y gráficas concordantes en Word/PDF, con resolución privada sin URLs arbitrarias y error explícito si falta un recurso. [FR-003/008/009/019/021; SC-003]
- [X] T020 [US2] Añadir variantes/versiones autorizadas a endpoints de documentos en `backend/app/modules/evaluaciones/router.py`; renderizar e inspeccionar PDF/Word en entorno aislado y registrar evidencias sintéticas en `specs/101-digitalizacion-visual-completa/quickstart.md`. [FR-008/014/020; SC-003]

## Fase 5: Historia 3 — Calificación con contexto correcto (P1)

**Prueba independiente**: captura de insumos en principal/verificador; revisión A fijada antes de esperar en cola se mantiene después de guardar B; contexto ausente no produce cero ni publicación.

- [X] T021 [US3] Escribir pruebas de revisión fijada, legacy, particiones y recursos multimodales en `backend/tests/unit/test_evaluation_visual_grading.py` y `backend/tests/integration/test_evaluation_visual_persistence.py`, incluidos verificador apagado y modelo sin capacidad. [FR-006/010/011/013/020; SC-004/006]
- [X] T022 [US3] Fijar revisión al iniciar entrega online, recibir foto y encolar todas las entradas de calificación en `backend/app/modules/calificaciones/router.py`, `grading_queue_service.py` y servicios de entrega; propagar ID/hash a jobs padre/hijo sin elegir nueva versión al reintentar. [FR-010/012/013/020]
- [X] T023 [US3] Leer snapshot inmutable en `backend/app/workers/tasks_grading.py` y `backend/app/modules/evaluaciones/blueprint_service.py`; incluir hash visual en fingerprint y conservar recorrido legacy sin adjuntar recursos nuevos a notas anteriores. [FR-010/012/013/020]
- [X] T024 [US3] Añadir contexto visual tipado a `backend/app/modules/calificaciones/agents.py` y `orchestrator.py`: material de pregunta separado de imagen del alumno, estímulos deduplicados y presentes en principal/verificador, propagados a particiones y reintentos, con fallback autorizado o revisión por límites/capacidad. [FR-010/011/014/021]
- [ ] T025 [US3] Integrar cobertura visual, bloqueo de publicación insuficiente y procedencia segura en `backend/app/modules/calificaciones/breakdown_policy.py`, `breakdown_service.py` y lectores de detalle: recursos históricos correctos sin cero por contexto ausente ni modificación de notas previas. [FR-011/013/015/020; SC-004/009]

## Fase 6: Historia 5 — Editor con carga o IA (P1)

**Prueba independiente**: tres orígenes × carga/IA × imagen/tabla/gráfica/dibujo; propuesta revisada, persistencia y mismas salidas/contexto, cancelación/conflicto sin sobrescritura.

- [ ] T026 [US5] Escribir pruebas de propuestas, gráficos/tablas y estados en `backend/tests/unit/test_evaluation_visual_generation.py` y `frontend/src/modules/evaluaciones/components/QuestionVisualEditor.test.tsx`; rechazar placeholders, datos inválidos, propuesta tardía y recurso ajeno. [FR-017–022; SC-008/009]
- [ ] T027 [US5] Implementar generación persistente en `backend/app/workers/tasks_evaluation_visuals.py`, `backend/app/modules/evaluaciones/visual_router.py` y `visual_service.py`: captura de configuración, servicio `image_router` existente para ilustraciones, contrato de contenido para datos, validación y persistencia staged; nunca aceptar automáticamente ni usar stub. [FR-017/018/019/022]
- [ ] T028 [US5] Implementar controles de tablas y gráficas en `frontend/src/modules/evaluaciones/components/QuestionVisualEditor.tsx` y `backend/app/modules/evaluaciones/visual_render.py`: celdas, series, categorías, etiquetas y unidades coherentes; imágenes subidas no se anuncian editables estructuradamente sin extracción revisada. [FR-017/019; SC-009]
- [ ] T029 [US5] Integrar acción opcional por pregunta en `GenerationWizard.tsx` y cliente `frontend/src/modules/evaluaciones/api.ts`: carga/IA, preview, aceptar/reemplazar/quitar, espera/error/cancelar y borrador conservado, distribución móvil de área útil sin controles permanentes redundantes. [FR-007/015/017/018/022]
- [ ] T030 [US5] Integrar guardado de propuestas y revisión de clave afectada en `backend/app/modules/evaluaciones/service.py` y `frontend/src/modules/evaluaciones/components/generationWizardModel.ts`; conservar referencias compartidas e históricas y resolver concurrencia sin sobrescribir versión nueva. [FR-013/018/020/021]
- [ ] T031 [US5] Añadir recorrido de edición visual/exportación/consulta con tres orígenes en `frontend/e2e/mock/evaluation-visuals.mock.spec.ts` y regresión de persistencia en `backend/tests/integration/test_evaluation_visual_persistence.py`. [FR-017–022; SC-008/009]

## Fase 7: Historia 4 — Recuperación (P2)

**Prueba independiente**: retomar trabajos y reintentar fallos de conversión/generación/persistencia conserva el original y no duplica evaluaciones/recursos.

- [ ] T032 [US4] Escribir pruebas de fallo/reanudación/cancelación y cache por versión en `backend/tests/unit/test_digitalization_queue.py`, `backend/tests/unit/test_evaluation_visual_generation.py` y `frontend/src/modules/evaluaciones/components/DigitalizationJobMonitor.test.tsx`. [FR-001/012/015/016/018/022]
- [ ] T033 [US4] Integrar jobs recuperables, limpieza sin referencias y mensajes docentes en `backend/app/workers/tasks_digitalization.py`, `tasks_evaluation_visuals.py`, `backend/app/modules/jobs/` y `frontend/src/modules/evaluaciones/components/DigitalizationJobMonitor.tsx`; no exponer extracción privada ni afirmar completitud con avisos críticos. [FR-005/012/014/015/016/022]

## Fase final: Validación transversal

- [ ] T034 Escribir y ejecutar matriz 360/390 px, escritorio, claro/oscuro, Chromium/WebKit en `frontend/e2e/mock/evaluation-visuals.mock.spec.ts`; revisar capturas de zoom, tablas, teclado simulado, cancelación, errores y roles. Registrar límites de emulación en `specs/101-digitalizacion-visual-completa/quickstart.md`. [FR-007/015; SC-005/007/008]
- [ ] T035 Medir seis muestras y p95 de abrir/guardar texto, fases de extracción/render y llamadas IA por estímulo en pruebas aisladas; registrar línea base y comparación en `specs/101-digitalizacion-visual-completa/quickstart.md`; optimizar si supera tolerancia del plan sin omitir contexto. [FR-012/015; SC-001/002/006]
- [ ] T036 Implementar y probar activación independiente deshabilitada por defecto de importación/editor/generación en `backend/app/core/config.py` y consumo frontend, manteniendo lectores disponibles; probar rollback operativo, límites efectivos y limpieza sin eliminar recursos guardados en `backend/tests/integration/test_evaluation_visual_persistence.py`. [FR-001/013/016; SC-006]
- [ ] T037 Actualizar dominio y contratos responsables en `specs/005-evaluaciones/`, `specs/008-calificaciones/`, `specs/012-ia-jobs-produccion/` e inventario mediante `scripts/build_system_inventory.py`; documentar rutas/estados/modelos sin secretos. [FR-014/015; constitución VII]
- [ ] T038 Ejecutar pruebas focalizadas finales, migraciones y contenedores aislados; abrir PR ligado a #211 y registrar cuatro controles CI verdes en `specs/101-digitalizacion-visual-completa/quickstart.md`. No fusionar/desplegar sin autorización separada. [FR-013/014; constitución VII/VIII]
- [ ] T039 Ejecutar Converge sobre `specs/101-digitalizacion-visual-completa/tasks.md`, añadir trabajo faltante si lo hay, completarlo y actualizar evidencia; ninguna tarea pendiente se marca completa por falta de tiempo. [FR-001–022; SC-001–009]

## Dependencias

Preparación T001–002 → fundamentos T003–009 → US1 T010–014 → US2 T015–020 → US3 T021–025 → US5 T026–031 → US4 T032–033 → validación T034–039.

Las pruebas de cada fase se redactan antes de su implementación y deben pasar antes de habilitar el siguiente consumidor. US1 es el primer incremento comprobable, pero no se activa por sí solo en producción: requiere documentos, permisos e historial completos. US5 depende del lector/exportación y revisiones; US4 termina comprobando ambos tipos de trabajo.

## Oportunidades de ejecución independiente

No se requiere delegación ni se habilita por esta lista. Una vez fijados los contratos, los casos de prueba PDF/DOCX de US1, capturas/QA de exportadores de US2, dobles de principal/verificador de US3, casos carga/IA de US5 y escenarios de fallo de US4 pueden prepararse independientemente; no tienen marcador `[P]` porque esta entrega mantiene integración secuencial sobre archivos compartidos.

## Estrategia de implementación

Incremento local seguro: conservación e importación completas primero, después lectores/documentos y calificación versionada, luego edición IA/manual y recuperación. No se publica una implementación parcial como función final. Pruebas rutinarias sin inferencias reales; no repetir la batería completa a cada cambio. CI requerido no se omite.

Cada tarea tiene referencias FR/SC; la evidencia final reside en quickstart y PR. Aprobación del plan no equivale a aprobar automáticamente la nueva lista `checklists/visual-integrity.md`, ni a autorizar merge o cambios de producción.
