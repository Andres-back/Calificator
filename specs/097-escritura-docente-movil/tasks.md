# Tareas: escritura docente móvil

## Fase 1: preparación

- [x] T001 Registrar aprobaciones y revisar lista autorizada `specs/097-escritura-docente-movil/checklists/escritura.md`, contexto e ignores (FR-012).

## Fase 2: fundamentos

- [x] T002 Ejecutar Analyze de `specs/097-escritura-docente-movil/spec.md`, `plan.md` y `tasks.md` antes del código (FR-001–FR-012).

## Fase 3: US1 — escribir cómodamente

Prueba independiente: abrir sin teclado, escribir con altura reducida, terminar con Listo sin submit.

- [x] T003 [US1] Añadir pruebas previas de viewport/foco/fallback/cleanup y Modal opt-in en `frontend/src/hooks/useMobileFormViewport.test.tsx` y `frontend/src/components/ui/Modal.test.tsx` (FR-002, FR-003, FR-004, FR-005, FR-007, FR-009, FR-010).
- [x] T004 [US1] Implementar `frontend/src/hooks/useMobileFormViewport.ts` y soporte opt-in en `frontend/src/components/ui/Modal.tsx`, sin cambiar defaults de otros diálogos (FR-002, FR-003, FR-004, FR-005, FR-007, FR-009, FR-010).
- [x] T005 [US1] Añadir regresiones de apertura/escritura/Listo/persistencia y bloqueo en `frontend/src/modules/evaluaciones/components/GenerationWizard.test.tsx` (FR-001, FR-002, FR-003, FR-005, FR-007, FR-008, FR-011).
- [x] T006 [US1] Integrar modo compacto manteniendo campos montados en `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx` y `EvaluationPreparation.tsx`, con viewport, Listo y errores conservados (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-011).

## Fase 4: US2 — manual y opciones progresivas

Prueba independiente: manual/IA conservan opciones al plegar, textos pendientes y controles legibles.

- [x] T007 [US2] Añadir regresiones del manual compartido y contexto en `frontend/src/modules/materias/MateriaEvaluaciones.test.tsx` y pruebas de formulario de `frontend/src/modules/evaluaciones/` (FR-001, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010).
- [x] T008 [US2] Adaptar formulario manual/DynamicTextList en `frontend/src/modules/evaluaciones/EvaluacionesPage.tsx`, plegando secundarios con resumen, texto legible y botones estables, manteniendo reglas/transporte (FR-001, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011).

## Fase 5: US3 — conservación y responsive

Prueba independiente: viewport reducido/orientación/foco no pierden texto; escritorio/otros modales mantienen comportamiento.

- [x] T009 [US3] Ampliar conservación/errores/foco de `frontend/src/hooks/useMobileFormViewport.test.tsx`, `GenerationWizard.test.tsx` y manual sin peticiones por gestos (FR-004, FR-007, FR-008, FR-010, FR-011).
- [x] T010 [US3] Extender E2E afectados en `frontend/e2e/evaluation-ai-wizard.spec.ts` y `frontend/e2e/mock/grading-review.mock.spec.ts`, con escenarios sintéticos de altura reducida/offset, temas, desktop y permisos; capturas en `output/playwright/097-escritura/` (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011; SC-001–SC-006).

## Fase final: validación y entrega

- [x] T011 Ejecutar unidades/typecheck/lint/build/auditorías y regresiones pertinentes; documentar resultados y límites físicos reales en `specs/097-escritura-docente-movil/quickstart.md` (FR-010, FR-011, FR-012).
- [x] T012 Actualizar `specs/005-evaluaciones/`, índice/baseline/inventario y ejecutar gobernanza y Converge sobre `specs/097-escritura-docente-movil/` (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012).
- [x] T013 Abrir PR enlazado al issue #204 y registrar entrega/CI en `specs/097-escritura-docente-movil/quickstart.md`, sin fusión/despliegue no autorizados (FR-012).

## Dependencias y ejecución

T001 → T002 → T003/T004 → T005/T006 → T007/T008 → T009/T010 → T011 → T012 → T013. Pruebas antes de los componentes afectados. Se pueden ejecutar juntas unidades de hook/Modal en archivos independientes; no editar un archivo simultáneamente ni delegar agentes. MVP US1, pero la entrega incluye las tres historias sin desplegar un manual a medias durante demo. Sin dependencias nuevas ni backend.
