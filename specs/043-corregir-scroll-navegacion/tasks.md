# Tareas del hotfix 043

Issue #86; aprobación humana de alcance y publicación: 2026-09-16. FR-001–FR-005 se verifican sin cambiar datos de notas.

- [x] T001 (FR-001, FR-002) Añadir regresión de consumidores superpuestos en ambos órdenes, desmontaje con diálogo abierto, estilos originales, StrictMode y media query en las pruebas existentes del hook y Modal.
- [x] T002 (FR-001, FR-002) Centralizar tokens y restauración en useBodyScrollLock y reutilizarlo en Modal.
- [x] T003 (FR-003) Liberar menú e inert al navegar o pasar a escritorio, con regresión en AppShell.test.tsx.
- [x] T004 (FR-004) Eliminar scroll anidado en RevisionGuide y probar que la lista no impone max-height/overflow.
- [x] T005 (FR-001, FR-004) Verificar con Playwright local el cierre en 390×844 y rueda sobre respuestas en 1366×768; resultados en plan.md.
- [x] T006 (FR-005) Verificar desde rama aislada tipos, lint, pruebas/build aplicables, revisión de diff sin secretos ni cambios ajenos y artefactos de gobernanza; registrar resultados antes de solicitar merge. El gate final de GitHub sigue siendo obligatorio antes del merge.

El PR y despliegue son controles posteriores de publicación, no una declaración de cierre de 042.

- [x] T007 (FR-006) Respetar el foco que el usuario ya estableció dentro del diálogo antes del autofocus diferido, con regresión determinista en P2Accessibility.test.tsx.
