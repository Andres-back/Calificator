# Tareas: cámara nativa en celular

Issue #268. Plan/spec aprobados el 2026-10-25. No incluye fusión ni despliegue. Las pruebas usan archivos sintéticos, sin IA ni datos académicos reales.

## Fase 1: Preparación

- [X] T001 Registrar aprobación y revisar los ocho requisitos de `specs/127-camara-nativa-movil/checklists/captura.md`; inspeccionar contratos e ignores existentes.

## Fase 2: Fundamentos

- [X] T002 Escribir pruebas de política de dispositivo y ciclo de selección por intento en `frontend/src/components/evidence/nativeCapture.test.ts` (FR-001, FR-002, FR-005, FR-006, FR-007, FR-008).
- [X] T003 Implementar política móvil/tableta y selector de archivo con handlers y limpieza por apertura en `frontend/src/components/evidence/nativeCapture.ts`, sin depender de ancho, efectos o foco (FR-001, FR-002, FR-005, FR-006, FR-007, FR-008).

## Fase 3: Historia 1 — captura del teléfono

**Prueba independiente**: perfil iPhone/Android/iPad solicita captura trasera, acepta una foto, permite ampliarla y tomar otra, sin getUserMedia ni POST.

- [X] T004 [US1] Añadir pruebas móviles, formatos, cancelación y captura explícita en `frontend/src/components/evidence/MultiPageEvidencePicker.test.tsx` (FR-001, FR-002, FR-003, FR-005, FR-009, SC-001).
- [X] T005 [US1] Enrutar acciones de foto a cámara nativa en móvil y conservar subida independiente en `frontend/src/components/evidence/MultiPageEvidencePicker.tsx` (FR-001, FR-002, FR-003, FR-005, FR-009).
- [X] T006 [US1] Añadir recorridos nativos sintéticos y vista ampliada en `frontend/e2e/native-camera-capture.spec.ts` y registrarlos en `frontend/playwright.config.ts`, distinguiendo emulación de hardware (FR-001, FR-003, FR-011, SC-001, SC-004).

## Fase 4: Historia 2 — conservación y contexto

**Prueba independiente**: dos hojas y reemplazo conservan orden; cancelar no cambia el paquete; un retorno A→B→A se descarta y hidden→visible válido se acepta.

- [X] T007 [US2] Añadir regresiones de reemplazo, dos fotos, cancelación silenciosa, resultados/quality tardíos y A→B→A en `frontend/src/components/evidence/MultiPageEvidencePicker.test.tsx` (FR-004, FR-005, FR-006, FR-007, FR-010, SC-002, SC-003).
- [X] T008 [US2] Reforzar época de contexto, aceptación única y limpieza al deshabilitar/desmontar en `frontend/src/components/evidence/MultiPageEvidencePicker.tsx`, manteniendo validaciones y análisis de calidad (FR-004, FR-005, FR-006, FR-007, FR-010).
- [X] T009 [US2] Cubrir dos hojas, reemplazo, cancelación y ausencia de POST en `frontend/e2e/native-camera-capture.spec.ts` (FR-004, FR-005, SC-002, SC-003).

## Fase 5: Historia 3 — PC y consumidores

**Prueba independiente**: PC estrecho conserva webcams/selector; los cuatro consumidores mantienen permisos, límites y envío explícito.

- [X] T010 [US3] Ejecutar y ampliar regresiones PC de `frontend/src/components/evidence/CameraCapture.test.tsx` y `frontend/e2e/camera-capture.spec.ts` sin retirar cobertura 102/103 (FR-007, FR-008, FR-009, SC-004).
- [X] T011 [US3] Revisar y probar consumidores mediante `frontend/src/modules/materias/MateriaCalificar.test.tsx`, `frontend/src/modules/calificaciones/components/GradeReprocessing.test.tsx`, `frontend/src/modules/evaluaciones/components/DigitalizarEvaluacionModal.test.tsx` y `frontend/src/modules/evaluaciones/ResolverEvaluacionPage.test.tsx`; añadir casos nativos aplicables sin cambiar payloads ni permisos (FR-010, FR-012, SC-005).

## Fase final: Validación

- [X] T012 Actualizar referencias de extensión de `specs/102-camara-visor-completo/spec.md`, `specs/103-camaras-iconos-admin/spec.md`, `specs/113-digitalizacion-documento-completo/spec.md`, dominios responsables y `specs/README.md`, según rutas existentes.
- [X] T013 Ejecutar typecheck, lint estricto, pruebas unitarias aplicables, build y auditorías de `frontend/package.json`; registrar resultados en `specs/127-camara-nativa-movil/quickstart.md`.
- [X] T014 Ejecutar Playwright Chromium/WebKit: casos 127, regresiones 102/103/113 y matriz de anchura/tema/orientación definida en `frontend/e2e/native-camera-capture.spec.ts`; registrar pruebas físicas como pendientes si no hay dispositivo disponible en `specs/127-camara-nativa-movil/quickstart.md` (SC-001 a SC-005).
- [X] T015 Regenerar/comprobar `specs/system-inventory/current.json` y sus derivados mediante `scripts/build_system_inventory.py`, ejecutar gobernanza y validador PR aplicables, conservando todas las protecciones; registrar evidencia en `specs/127-camara-nativa-movil/quickstart.md`.
- [X] T016 Ejecutar convergencia contra spec/plan/tareas, resolver brechas y registrar estado final local en `specs/127-camara-nativa-movil/quickstart.md`, sin afirmar CI remoto, cámara física ni producción verificados si no se comprobaron.

## Dependencias y paralelismo

T001 → T002 → T003 → T004 → T005 → T006. T007 → T008 → T009 sigue a fundamentos; T010/T011 después de integración compartida. T012–T016 cierran entrega local en orden (inventario después de últimas ediciones de código/pruebas).

T006 y T007 admiten preparación independiente en archivos diferentes después de T005; T010 y T011 admiten ejecución independiente. No editar simultáneamente el picker. No se requiere delegación para ejecutar estas oportunidades.

## Estrategia

MVP: fundamentos + US1. Continuar US2 antes de entregar para proteger evidencias. US3 preserva comportamiento de PC y contratos; terminar con validación y convergencia. CI verde es condición posterior de cualquier fusión autorizada, no sustituye las pruebas físicas ni autoriza producción manual.

## Coordinación 131: evidencia docente revisable

Conserva captura nativa en teléfono y webcam/selector en PC. El editor revisable se abre después de recibir la foto; no reintroduce una cámara móvil en un recuadro pequeño. La prueba física sigue siendo un gate independiente. Contratos y validación se registran en [Spec131](../131-escaneo-evidencias/spec.md), [plan](../131-escaneo-evidencias/plan.md) y [tareas](../131-escaneo-evidencias/tasks.md), issue #276. Esta coordinación no certifica cierre, CI, teléfonos físicos ni activación productiva.
