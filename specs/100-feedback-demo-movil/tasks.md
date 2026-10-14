# Tareas: retroalimentación legible y acceso al inicio

## Fase 1: Preparación

- [x] T001 Registrar aprobación y simplificación autorizada y revisar specs/100-feedback-demo-movil/checklists/ux.md, spec.md y plan.md (FR-001, FR-010).
- [x] T002 Analizar consistencia de specs/100-feedback-demo-movil/spec.md, plan.md y tasks.md antes de implementar (FR-001, FR-010).

## Fase 2: Fundamentos

- [x] T003 Definir helpers de cálculo provisional y decimal exacto con pruebas en frontend/src/modules/calificaciones/components/gradeCalculationPresentation.ts y gradeCalculationPresentation.test.ts (FR-003, FR-004, FR-005).

## Fase 3: Historia 1

Prueba independiente: feedback largo íntegro, edición autorizada, borrador protegido.

- [x] T004 [US1] Añadir pruebas de lectura, edición, descarte y permisos en frontend/src/modules/calificaciones/components/GradeFeedback.test.tsx (FR-001, FR-002, FR-010).
- [x] T005 [US1] Implementar GradeFeedback.tsx e integrarlo en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx conservando guardado y dirty guards (FR-001, FR-002, FR-009, FR-010).

## Fase 4: Historia 2

Prueba independiente: sugerida 2.5 y provisional 1.85 con dos pendientes; decimal 0.6250 intacto.

- [x] T006 [US2] Integrar contexto de presentación en frontend/src/modules/calificaciones/components/GradeBreakdown.tsx, GradeFormula.tsx y CalificacionesWorkspace.tsx; regresiones en CalificacionesWorkspace.mobile.test.tsx (FR-003, FR-004).
- [x] T007 [US2] Normalizar valor, referencia dirty y máximo en frontend/src/modules/calificaciones/components/GradeComponentEditor.tsx con GradeComponentEditor.test.tsx (FR-005, FR-010).

## Fase 5: Historia 3

Prueba independiente: guía desde tres entradas, ambos teléfonos, cerrar sin cambiar sesión.

- [x] T008 [US3] Añadir pruebas de guía, variantes, cierre y standalone en frontend/src/components/install/HomeScreenShortcut.test.tsx (FR-006, FR-007, FR-008, FR-010).
- [x] T009 [US3] Implementar guía/botón reutilizables en frontend/src/components/install/HomeScreenShortcut.tsx, sin eventos de instalación ni cambios a main.tsx (FR-007, FR-008, FR-009, FR-010).
- [x] T010 [US3] Integrar entradas en frontend/src/modules/auth/LandingPage.tsx, LoginPage.tsx y frontend/src/components/layout/Topbar.tsx preservando sesión, roles y manifest (FR-006, FR-008).

## Fase final: Validación

- [x] T011 Ejecutar interacción y revisión visual focalizada de Chromium/WebKit con fixtures de frontend/e2e/fixtures/explainableGrading.ts y regresión en frontend/e2e/mock/grading-review.mock.spec.ts y guía de acceso; documentar resultados en specs/100-feedback-demo-movil/quickstart.md (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010).
- [x] T012 Ejecutar typecheck, lint, unidades aplicables, build y audits; registrar evidencia en specs/100-feedback-demo-movil/quickstart.md (FR-009, FR-010).
- [x] T013 Actualizar specs/002-arquitectura-roles-seguridad/spec.md, specs/008-calificaciones/spec.md, specs/README.md, tests/spec_governance/test_spec_baseline.py e inventario con scripts/build_system_inventory.py (FR-001, FR-010).
- [x] T014 Ejecutar Converge, documentar límites y completar trabajo implementable en specs/100-feedback-demo-movil/tasks.md y quickstart.md antes del PR (FR-001, FR-010).

## Dependencias y estrategia

T001 → T002 → T003; US1 T004 → T005; US2 T006 → T007; US3 T008 → T009 → T010. Validar tras historias, documentar y converger al final. MVP US1, después US2/US3, sin despliegues parciales. Preparación de pruebas de historias independientes puede solaparse; integración en workspace se hace secuencial. No requiere subagentes.

## Phase 6: Convergence

- [x] T015 Reservar altura real de MobileReviewActionBar en el scroller de frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y probar ocultación/limpieza en CalificacionesWorkspace.mobile.test.tsx; comprobar WebKit con poca altura sin botones interceptados (FR-009, SC-001; partial).

Hallazgo F1, HIGH, FR-009: WebKit emulado 390×664, navegación Retroalimentación interceptada por barra inferior. Región extendida bajo la barra fija pese al padding de contenido. Reserva medida y liberada durante escritura; sin cambios académicos ni nuevos controles.
