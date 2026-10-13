# Tareas: evaluación en dos pantallas

## Fase 1: preparación

- [x] T001 Registrar aprobaciones, revisar la lista autorizada `specs/096-evaluacion-dos-pantallas/checklists/ux-creacion.md` y verificar contexto/ignores (FR-014).

## Fase 2: fundamentos

- [x] T002 Ejecutar Analyze de `specs/096-evaluacion-dos-pantallas/spec.md`, `plan.md` y `tasks.md` antes de código (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014).

## Fase 3: US1 — preparar

Prueba independiente: tema/cantidad/modalidad visibles, personalización conservada y generar directo a revisión.

- [x] T003 [US1] Añadir regresiones previas de defaults, nombre, reparto, fases y validación en `frontend/src/modules/evaluaciones/components/generationWizardModel.test.ts` (FR-001, FR-003, FR-004, FR-005).
- [x] T004 [US1] Implementar helpers puros de preparación/nombre/reparto y fases compatibles en `frontend/src/modules/evaluaciones/components/generationWizardModel.ts` (FR-001, FR-003, FR-004, FR-005).
- [x] T005 [US1] Adaptar y ampliar pruebas de preparación/personalización/selección/doble envío en `frontend/src/modules/evaluaciones/components/GenerationWizard.test.tsx` (FR-001, FR-003, FR-004, FR-005, FR-006, FR-011).
- [x] T006 [US1] Integrar Preparar y ayuda desplegable en `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx` y dos etiquetas en `PasosGuia.tsx` conservando handlers/payloads (FR-001, FR-003, FR-004, FR-005, FR-006, FR-011).

## Fase 4: US2 — revisar y guardar

Prueba independiente: preguntas/respuestas y criterios editables, guardado validado del mismo ID y publicación separada.

- [x] T007 [US2] Añadir regresiones de revisión/guardar/error/conflicto y edición diferencial en `frontend/src/modules/evaluaciones/components/GenerationWizard.test.tsx` (FR-007, FR-008, FR-009, FR-013).
- [x] T008 [US2] Integrar Revisar/Cómo se calificará/guardar directo, layout responsive con único scroll principal y advertencias actuales en `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx` (FR-007, FR-008, FR-009, FR-012, FR-013).
- [x] T009 [US2] Añadir pruebas del selector y accesos autorizados en `frontend/src/modules/evaluaciones/components/EvaluationCreateMenu.test.tsx`, `frontend/src/modules/materias/MateriaEvaluaciones.test.tsx` y pruebas del acceso general (FR-002, FR-008, FR-013).
- [x] T010 [US2] Implementar selector de métodos en `frontend/src/modules/evaluaciones/components/EvaluationCreateMenu.tsx` e integrar `MateriaEvaluaciones.tsx`/`EvaluacionesPage.tsx` reutilizando diálogos y documentos (FR-002, FR-008, FR-013).

## Fase 5: US3 — recuperar y usar celular

Prueba independiente: etapas antiguas recuperadas, cuentas aisladas, fallos sin pérdida ni sobrescritura y controles accesibles.

- [x] T011 [US3] Añadir regresiones previas de borradores v7/TTL/storage y versión/permiso/ID restaurado en `generationWizardModel.test.ts` y `GenerationWizard.test.tsx` del directorio `frontend/src/modules/evaluaciones/components/` (FR-006, FR-009, FR-010, FR-013).
- [x] T012 [US3] Implementar recuperación segura y compatibilidad en `frontend/src/modules/evaluaciones/components/generationWizardModel.ts` y `GenerationWizard.tsx` sin reemplazar ediciones locales (FR-006, FR-009, FR-010, FR-013).
- [x] T013 [US3] Adaptar y ampliar E2E de creación/retorno/errores/responsive en `frontend/e2e/p2-responsive.spec.ts`, `frontend/e2e/evaluation-ai-wizard.spec.ts` y `frontend/e2e/mock/grading-review.mock.spec.ts` donde corresponda; ejecutar matriz Chromium/WebKit (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013).

## Fase final: validación y entrega

- [x] T014 Ejecutar unidades/typecheck/lint/build y regresiones pertinentes de visor/criterios; documentar resultados reales en `specs/096-evaluacion-dos-pantallas/quickstart.md` (FR-012, FR-013, FR-014).
- [x] T015 Actualizar propietario `specs/005-evaluaciones/`, índice/baseline/inventario y ejecutar gobernanza y Converge sobre `specs/096-evaluacion-dos-pantallas/` (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014).
- [x] T016 Abrir PR enlazado al issue #202 y registrar CI/entrega en `specs/096-evaluacion-dos-pantallas/quickstart.md`, sin fusión/despliegue no autorizados (FR-014).

## Dependencias y estrategia

T001 → T002 → US1 (pruebas antes de helpers/UI) → US2 → US3 → T014 → T015 → T016. T009 puede prepararse mientras avanzan pruebas de revisión, en archivos distintos; validación independiente de helpers/selector también puede ejecutarse junta. No se delega a agentes ni se edita un archivo simultáneamente. MVP: Preparar/Revisar en asistente actual; completar accesos/recuperación antes de cualquier entrega. Hooks ausentes; ningún modelo/servicio nuevo.
