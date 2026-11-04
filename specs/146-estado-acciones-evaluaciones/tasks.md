# Tareas: Estado legible, carga por tarjeta y confirmación al publicar o cerrar evaluaciones

## Fase 1: Preparación

- [X] T001 Registrar el diagnóstico, el alcance del hotfix y la aprobación del usuario en `specs/146-estado-acciones-evaluaciones/{spec,plan}.md`, con el issue #308 enlazado. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Fase 2: Regresión primero

- [X] T002 Escribir las pruebas de regresión en `frontend/src/modules/materias/MateriaEvaluaciones.test.tsx`: etiqueta y tono del estado, confirmación de Publicar con carga solo en la tarjeta elegida, y confirmación de Cerrar entregas que no cierra al cancelar. RED verificado con `main` @ `8588296`. (FR-001, FR-002, FR-003, FR-004, FR-005)
- [X] T003 Escribir las pruebas de regresión en `frontend/src/modules/evaluaciones/EvaluacionesPage.test.tsx`: confirmación de Publicar con carga por tarjeta y confirmación de Cerrar evaluación. RED verificado con `main` @ `8588296`. (FR-002, FR-003, FR-004, FR-005)

## Fase 3: Corrección

- [X] T004 [US1] Mover `ESTADO_LABEL` a `frontend/src/modules/evaluaciones/evaluationStatus.ts` y usarlo con `statusTone` en `MateriaEvaluaciones.tsx`. (FR-001)
- [X] T005 [US2] [US3] Añadir `confirmAction` + `ConfirmDialog` y la carga por `mutation.variables` en `MateriaEvaluaciones.tsx` y `EvaluacionesPage.tsx`; ajustar la prueba existente de cerrar entregas para confirmar. GREEN en T002 y T003. (FR-002, FR-003, FR-004)

## Fase final: Validación

- [X] T006 Ejecutar la suite frontend completa, `lint`, `typecheck` y los E2E de evaluaciones; registrar resultados en `quickstart.md` y el spec en `specs/README.md`. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Dependencias

T001 → T002 y T003 (RED) → T004 y T005 (GREEN) → T006. Sin delegación, sin llamadas a IA y sin datos reales.
