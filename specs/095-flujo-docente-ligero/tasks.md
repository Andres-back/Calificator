# Tareas: flujo docente ligero

## Fase 1: preparación

- [x] T001 Registrar aprobación y revisar lista autorizada en `specs/095-flujo-docente-ligero/checklists/ux-demo.md`; comprobar contexto e ignores (FR-011, FR-012).

## Fase 2: fundamentos

- [x] T002 Ejecutar Analyze de `specs/095-flujo-docente-ligero/spec.md`, `plan.md` y `tasks.md`; comprobar requisitos, contratos y conservación antes de código (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012).

## Fase 3: US1 — materia, evaluaciones y boletín

Prueba independiente: materia/grado visibles; tres acciones principales como máximo; filtros progresivos y primera ficha legible.

- [x] T003 [US1] Añadir regresiones previas de cabecera/acciones/permisos en `frontend/src/modules/materias/MateriaDetailPage.test.tsx` y `MateriaEvaluaciones.test.tsx` (FR-001, FR-002, FR-009, FR-011).
- [x] T004 [US1] Compactar cabecera y agrupar acciones conservando handlers en `frontend/src/modules/materias/MateriaDetailPage.tsx` y `MateriaEvaluaciones.tsx` (FR-001, FR-002, FR-010, FR-011).
- [x] T005 [US1] Añadir pruebas de filtros activos, conservación de selección/exportación y retorno en `frontend/src/modules/materias/MateriaBoletin.test.tsx` (FR-003, FR-010, FR-011).
- [x] T006 [US1] Priorizar búsqueda/mosaico y filtros plegables en `frontend/src/modules/materias/MateriaBoletin.tsx` sin perder previsualización/exportación (FR-003, FR-009, FR-010, FR-011).

## Fase 4: US2 — entender y continuar revisión

Prueba independiente: volver desde inicio a contexto válido; cuentas distintas/acceso revocado no exponen referencias; nota y barreras conservadas.

- [x] T007 [US2] Crear pruebas previas de marcador, caducidad, cuentas y almacenamiento en `frontend/src/modules/calificaciones/teacherReviewResume.test.ts`; extender regresiones de sesión en `frontend/src/stores/auth.test.ts` (FR-005, FR-006, FR-011).
- [x] T008 [US2] Implementar marcador mínimo en `frontend/src/modules/calificaciones/teacherReviewResume.ts` y limpieza de sesión en `frontend/src/stores/auth.ts` sin duplicar autenticación (FR-005, FR-006, FR-011).
- [x] T009 [US2] Añadir regresiones de continuidad validada y nota/protección de borradores en `frontend/src/modules/dashboard/DashboardPage.test.tsx` y `frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx` (FR-004, FR-005, FR-006, FR-011).
- [x] T010 [US2] Integrar Continuar revisión y registro tras consulta válida en `frontend/src/modules/dashboard/DashboardPage.tsx` y `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`; uniformar vocabulario en componentes afectados conservando 094 (FR-004, FR-005, FR-006, FR-009, FR-011).

## Fase 5: US3 — progreso y siguiente estudiante

Prueba independiente: progreso único por grupo, elección explícita sin heredar hojas, fallos/refrescos sin avanzar ni habilitar duplicados.

- [x] T011 [US3] Añadir regresiones previas de progreso, sugerencia, último alumno y fallos en `frontend/src/modules/materias/MateriaCalificar.test.tsx` y suites actuales del workspace (FR-007, FR-008, FR-011).
- [x] T012 [US3] Integrar progreso derivado y propuesta elegible en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y `frontend/src/modules/materias/MateriaCalificar.tsx`, manteniendo validación y envío explícito (FR-007, FR-008, FR-009, FR-010, FR-011).

## Fase final: validación y entrega

- [x] T013 Ampliar y ejecutar recorridos sintéticos en `frontend/e2e/mock/grading-review.mock.spec.ts`, `frontend/e2e/p2-responsive.spec.ts` y `frontend/e2e/explainable-grading.spec.ts`; capturas/manual Chromium/WebKit y matriz (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011).
- [x] T014 Ejecutar unidades/typecheck/lint/build y regresiones aplicables; documentar resultados reales en `specs/095-flujo-docente-ligero/quickstart.md` sin datos reales ni IA (FR-011, FR-012).
- [x] T015 Actualizar índice/propietarios/baseline/inventario pertinentes, ejecutar gobernanza y Converge sin brechas en `specs/095-flujo-docente-ligero/` (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012).
- [x] T016 Abrir PR enlazado al issue #200 con aprobaciones, consultar CI y registrar entrega en `specs/095-flujo-docente-ligero/quickstart.md`; sin merge/despliegue no autorizados (FR-012).
- [x] T017 Corregir el retorno de foco sin desplazamiento en `frontend/src/components/ui/Modal.tsx` tras el fallo remoto de ocho casos de boletín en 768/1280; conservar las aserciones existentes y comprobar Chromium/WebKit y regresión unitaria (FR-003, FR-010, FR-011).

## Dependencias y estrategia

T001 → T002 → US1 (T003 antes de T004; T005 antes de T006) → US2 (T007 antes de T008; T009 antes de T010) → US3 (T011 antes de T012) → T013/T014 → T015 → T016. Las pruebas de archivos independientes pueden ejecutarse juntas; no se delega trabajo ni se edita un archivo simultáneamente. MVP US1; completar las siete mejoras en la rama antes de proponer producción. No hay hooks configurados.
