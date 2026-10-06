# Tareas: revisión docente amplia y compacta

Issue #182; rama `codex/088-revision-amplia`. Alcance, plan y revisión de checklist aprobados. Pruebas incluidas por FR-009.

## Fase 1: Preparación

- [x] T001 Registrar las aprobaciones y preparar artefactos en specs/088-revision-amplia/spec.md y plan.md, sin cambios funcionales.
- [x] T002 Revisar la checklist de calidad con autorización del revisor en specs/088-revision-amplia/checklists/ux.md; conservar los marcadores durante Implement.

## Fase 2: Fundamentos

- [x] T003 Extender fixtures sintéticas de 30/100 alumnos y nombres largos en frontend/e2e/fixtures/explainableGrading.ts; verificar configuración e ignores vigentes sin dependencias nuevas.

## Fase 3: Historia 1 — lista legible y scroll independiente

Prueba independiente: veinte preguntas y treinta alumnos; búsqueda y cambio sin mover la página al inicio. FR-001, FR-002, FR-003, FR-007; SC-001, SC-003.

- [x] T004 [US1] Añadir y ejecutar regresión previa de ancho ≥320, lista y detalle independientes en frontend/e2e/explainable-grading.spec.ts; conservar prueba de lectura sin escrituras académicas.
- [x] T005 [US1] Implementar variante de revisión de ancho/altura limitada por ruta, rol y modo en frontend/src/components/layout/AppShell.tsx y cadena flex/roster 320–360 en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx; filtros sin scroll horizontal obligatorio, búsqueda y paginación intactas.

## Fase 4: Historia 2 — cabecera compacta e identidad visible

Prueba independiente: ≥5 filas iniciales y ≤112 px de cabecera ordinaria en 1366×768. FR-004, FR-005; SC-002, SC-003.

- [x] T006 [US2] Añadir y ejecutar regresión previa de geometría/identidad activa y controles finales en frontend/e2e/explainable-grading.spec.ts.
- [x] T007 [US2] Compactar título/contexto/acciones y cabecera del alumno en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx; revisar scrollIntoView y mantener detalles, avisos, temporizador, trabajos y modos especiales alcanzables.

## Fase 5: Historia 3 — móvil y protección de edición

Prueba independiente: resize 1279/1280 con edición, foco/retorno y detalle móvil; borrador y 409 preservados. FR-006, FR-007, FR-008, FR-009; SC-004, SC-005.

- [x] T008 [US3] Añadir y ejecutar regresiones previas de aislamiento por ruta/rol y frontera responsive en frontend/src/components/layout/AppShell.test.tsx y frontend/e2e/mock/grading-review.mock.spec.ts; reutilizar guard/409 existente.
- [x] T009 [US3] Alinear overlay, barra de acciones, padding, retorno y bloqueo local en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx sin modificar el breakpoint global o remontar editores.
- [x] T010 [US3] Actualizar verificaciones de cinco tamaños/dos temas en frontend/e2e/accessibility/grading-review.a11y.spec.ts y frontend/e2e/visual/grading-review.visual.spec.ts; revisar capturas antes de aceptar referencias y comprobar nombres/foco/44px/zoom/scroll final.

## Fase 6: Validación transversal

- [x] T011 Ejecutar pruebas focalizadas, tipos, lint y build descritos en specs/088-revision-amplia/quickstart.md; registrar resultados reales, fallos y mediciones. Humo WebKit acotado; no omitir CI completo.
- [x] T012 Actualizar contrato vivo en specs/008-calificaciones/spec.md e índice/inventario mediante scripts/build_system_inventory.py si corresponde; ejecutar gobernanza y revisión de alcance sin datos productivos.
- [x] T013 Ejecutar Converge contra specs/088-revision-amplia/spec.md, plan.md y tasks.md; registrar resultado en quickstart.md desde fase de implementación y cerrar únicamente trabajo probado. Preparar PR enlazado al issue sin fusionar ni desplegar.

## Dependencias

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013.
Historias secuenciales porque comparten Workspace; no editar ese archivo en paralelo. T004/T006/T008 son pruebas previas al cambio correspondiente, con resultados documentados.

## Oportunidades de ejecución independiente

- US1: inspección del shell y revisión de fixture pueden estudiarse por separado; integrar después de T003.
- US2: mediciones de lista e identidad son verificaciones independientes del mismo incremento.
- US3: capturas y accesibilidad tienen archivos/salidas separados, pero requieren servidor compartido estable y no deben cerrarlo mutuamente.

## Estrategia

Primero US1 resuelve espacio y scroll; luego US2 reduce cabecera; US3 asegura móvil/edición y el cierre transversal verifica permisos, estados especiales y documentación. No liberar un incremento a producción antes de completar historias y CI. No hay migraciones ni cambios backend.
