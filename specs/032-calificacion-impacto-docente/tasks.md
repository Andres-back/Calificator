# Tareas: Calificación confiable e impacto docente medible

**Issue**: #65 | **Rama**: codex/032-calificacion-impacto-docente
**Aprobaciones**: alcance, plan y checklist aprobados por el usuario/revisor el 2026-09-09.
**Alcance**: cinco historias del plan. Ninguna casilla implica una prueba ejecutada sin evidencia.

## Fase 1: Preparación

- [x] T001 Registrar aprobación del plan y verificar aislamiento respecto a #64 en specs/032-calificacion-impacto-docente/plan.md; no publicar incidentalmente 031.
- [x] T002 Generar checklist y analizar cobertura de specs/032-calificacion-impacto-docente/{spec,plan,tasks}.md; respetar puerta de revisión sin autoaprobar casillas.
- [x] T003 Verificar entorno sintético y exclusiones en .gitignore, .dockerignore y frontend/eslint.config.js; registrar baseline proporcional en specs/032-calificacion-impacto-docente/quickstart.md.

## Fase 2: Fundamentos

- [x] T004 Preparar regresión de prioridad humana, retrying y duplicación en backend/tests/unit/test_tasks_grading.py y backend/tests/integration/test_ai_job_leases.py (FR-004–005, SC-010).
- [x] T005 Definir flags independientes y apagados para lectura/revisión/medición/estudio en backend/app/core/config.py y frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx; no desactivar correcciones de integridad (FR-026).

## Fase 3: US1 — Recuperación y evidencia completa (P1)

Meta: fallos recuperables sin pérdida ni nota duplicada. Prueba independiente: tres hojas, fallo posterior a extracción, reintento y decisión docente concurrente.

- [x] T006 [US1] Corregir estados reintentables y transiciones con bloqueo/claim en backend/app/modules/jobs/router.py y backend/app/workers/tasks_grading.py; preservar ajustes humanos (FR-004–005).
- [x] T007 [US1] Añadir pruebas de huella, invalidación y privacidad de checkpoints en backend/tests/unit/test_tasks_grading.py y backend/tests/unit/test_vision_extractor.py (FR-001–004).
- [x] T008 [US1] Persistir checkpoints internos versionados en backend/app/workers/tasks_grading.py y backend/app/services/vision_extractor.py; proyectar JobRead por lista permitida en backend/app/modules/jobs/schemas.py (FR-004, FR-023).
- [x] T009 [US1] Eliminar soluciones esperadas del contexto de extracción, conservar transcripción y asociar continuaciones en backend/app/services/vision_extractor.py (FR-002–003).
- [x] T010 [US1] Quitar cortes de 5.000 caracteres y dividir por pregunta únicamente cuando no quepa el contexto, conservando verificación en backend/app/modules/calificaciones/agents.py y backend/app/modules/calificaciones/orchestrator.py; cubrir longitud y ambigüedad en backend/tests/unit/test_vision_extractor.py (FR-001, FR-003, FR-025, SC-001).
- [x] T011 [US1] Implementar pendientes paginados, identidad autorizada y tiempos de etapas en backend/app/modules/jobs/router.py y backend/app/workers/tasks_grading.py; probar propiedad/privacidad (FR-006, FR-024–025).
- [x] T012 [US1] Recuperar estados del servidor en frontend/src/modules/calificaciones/gradingJobs.ts y GradingJobMonitor.tsx; ampliar GradingJobMonitor.test.tsx para recarga, fallo aislado y cero real frente a pendiente (FR-005–006).
- [x] T013 [US1] Validar 30 alumnos, tres docentes, reinicio y reintentos sin repetir éxitos en backend/tests/integration/test_ai_job_leases.py, reutilizando la suite existente; registrar resultados en specs/032-calificacion-impacto-docente/quickstart.md (SC-002, SC-010).

## Fase 4: US4 — Tiempo docente observado (P1)

Se ejecuta antes de la nueva mesa de revisión para medir el proceso. Prueba independiente: intervalos conocidos, pausa, dos pestañas, desconexión y preparación grupal.

