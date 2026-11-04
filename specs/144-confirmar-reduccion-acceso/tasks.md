# Tareas: Confirmar la reducción de acceso por encima del editor de usuarios

## Fase 1: Preparación

- [X] T001 Registrar el diagnóstico (orden de diálogos frente al contrato de `Modal`), el alcance del hotfix y la aprobación del usuario en `specs/144-confirmar-reduccion-acceso/{spec,plan}.md`, con el issue #306 enlazado. (FR-001, FR-002, FR-003, FR-004)

## Fase 2: Regresión primero

- [X] T002 Escribir la prueba de regresión jsdom en `frontend/src/modules/admin/AdminUsersPage.test.tsx`: la confirmación debe ser el último diálogo modal, tener el foco, cerrarse sola con Escape conservando "inactivo" sin enviar, y aplicar el cambio cerrando el editor. RED verificado con el orden anterior. (FR-001, FR-002, FR-003, FR-004)
- [X] T003 Escribir la prueba de regresión E2E en `frontend/e2e/admin-authorization.spec.ts` (`144 …`): `elementFromPoint` sobre "Aplicar cambio", foco, ausencia de desbordamiento, Escape y aplicación a 384 px y 1440 px, en claro y oscuro. RED verificado en Chromium con el código anterior ("Aplicar cambio" tapado por el editor). (FR-001, FR-002, FR-003, FR-004)

## Fase 3: US1 — Corrección

- [X] T004 [US1] Reubicar el `ConfirmDialog` de reducción de acceso después del `Modal` editor en `frontend/src/modules/admin/AdminUsersPage.tsx`, sin cambiar textos, datos ni mutaciones. GREEN en T002 y T003. (FR-001, FR-002, FR-003)

## Fase final: Validación

- [X] T005 Ejecutar las unitarias de admin, `typecheck`, `lint`, el E2E de autorización y la suite frontend completa; guardar las capturas reales en `specs/144-confirmar-reduccion-acceso/visual/` y los resultados en `quickstart.md`; registrar el spec en `specs/README.md`. (FR-001, FR-002, FR-003, FR-004)

## Dependencias

T001 → T002 y T003 (RED) → T004 (GREEN) → T005. Sin delegación, sin llamadas a IA y sin datos reales.
