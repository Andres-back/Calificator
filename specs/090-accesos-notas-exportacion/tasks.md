# Tareas: exportaciones de accesos y notas

## Enmienda #190 — implementación del plan ampliado
- [x] T012 Registrar aprobación y revisar checklist en specs/090-accesos-notas-exportacion/checklists/exportaciones.md; analizar spec/plan/tasks.
- [x] T013 [US3] Actualizar pruebas de columnas exactas, correspondencia, homónimos y encabezados repetidos en frontend/src/modules/materias/GradebookExport.test.tsx (FR-007, FR-008).
- [x] T014 [US3] Simplificar matriz de frontend/src/modules/materias/GradebookExport.tsx sin cambiar lecturas, decisiones ni permisos (FR-009, FR-010, FR-012).
- [x] T015 [US2] Añadir pruebas de selección, confirmación, exclusión, fallos parciales y sesión en frontend/src/modules/materias/RosterCredentials.test.tsx y RosterImportDialog.test.tsx (FR-004, FR-005, FR-006, FR-010).
- [x] T016 [US2] Integrar renovación explícita y resultados efímeros en frontend/src/modules/materias/RosterAccessDelivery.tsx y RosterCredentials.tsx, reutilizando rosterImportApi.ts (FR-005, FR-006, FR-011).
- [x] T017 [US2] Comprobar permisos/renovación vigente con backend/tests/integration/test_roster_import_flow.py y sus rutas actuales; adaptar frontend/e2e/mock/exports.mock.spec.ts a notas mínimas, renovación y foto sintética (FR-010, FR-013).
- [x] T018 Ejecutar pruebas focalizadas, typecheck/lint/build y E2E, revisar inventario/gobernanza y registrar evidencia en specs/090-accesos-notas-exportacion/quickstart.md (FR-012, FR-013).
- [x] T019 Converger y preparar PR enlazado #190; actualizar specs/090-accesos-notas-exportacion/tasks.md sin fusionar antes de CI verde/autorización.

Cierre técnico #190: checklist 14/14 con revisión autorizada, Analyze sin conflictos, 28 pruebas frontend, 14 integraciones backend aisladas y cuatro E2E verdes; typecheck/lint/build y auditorías verdes. Converge del alcance activo sin brechas ni tareas adicionales; la primera gobernanza mostró solo tareas aún sin marcar y se revalida tras completar este registro. Inventario 573 superficies. Publicación del PR, CI, merge y producción se informan separadamente: estos marcadores no los certifican.

Dependencias de la enmienda: T012 → T013 → T014; T012 → T015 → T016 → T017; ambas historias → T018 → T019. Pruebas de US2 y US3 independientes pueden prepararse en paralelo, sin agentes. MVP notas mínimas, luego entrega explícita. Las tareas históricas siguientes pertenecen al PR #189 y conservan su estado.

## Fase 1: Preparación
- [x] T001 Registrar alcance reducido/aprobación, revisar lista y analizar specs/090-accesos-notas-exportacion.

## Fase 2: Fundamentos
- [x] T002 Añadir pruebas y helper seguro frontend/src/lib/csvExport.ts y csvExport.test.ts (FR-012).
- [x] T011 Añadir opción solo_lectura compatible en backend/app/modules/calificaciones/router.py, cliente frontend/src/modules/calificaciones/api.ts y regresión en backend/tests/unit/test_calificaciones_boletin_permissions.py para cero escrituras al exportar.

## Fase 3: US2 — Accesos
- [x] T003 [US2] Probar selección/CSV/privacidad en frontend/src/modules/materias/RosterCredentials.test.tsx (FR-004, FR-005, FR-006, FR-010, FR-011).
- [x] T004 [US2] Ampliar frontend/src/modules/materias/RosterCredentials.tsx y botón permanente en MateriaVistaGeneral.tsx sin renovación automática.
- [x] T005 [US2] Probar permisos y botón permanente en frontend/src/modules/materias/MateriaVistaGeneral.test.tsx.

## Fase 4: US3 — Notas
- [x] T006 [US3] Añadir tests de selección/estados/error/sesión en frontend/src/modules/materias/GradebookExport.test.tsx (FR-007, FR-008, FR-009, FR-010).
- [x] T007 [US3] Implementar frontend/src/modules/materias/GradebookExport.tsx con lectura fresca, concurrencia tres y modelo existente; integrar MateriaBoletin.tsx.

## Fase final
- [x] T008 Ejecutar typecheck/lint/tests focalizados/build, permisos backend existentes y E2E móvil sintético en frontend/e2e/mock; registrar en specs/090-accesos-notas-exportacion/quickstart.md (FR-013).
- [x] T009 Actualizar specs/README.md, inventario y tests/spec_governance/test_spec_baseline.py, ejecutar gobernanza.
- [x] T010 Converger, revisar diff y preparar entrega del PR enlazado #186 con CI obligatorio; registrar en specs/090-accesos-notas-exportacion/tasks.md.

## Dependencias
T001 → T002 → T003/T006 (tests separados pueden redactarse en paralelo sin agentes) → T004/T007 → T005 → T008 → T009 → T010. US2 y US3 independientes tras helper. MVP entrega de accesos, seguido notas en mismo PR. Historias 1/4 y verificador diferidos explícitamente, no tareas pendientes de esta entrega.

## Requisitos diferidos por decisión humana (sin implementación)
FR-001, FR-002, FR-003: usuarios cortos y colisiones. FR-014, FR-015, FR-016, FR-017, FR-018: listas compartidas/aprobación/reutilización por grado. Seguimiento separado en #188; no se declaran implementados.

## Cierre técnico
Converge: historias 2/3, 10 requisitos activos y 5 criterios de éxito contrastados con código/pruebas; sin brechas funcionales. Checklist revisado 8/8. Inventario vigente 573 superficies. La primera gobernanza detectó solo T009/T010 sin cerrar; tras completar revisión/preparación se ejecuta nuevamente. PR/CI/despliegue se reportan separadamente, no se declaran hechos antes de verificarlos.