- [x] T014 [US4] Añadir casos de duración corta/larga, repetición, ajuste, solapamiento y cierre incompleto en backend/tests/unit/test_analytics_events.py (FR-014, FR-015, FR-016, FR-017, SC-007).
- [x] T015 [US4] Crear analytics_work_sessions con ledger versionado e índices mediante backend/app/modules/analytics/models.py y migración aditiva en backend/alembic/versions/; sin backfill de tiempos (FR-014–016, FR-026).
- [x] T016 [US4] Implementar transiciones idempotentes, propietario/traspaso y agregación de intervalos en backend/app/modules/analytics/service.py y router.py; probar permisos, concurrencia PostgreSQL y límites de comandos en backend/tests/integration/ (FR-014–016, FR-023).
- [x] T017 [US4] Añadir cronómetro opt-in con pausa explícita y recuperación a frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y frontend/src/lib/analytics.ts; pruebas de reloj, pestañas y lectura sin clics en frontend/src/modules/calificaciones/ (FR-014–016).
- [x] T018 [US4] Corregir contrato de eventos y separar estimación histórica de ahorro observado nullable en backend/app/modules/analytics/event_policy.py, service.py y frontend/src/modules/analytics/AnalyticsPage.tsx; conservar negativos y limitar ai-quality/usage por dueño (FR-017, FR-021, FR-023–024).
- [x] T019 [US4] Preservar sugerencia inicial/versiones frente a reintentos y ajustes en backend/app/modules/calificaciones/breakdown_service.py y backend/tests/unit/test_breakdown_history.py; registrar medición de intervalos conocida en specs/032-calificacion-impacto-docente/quickstart.md (FR-018–019, SC-007, SC-010).

## Fase 5: US2 — Mesa de revisión (P1)

Prueba independiente: editar pregunta intermedia, guardar/siguiente y abrir su hoja en móvil sin perder borrador.

- [x] T020 [US2] Cubrir conflictos/errores y último alumno en frontend/src/modules/calificaciones/components/GradeComponentEditor.test.tsx y frontend/e2e/explainable-grading.spec.ts (FR-008, SC-003).
- [x] T021 [US2] Añadir visor de página autorizada y caché por huella en backend/app/modules/calificaciones/router.py; pruebas de ámbito/límites/PDF20 en backend/tests/unit/test_calificaciones_revision_workspace.py (FR-007, FR-023).
- [x] T022 [US2] Reorganizar evidencia/pregunta/editor en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y components/GradeBreakdown.tsx; guardar/siguiente versionado en components/GradeComponentEditor.tsx sin publicar implícitamente (FR-007–009).
- [x] T023 [US2] Validar cinco resoluciones, temas, teclado, scroll y dos acciones al visor en frontend/e2e/accessibility/grading-review.a11y.spec.ts y frontend/e2e/visual/grading-review.visual.spec.ts; registrar Safari/Brave físicos como pendientes si no disponibles (FR-009, SC-004).

## Fase 6: US3 — Calidad y contexto (P1)

Prueba independiente: casos abiertos de Lenguaje/Sociales, fuente autorizada/ausente y criterio parcial.

- [x] T024 [US3] Añadir casos de paráfrasis, interpretación válida, argumento parcial, blanco e ilegible en backend/tests/integration/test_explainable_grading_pipeline.py; registrar discrepancias frente a referencia docente (FR-010–011, SC-005).
- [x] T025 [US3] Separar orientación de mejora y justificación en backend/app/modules/calificaciones/agents.py y breakdown_service.py, contratos opcionales y frontend/src/modules/calificaciones/components/GradeBreakdown.tsx; conservar límites/fórmula sin doble DBA (FR-010, FR-011).
- [x] T026 [US3] Recuperar fuentes por pregunta después de extracción con versiones/ámbito en backend/app/modules/calificaciones/orchestrator.py y backend/app/modules/rag/; probar fuentes ajenas, retiradas y ausencia en backend/tests/integration/test_explainable_grading_pipeline.py (FR-012, SC-006).
- [x] T027 [US3] Diferenciar extracción, valoración y verificación en frontend/src/modules/calificaciones/components/GradeBreakdown.tsx y sus pruebas; no rotular acuerdo informado como independencia ni exactitud calibrada (FR-013).

