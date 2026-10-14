# Tareas: revisión docente enfocada

Alcance/plan y revisión asistida autorizados el 2026-10-14. Sin autorización de fusión/despliegue.

## Fase 1: Preparación

- [x] T001 Registrar aprobación y revisar requisitos en specs/099-revision-docente-enfocada/checklists/ux.md; conservar 098 fuera del cambio.

## Fase 2: Fundamentos

- [x] T002 Leer contratos/guardas y analizar cobertura de specs/099-revision-docente-enfocada/tasks.md; verificar ignores existentes sin cambios ajenos.

## Fase 3: Historia 1 — resumen claro

- [x] T003 [US1] Añadir pruebas de discrepancia pendiente/decidida y priorización en frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx y review-triage/ReviewTriagePanel.test.tsx antes de implementación. FR-001, FR-003, FR-004; SC-001, SC-003, SC-004.
- [x] T004 [US1] Corregir GradeNoteExplanation e introducir resumen compacto de avisos en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y review-triage/ReviewTriagePanel.tsx, preservando detalle íntegro. FR-001, FR-003, FR-004.

## Fase 4: Historia 2 — accesos claros

- [x] T005 [US2] Añadir pruebas de navegación y reclamos en frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx y componentes de revisión asociados. FR-002, FR-005, FR-006, FR-007, FR-008; SC-002, SC-006.
- [x] T006 [US2] Crear navegación de revisión reusable en frontend/src/modules/calificaciones/ReviewNavigation.tsx e integrar panel único móvil, identidad y opciones/historial en CalificacionesWorkspace.tsx. FR-002, FR-005, FR-006, FR-008.
- [x] T007 [US2] Reorganizar IncidenciasSection en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx: acceso contextual, contador, alta, errores y conservación de formularios. FR-007.

## Fase 5: Historia 3 — conservación

- [x] T008 [US3] Probar y conservar enlaces de pregunta/hoja, borradores, permisos, estados y ausencia de mutación por navegar en frontend/e2e/mock/grading-review.mock.spec.ts y pruebas relacionadas. FR-009, FR-010, FR-011; SC-005.
- [x] T009 [US3] Validar distribución móvil/escritorio, comparación y barra inferior durante escritura en frontend/e2e/mock/; documentar límites de teclado físico en specs/099-revision-docente-enfocada/quickstart.md. FR-008, FR-009, FR-010; SC-006.

## Fase final: Validación

- [x] T010 Ejecutar typecheck/lint/build y regresiones focalizadas del frontend; registrar resultados en specs/099-revision-docente-enfocada/quickstart.md. FR-011, SC-001..006.
- [x] T011 Ejecutar Converge, actualizar propietario specs/008-calificaciones/spec.md e inventario/gobernanza aplicables; mantener evidencia y pendientes honestos en specs/099-revision-docente-enfocada/tasks.md.

## Dependencias y estrategia

T001 → T002 → pruebas T003/T005 → T004 → T006 → T007 → T008/T009 → T010 → T011. No delegación necesaria. Pruebas de modelo y navegación en archivos distintos podrían ejecutarse en paralelo; cambios al workspace se hacen secuencialmente. MVP US1 no se despliega solo: conservar las tres historias antes de pedir PR/fusión.

## Fase 7: Convergencia

- [x] T012 Ajustar a 44 px cuatro controles pequeños de evidencia y pregunta vinculada a reclamo en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx; comprobar tamaño y reconstruir antes de entregar, por FR-008 y Constitución V (partial).

## Corrección autorizada tras CI

- [x] T013 Registrar 099 en ALL_SPECS de tests/spec_governance/test_spec_baseline.py, reproducir el control sobre archivos versionados sin incluir la propuesta 098 y actualizar specs/099-revision-docente-enfocada/quickstart.md; autorización «SI» del 2026-10-14. No cambiar aserciones ni aplicación (FR-011).
