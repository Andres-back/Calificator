# Tareas: Centro unificado de calificación

**Issue**: [#68](https://github.com/Andres-back/Calificator/issues/68) | **Rama**: codex/033-centro-calificacion

Diseño aprobado el 2026-09-09. Solo se marcan tareas con trabajo comprobado; la calidad documental no equivale a implementación.

## Fase 1: Preparación

- [X] T001 Registrar revisión y aprobación humana del diseño en specs/033-centro-calificacion/plan.md y spec.md, con trazabilidad a #68 antes de implementar.
- [X] T002 Registrar baseline y fixture sintético con 30 alumnos, más de seis PQRS, online, físico, cero y legado en specs/033-centro-calificacion/quickstart.md; reutilizar backend/tests/fixtures/grading_batch.py (FR-015).

## Fase 2: Fundamentos

- [X] T003 Añadir proyección paginada de revisión docente, matrícula completa, resúmenes/contadores exhaustivos y consultas agrupadas en backend/app/modules/calificaciones/{router,schemas,service}.py; usar criterio vigente, permisos y privacidad actuales (FR-003,006,013,016).
- [X] T004 Cubrir límites/cursor, profesores ajenos, lectura sola, PQRS sin permiso, más de seis casos, cero/pendiente, legado y N+1 en backend/tests/unit/test_calificaciones_revision_workspace.py y backend/tests/integration/test_explainable_grading_pipeline.py (SC-006,007,008).
- [X] T005 Incorporar tipos y consulta autorizada a frontend/src/types/api.ts y frontend/src/modules/calificaciones/api.ts; modelo único de contexto/selección en CalificacionesWorkspace.tsx con protección de query y transiciones internas (FR-002,003,016).

## Fase 3: US1 — Centro y contexto (P1)

Meta independiente: todos los accesos abren el examen correcto y mantienen selección.

- [X] T006 [US1] Añadir ruta canónica y adaptadores de tabla de compatibilidad en frontend/src/router.tsx y frontend/src/config/routes.ts, manteniendo boletín estudiantil y permisos (FR-001,002,013).
- [X] T007 [US1] Unificar accesos de evaluación/materia/boletín/inicio/notificaciones en frontend/src/modules/materias/{MateriaEvaluaciones,MateriaVistaGeneral,MateriaBoletin}.tsx, frontend/src/modules/dashboard/TeacherInbox.tsx, frontend/src/modules/calificaciones/GradingJobMonitor.tsx y frontend/src/config/nav.ts (FR-001,015).
- [X] T008 [US1] Verificar enlaces antiguos, recarga, atrás/adelante, parámetros ajenos y cambios de query con borrador en frontend/e2e/explainable-grading.spec.ts y frontend/src/components/auth/RouteGuards.test.tsx (SC-001,003,007).

## Fase 4: US2 — Mesa por pregunta (P1)

Meta independiente: evidencia/pregunta juntas y ajuste guardado sin salir o publicar.

- [X] T009 [US2] Organizar lista, visor y selector de pregunta/criterio en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y components/GradeBreakdown.tsx, conservando presentación estudiante, casos online y legado sin desglose (FR-004,012,014).
- [X] T010 [US2] Integrar editor local, seguir pregunta/estudiante con orden capturado, conflictos/borrador y final de lista en frontend/src/modules/calificaciones/components/GradeComponentEditor.tsx y CalificacionesWorkspace.tsx (FR-002,005).
- [X] T011 [US2] Validar conflicto, error, cambios pendientes, polling, último alumno y cero publicaciones implícitas en frontend/src/modules/calificaciones/components/GradeComponentEditor.test.tsx y frontend/e2e/explainable-grading.spec.ts (SC-002,003).

## Fase 5: US3 — Alertas y reclamos (P1)

Meta independiente: filtrar todas las señales vigentes y abrir su pregunta/evidencia cuando exista vínculo.

- [X] T012 [US3] Transmitir componente_id/desglose_version en ambos pasos de creación de PQRS en backend/app/modules/calificaciones/router.py y service.py; resolver vínculos versionados sin inferir asociaciones y cubrir pertenencia en backend/tests/integration/test_explainable_grading_pipeline.py (FR-008,013).
- [X] T013 [US3] Derivar señales actuales de bloques/cobertura/componentes/PQRS con regla de consenso existente, conocimiento ausente explícito y versión en backend/app/modules/calificaciones/service.py; cubrir resuelto frente a histórico y discrepancia/fallo de comparador en backend/tests/unit/test_calificaciones_revision_workspace.py (FR-006,007,008).
- [X] T014 [US3] Integrar filtros, contadores completos y apertura de alerta hacia alumno/pregunta/hoja/incidencia en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx, components/GradeBreakdown.tsx y components/GradeBreakdownHistory.tsx; invalidar tras guardado sin saltos (FR-006,007,008).
- [X] T015 [US3] Cubrir más de seis PQRS, componente antiguo, ausencia de detalle, cero, respuesta incorrecta e ilegible sin falsas alarmas en frontend/e2e/explainable-grading.spec.ts y frontend/src/modules/calificaciones/components/GradeBreakdown.test.tsx (SC-002,006).

## Fase 6: US4 — Carga y decisiones en contexto (P1)

Meta independiente: dos alumnos cargados, cola recuperable, revisión y publicación dentro del centro.

- [X] T016 [US4] Extraer panel de carga de frontend/src/modules/materias/MateriaCalificar.tsx e integrarlo en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx, con asociación explícita, selección multihoja y cola existente de gradingJobs.ts; no duplicar edición/decisión (FR-009,010).
- [X] T017 [US4] Integrar nota manual, reemplazo, reintento, confirmación/publicación con resultados parciales y resumen de notas en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y api.ts, preservando permisos y acciones distintas (FR-005,009,011,013).
- [X] T018 [US4] Verificar flujo de dos paquetes, alumno sin entrega, recarga, fallo aislado y reintento grupal en frontend/e2e/explainable-grading.spec.ts y frontend/src/modules/calificaciones/GradingJobMonitor.test.tsx; reutilizar ensayo backend/tests/integration/test_grading_batch_30.py si cambia envío (SC-004,007,008).

## Fase final: Validación y entrega

- [ ] T019 Ajustar layout/foco/scroll/teclado a cinco tamaños y temas en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx; verificar frontend/e2e/p2-responsive.spec.ts, accessibility/grading-review.a11y.spec.ts y visual/grading-review.visual.spec.ts con revisión humana de capturas (FR-012, SC-005).
- [X] T020 Confirmar ausencia de consumidores antes de retirar frontend/src/modules/calificaciones/{CalificacionesPage,CalificarFotoPage,SalonPage}.tsx y tours huérfanos; conservar boletinTour y servicios activos; documentar búsqueda en quickstart.md (FR-015).
- [X] T021 Verificar/cablear o retirar bandera sin uso en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y frontend/.env.example; acreditar comportamiento servido y reversión, conservando medición opt-in y configuración IA (FR-015, SC-008).
- [ ] T022 Actualizar specs/002-arquitectura-roles-seguridad, specs/008-calificaciones, specs/016-calificacion-explicable y otros propietarios afectados; regenerar specs/system-inventory/current.json, ejecutar pruebas proporcionales/CI y Converge, registrar evidencia en specs/033-centro-calificacion/quickstart.md antes del PR (FR-001–016).

## Dependencias y estrategia

T001→T002→T003/T004→T005. US1 depende del contexto; US2 del centro; US3 de proyección y detalle; US4 reutiliza carga y decisiones tras contexto. Validación final depende de las cuatro historias. Entrega incremental: centro/rutas, mesa, alertas, carga/publicación y retiro final.

Oportunidades independientes: tras fundamentos se pueden preparar fixtures E2E de US1 (T008) mientras se implementa mesa (T009); investigación de consumidores T020 puede preceder al retiro pero la eliminación espera la convergencia. No paralelizar cambios sobre Workspace ni router. No se crean issues por tarea.

## Matriz de cobertura

| Requisito | Tareas |
|---|---|
| FR-001 | T006–008 |
| FR-002 | T005–006,008,010–011 |
| FR-003 | T003–005 |
| FR-004 | T009,011 |
| FR-005 | T010–011,017 |
| FR-006 | T003–004,013–015 |
| FR-007 | T013–015 |
| FR-008 | T012–015 |
| FR-009 | T016–018 |
| FR-010 | T016,018 |
| FR-011 | T017–018 |
| FR-012 | T009,019 |
| FR-013 | T003–008,012,017 |
| FR-014 | T004,009 |
| FR-015 | T002,007,020–022 |
| FR-016 | T003–005,018 |

## Phase 8: Convergence

- [X] T023 Conservar contexto de revisión anterior al añadir entregas de otros alumnos y restaurarlo al volver, sin descartar borradores; probar en CalificacionesWorkspace.tsx y explainable-grading.spec.ts conforme SC-007 y US4/AC1–2 (partial, HIGH).
- [X] T024 Mostrar cantidad de alumnos con ajustes guardados en la sesión junto a pendientes del examen al finalizar, conforme US2/AC3 en CalificacionesWorkspace.tsx (partial, MEDIUM).
- [X] T025 Retirar frontend/src/modules/materias/GradingProgress.tsx, sin consumidores tras extraer el panel de carga; conservar gradingFlowModel consumido por gradebookModel y documentar recuperación Git conforme FR-015 (partial, LOW).
- [ ] T026 Completar pruebas finales, revisión humana de capturas, resultados y PR/CI sin promover trabajo no validado, conforme SC-005 y Constitución VII–VIII (partial, HIGH).