## Fase 7: US5 — Estudio autorizado (P2)

Prueba independiente: importar/exportar conjunto sintético con referencias externas y faltantes, sin tocar notas.

- [x] T028 [US5] Incorporar impacto_studies/impacto_observations e instrumentos, concesiones y procedencia versionados en backend/app/modules/impacto_tesis/ y backend/alembic/versions/; probar migración aditiva sin datos reales (FR-019–020, FR-022–023, FR-026).
- [x] T029 [US5] Implementar creación sintética, activación con requisitos institucionales y autorización por conjunto/acción en backend/app/modules/impacto_tesis/router.py; probar administrador sin concesión, revocación y docente ajeno en backend/tests/integration/ (FR-023, SC-009).
- [x] T030 [US5] Implementar importación atómica/replay/revisiones, encuesta persistida e instrumentos validados en backend/app/modules/impacto_tesis/router.py; pruebas de tamaños y ninguna modificación académica en backend/tests/integration/ (FR-019, FR-020, FR-022, SC-009).
- [x] T031 [US5] Exportar manifiesto minimizado e indicadores reproducibles en backend/app/modules/impacto_tesis/; ajustar kappa_service.py a categorías fijas y casos degenerados explícitos, probar faltantes/negativos/referencia no independiente (FR-017–023, SC-008).
- [x] T032 [US5] Integrar controles autorizados de estudio/observaciones y métricas diferenciadas en frontend/src/modules/analytics/AnalyticsPage.tsx y backend/app/modules/impacto_tesis/router.py; validar persistencia/denegación end-to-end sin inscribir docentes automáticamente (FR-019–023).
- [x] T033 [US5] Implementar retención separada y auditable del estudio con política autorizada en backend/app/modules/impacto_tesis/; probar que no borra evidencia académica ni guarda contenido sensible en logs (FR-023, FR-026).

## Fase final: Validación y entrega

- [x] T034 Actualizar contratos/planes/tareas propietarios de specs/008-calificaciones/, 009-xali-rag-refuerzos/, 011-reportes-analitica-impacto/, 012-ia-jobs-produccion/, 016-calificacion-explicable/, 020-deepseek-vision/ y 031-acelerar-pipelines-ia/; inventario en specs/README.md (FR-026).
- [x] T035 Ejecutar regresiones, tipos, lint, frontend/backend/E2E y build Docker aplicables; validar rollback funcional en specs/032-calificacion-impacto-docente/quickstart.md (SC-001–010).
- [x] T036 Ejecutar speckit-converge y registrar trabajo restante en specs/032-calificacion-impacto-docente/tasks.md; PR solo con CI/aprobaciones y dependencia #64 resuelta, sin push directo a main (FR-026).

## Dependencias y ejecución incremental

T001–003 → T004–005 → US1 → US4 → US2 → US3 → US5 → T034–036.
Dentro de cada historia, pruebas preceden al cambio y tareas del mismo archivo son secuenciales.
US1 es el primer incremento útil; no afirmar 032 terminada al completar solo recuperación.

Oportunidades paralelas sin agentes automáticos: fixtures backend/expectativas UI de US1; escenarios de reloj backend/UI de US4; pruebas de visor/maquetación US2; casos semánticos/casos de autorización RAG US3; pruebas importación/exportación US5. Solo paralelizar cuando sus contratos y predecesores estén completos; por eso las tareas compartidas no llevan [P].

## Trazabilidad y criterio de avance

Las referencias FR/SC en cada tarea asignan responsables; 26 requisitos y 10 criterios de éxito tienen cobertura.
No ejecutar pruebas pagadas ni producción sin autorización de costo/datos. No convertir metas de tesis en resultados.
Avanzar tras regresión proporcional del incremento; dejar fallos y pendientes visibles aquí.
