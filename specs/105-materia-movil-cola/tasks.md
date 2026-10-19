# Tareas: materia móvil y cola discreta

## Fase 1: Preparación

- [x] T001 Registrar aprobación y revisión de requisitos en specs/105-materia-movil-cola/ y issue #218; comprobar ignore y alcance sin cambios ajenos.

## Fase 2: Fundamentos

- [x] T002 Añadir regresiones de recuperación, cuenta y respuesta tardía en frontend/src/modules/calificaciones/gradingJobs.test.ts y aislar almacenamiento local en gradingJobs.ts sin borrar legado (FR-007/010).

## Fase 3: Historia 1 — materia móvil

Prueba independiente: alta válida conserva valores y destino; opciones/teclado no envían ni cortan campos.

- [x] T003 [US1] Añadir pruebas del formulario compacto, no autofocus, opciones y payload en frontend/src/modules/materias/MateriasListPage.test.tsx (FR-001, FR-002, FR-003).
- [x] T004 [US1] Simplificar formulario de frontend/src/modules/materias/MateriasListPage.tsx y reutilizar hook/Modal opt-in; mantener la lógica local sin extracción innecesaria ni duplicación (FR-001, FR-002, FR-003).

## Fase 4: Historia 2 — cola discreta

Prueba independiente: envío aceptado libera selección; seguimiento continúa minimizado sin operaciones adicionales.

- [x] T005 [US2] Añadir pruebas de compacto, minimizar, foco, actualización, cuenta, resultados y lotes en frontend/src/modules/calificaciones/GradingJobMonitor.test.tsx; mantener regresiones de frontend/src/modules/materias/MateriaCalificar.test.tsx (FR-004, FR-005, FR-006, FR-007).
- [x] T006 [US2] Implementar expansión visual independiente y señal de atención en frontend/src/modules/calificaciones/GradingJobMonitor.tsx; adaptar contenedores AppShell/CalificacionesWorkspace solo si necesario (FR-004, FR-005, FR-006, FR-007).

## Fase 5: Historia 3 — lectura responsive

Prueba independiente: borrador reconocible sin toast redundante; ambos flujos legibles desde 360 px.

- [x] T007 [US3] Añadir regresión de éxito contextual y conservar errores en frontend/src/modules/evaluaciones/components/GenerationWizard.test.tsx; ajustar GenerationWizard.tsx (FR-009).
- [x] T008 [US3] Añadir y ejecutar frontend/e2e/materia-queue-mobile.spec.ts con mocks, 360/390/1440, ambos temas/motores, viewport reducido, foco, medidas y capturas; extender escenarios existentes si resulta más sostenible (FR-008, SC-001 a SC-005).

## Fase final: Validación

- [x] T009 Ejecutar tipos, lint, unitarias, E2E, build y auditorías aplicables; documentar resultados/limitaciones en specs/105-materia-movil-cola/quickstart.md (FR-010).
- [x] T010 Actualizar documentación propietaria specs/003-*/, specs/005-*/, specs/008-*/ e inventario según cambios reales; ejecutar Converge y registrar pendientes en specs/105-materia-movil-cola/tasks.md antes de PR/CI.

Converge 2026-10-18: 10 requisitos, 5 criterios de éxito, 10 aceptaciones y 7 decisiones revisados; sin brechas ni tareas nuevas. Las aprobaciones no autorizan fusionar/desplegar; CI remoto aún debe ejecutarse.

## Dependencias y estrategia

T001 → T002 → pruebas antes de implementación en cada historia (T003→T004, T005→T006, T007). T008 tras las tres historias; T009→T010 al final. Historias 1 y 2 son funcionalmente independientes tras fundamentos. Se trabaja secuencialmente para evitar conflictos; las pruebas independientes de US1/US2 podrían ejecutarse en paralelo sin editar los mismos archivos. MVP: US1, seguido de US2 y pulido US3. No fusionar ni desplegar sin autorización.
