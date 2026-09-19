# Tareas: retroalimentación animada con Xali

## Fase 1: Preparación

- [x] T001 Confirmar aprobaciones y documentar alcance en specs/048-retroalimentacion-animada/spec.md y plan.md.
- [x] T002 Verificar ignores y dependencias existentes sin añadir paquetes en .gitignore, .dockerignore y frontend/package.json.

## Fase 2: Fundamentos

- [x] T003 [P] Añadir pruebas del catálogo combinatorio y accesibilidad base en frontend/src/components/xali/XaliMascot.test.tsx.
- [x] T004 Implementar catálogo tipado de al menos 120 combinaciones válidas en frontend/src/components/xali/xaliStates.ts.
- [x] T005 Implementar mascota SVG modular, tamaños, temas y reducción de movimiento en frontend/src/components/xali/XaliMascot.tsx.

## Fase 3: Historia 1 — comprender el resultado

- [x] T006 [P] [US1] Añadir regresiones de selección de máximo cuatro escenas en frontend/src/modules/calificaciones/student-feedback/buildFeedbackStory.test.ts.
- [x] T007 [US1] Implementar proyección determinista del desglose publicado en frontend/src/modules/calificaciones/student-feedback/buildFeedbackStory.ts.
- [x] T008 [P] [US1] Añadir pruebas de contenido, detalle y estados provisionales en frontend/src/modules/calificaciones/student-feedback/XaliFeedbackStory.test.tsx.
- [x] T009 [US1] Implementar tarjeta de historia sin modificar GradeBreakdown en frontend/src/modules/calificaciones/student-feedback/XaliFeedbackStory.tsx.
- [x] T010 [US1] Integrar la historia antes del desglose estudiantil publicado en frontend/src/modules/evaluaciones/ResolverEvaluacionPage.tsx y su prueba.

## Fase 4: Historia 2 — control y accesibilidad

- [x] T011 [P] [US2] Probar avanzar, retroceder, pausar, omitir, repetir y modo estático en frontend/src/modules/calificaciones/student-feedback/XaliFeedbackStory.test.tsx.
- [x] T012 [US2] Añadir controles, preferencia local y recuperación estática en frontend/src/modules/calificaciones/student-feedback/XaliFeedbackStory.tsx.
- [x] T013 [US2] Añadir cobertura de movimiento reducido y tamaños críticos en frontend/e2e/accessibility/student-feedback-story.a11y.spec.ts.

## Fase 5: Historia 3 — identidad y medición sostenible

- [x] T014 [P] [US3] Ampliar pruebas de contrato analítico seguro en backend/tests/unit/test_analytics_events.py y frontend/src/lib/analytics.test.ts.
- [x] T015 [US3] Añadir eventos estudiantiles enumerados y autorización de la calificación propia en backend/app/modules/analytics/event_policy.py, backend/app/modules/analytics/service.py y frontend/src/lib/analytics.ts.
- [x] T016 [US3] Emitir telemetría no bloqueante desde frontend/src/modules/calificaciones/student-feedback/XaliFeedbackStory.tsx sin contenido académico.
- [x] T017 [P] [US3] Añadir regresión visual claro/oscuro y móvil en frontend/e2e/visual/student-feedback-story.visual.spec.ts.

## Fase final: Validación

- [x] T018 Ejecutar pruebas focalizadas backend/frontend, TypeScript, lint, build y diff check; registrar resultados en specs/048-retroalimentacion-animada/quickstart.md.
- [x] T019 Actualizar specs/README.md con issue #95 y límites de la evolución 048.
- [x] T020 Ejecutar convergencia y registrar trabajo realmente pendiente en specs/048-retroalimentacion-animada/tasks.md.

## Dependencias

T001–T002 → T003–T005 → US1 (T006–T010) → US2 (T011–T013). US3 (T014–T017) puede iniciar tras T005 y el contrato de historia. T018–T020 requieren las historias terminadas.

MVP: T001–T012 ofrece la historia completa, controlada y con degradación segura. La instrumentación T014–T016 es separable y nunca bloquea el MVP.

Trabajo paralelo: T003/T006/T008 escriben pruebas diferentes; T014 divide backend/frontend; T013/T017 usan suites E2E separadas.
