# Tareas: cámara real y evaluación completa

Spec/plan aprobados y lista UX revisada con autorización el 2026-10-17. No confundir tareas de implementación con requisitos revisados.

## Fase 1: Preparación

- [x] T001 Crear especificación, investigación, diseño y guía en specs/102-camara-visor-completo/ usando las plantillas activas; aislar de Spec 101.
- [x] T002 Registrar aprobación humana de spec/plan y revisión de specs/102-camara-visor-completo/checklists/ux.md; resolver inconsistencias antes de implementar.

## Fase 2: Fundamentos

- [x] T003 Definir regresiones de identidad de contexto, envío explícito y permisos compartidos en frontend/src/components/evidence/MultiPageEvidencePicker.test.tsx y frontend/src/modules/evaluaciones/components/EvaluationPreviewModal.test.tsx (FR-002, FR-004, FR-005, FR-009, FR-011).

## Fase 3: Historia 1 — tomar una foto

**Meta**: cámara visible, confirmación y recuperación sin pérdida ni envío automático.
**Prueba independiente**: aceptar/repetir/cancelar una captura sintética y conservar el paquete correcto.

- [x] T004 [US1] Añadir pruebas de permisos, cancelación tardía, ocultación y limpieza antes de implementar CameraCapture en frontend/src/components/evidence/CameraCapture.test.tsx (FR-001–004, FR-010, SC-001).
- [x] T005 [US1] Implementar cámara sin audio, vídeo inline, foto revisable, errores humanos y ciclo de sesión en frontend/src/components/evidence/CameraCapture.tsx (FR-001–004, FR-010).
- [x] T006 [US1] Integrar captura/alternativa y reemplazo mediante addFiles en frontend/src/components/evidence/MultiPageEvidencePicker.tsx; pasar contexto opaco desde frontend/src/modules/materias/MateriaCalificar.tsx y frontend/src/modules/evaluaciones/ResolverEvaluacionPage.tsx; conservar pruebas de calidad, orden y límites (FR-001–005, FR-011, SC-004).
- [x] T007 [US1] Auditar política real en nginx/templates/default.conf.template y frontend/Dockerfile; alinear cámara propia de frontend/nginx.conf sin ampliar otros permisos; incluir prueba efectiva de headers en frontend/e2e/camera-capture.spec.ts o prueba de contenedor apropiada (FR-001, FR-003, FR-011).
- [x] T008 [US1] Añadir flujos sintéticos de captura/denegación/cancelación/contexto y responsividad en frontend/e2e/camera-capture.spec.ts, sin envíos académicos (FR-001–005, FR-010–011, SC-001, SC-003–004).

## Fase 4: Historia 2 — leer la evaluación completa

**Meta**: documento amplio, todas las páginas accesibles, descargas discretas y soluciones protegidas.
**Prueba independiente**: recorrer veinte páginas, abrir opciones y descargar versión autorizada.

- [x] T009 [P] [US2] Ampliar regresiones de render acotado, scroll, errores/cancelación, versión y opciones en frontend/src/modules/evaluaciones/components/EvaluationPdfViewer.test.tsx y EvaluationPreviewModal.test.tsx (FR-006–010, SC-002–004).
- [x] T010 [US2] Implementar páginas con espacios reservados, ventana máxima de tres canvases, cola serial, texto/reintento y limpieza en frontend/src/modules/evaluaciones/components/EvaluationPdfViewer.tsx y EvaluationPdfPage.tsx (FR-006, FR-010, SC-002).
- [x] T011 [US2] Distribuir lectura/controles con un scroll y opciones accesibles en frontend/src/modules/evaluaciones/components/EvaluationPreviewModal.tsx; mantener permisos, cancelación y descargas sin cambiar otros modales (FR-007–011, SC-003–004).
- [x] T012 [US2] Adaptar frontend/e2e/evaluation-preview.spec.ts con documento de veinte páginas, píxeles/texto, opciones/descargas/permisos, área útil y responsividad; incluir ambas suites en Chromium/WebKit mediante frontend/playwright.config.ts (FR-006–011, SC-002–004).

## Fase final: Validación

- [x] T013 Actualizar contratos/spec/plan/tasks de propietarios specs/005-evaluaciones/ y specs/008-calificaciones/ y specs/README.md; comprobar inventario y documentar comandos/resultados en specs/102-camara-visor-completo/quickstart.md (FR-001–011).
- [x] T014 Ejecutar las pruebas focalizadas, typecheck/lint/build/auditorías y E2E de quickstart, Analyze y Converge; añadir tareas restantes si faltan capacidades y cerrarlas antes del PR listo en specs/102-camara-visor-completo/tasks.md (FR-001–011, SC-001–004).

## Dependencias

T001 → T002 → T003. US1: T004 → T005 → T006; T007/T008 tras integración. US2: T009 → T010 → T011 → T012. T013/T014 tras ambas historias. Las pruebas independientes preceden al código correspondiente.

## Oportunidades paralelas

US1: pruebas de cámara y auditoría de configuración usan archivos distintos; coordinar integración después. US2: T009 puede prepararse sin tocar CameraCapture, pero el test del modal se comparte con T003 y debe secuenciarse. No se requiere delegación de implementación.

## Estrategia

Primero captura completa y regresiones, luego lectura completa y regresiones; validar ambas juntas sin datos reales. Las historias son demostrables por separado, pero este PR entrega ambas. Abrir PR después de completar implementación y Converge; añadir etiquetas de aprobación únicamente con evidencia humana. Fusión por squash con HEAD exacto y CI verde, sin eludir controles.

## Mapa de requisitos

| Requisito | Tareas |
|---|---|
| FR-001 | T004–T008 |
| FR-002 | T003–T006, T008 |
| FR-003 | T004–T008 |
| FR-004 | T003–T006, T008 |
| FR-005 | T003, T006, T008 |
| FR-006 | T009–T010, T012 |
| FR-007 | T009, T011–T012 |
| FR-008 | T009, T011–T012 |
| FR-009 | T003, T009, T011–T012 |
| FR-010 | T004–T005, T008–T012 |
| FR-011 | T003, T006–T008, T011–T014 |

Todos los requisitos además participan en T013/T014. SC-001: T004/T008; SC-002: T009/T010/T012; SC-003: T008/T011/T012; SC-004: T003/T006/T009/T012/T014.
