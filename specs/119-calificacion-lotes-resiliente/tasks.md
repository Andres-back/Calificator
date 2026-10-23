# Tareas: calificaciones en lote recuperables

## Fase 1: Preparación

- [x] T001 Registrar diagnóstico, aprobación del tope 60 y límites de datos en specs/119-calificacion-lotes-resiliente/spec.md, plan.md y research.md (FR-001/002/007).
- [x] T002 Revisar calidad de requisitos y análisis de cobertura en specs/119-calificacion-lotes-resiliente/checklists/recovery.md antes de implementación (FR-001–009).

## Fase 2: Fundamentos — TDD primero

- [x] T003 Añadir y ejecutar regresiones inicialmente fallidas de política, recuperación y reinicio en backend/tests/unit/test_grading_recovery.py (FR-002/003/004/005; SC-002/004).
- [x] T004 Añadir regresiones de capacidad, plazo de transporte, códigos seguros y captura/visibilidad en backend/tests/unit/test_ai_api_connections.py, test_ai_usage_pipeline.py y test_grading_recovery.py (FR-001/002/008).
- [x] T005 Crear política y controlador privado de etapas en backend/app/modules/calificaciones/execution_policy.py y recovery.py (FR-002/003/004).

## Fase 3: Historia 1 — admisión y tope (P1)

Meta independiente: veinte entregas conservadas, máximo simultáneo respetado, plazo contado después de turno.

- [x] T006 [US1] Cubrir rutas configuradas/heredadas con capacidad estricta y plazo total 60 en backend/app/modules/calificaciones/agents.py y backend/app/services/ai_provider_capacity.py (FR-001/002; SC-001).
- [x] T007 [US1] Capturar política efectiva y códigos de transporte en backend/app/modules/jobs/service.py y backend/app/modules/analytics/usage_logger.py (FR-002/008).
- [x] T008 [US1] Ejecutar lote simulado de veinte y comparar camino normal sin llamadas añadidas en backend/tests/unit/test_grading_recovery.py (FR-009; SC-001/005).

## Fase 4: Historia 2 — recuperar solo pendiente (P1)

Meta independiente: reinicio o fallo temporal no repite etapas válidas; principal recuperado siempre se verifica.

- [x] T009 [US2] Integrar controlador por partición/rol y recuperación del mismo modelo en backend/app/modules/calificaciones/orchestrator.py y grading_service.py (FR-003, FR-004, FR-005; SC-002/004).
- [x] T010 [US2] Persistir progreso validado y contadores bajo claim/huella en backend/app/workers/tasks_grading.py y backend/app/modules/jobs/service.py (FR-003/007).
- [x] T011 [US2] Añadir y ejecutar regresiones PostgreSQL aisladas de reinicio, propiedad, huella y prioridad docente en backend/tests/integration/ y backend/tests/unit/test_tasks_grading.py (FR-003/004/007; SC-003/004).

## Fase 5: Historia 3 — estados honestos (P2)

Meta independiente: una valoración válida sin verificador queda identificada como pendiente, no dual completa.

- [x] T012 [US3] Probar e implementar completitud, estado requires_review y aviso comprensible en backend/app/modules/calificaciones/orchestrator.py, backend/app/workers/tasks_grading.py y frontend/src/modules/calificaciones/ (FR-006/008; SC-003).
- [x] T013 [US3] Exponer política efectiva en backend/app/modules/admin_ai_config/control_center_service.py y frontend/src/modules/admin/ai/sections/FunctionsSection.tsx con pruebas frontend a 360 px/escritorio (FR-002/008).

## Fase final: Validación

- [x] T014 Ejecutar lint, regresiones backend/frontend y build; documentar resultados y límites en specs/119-calificacion-lotes-resiliente/quickstart.md (FR-007/009; SC-001–005).
- [x] T015 Actualizar specs/README.md, tests/spec_governance/test_spec_baseline.py e inventario con export limpio; ejecutar gobernanza sin cambios ajenos (FR-007/009).
- [x] T016 Ejecutar Converge contra specs/119-calificacion-lotes-resiliente/spec.md, plan.md y tasks.md; resolver únicamente trabajo dentro del alcance.
- [x] T017 Preparar la publicación de rama y PR vinculado al issue #253, con cuerpo de entrega y CI obligatorio, sin merge/despliegue no autorizados; registrar evidencia en specs/119-calificacion-lotes-resiliente/quickstart.md. La creación externa del PR sigue como paso de entrega, no como condición circular de su propio commit.

## Dependencias y estrategia

T001 → T002 → T003/T004 → T005 → US1 → US2 → US3 → validación. Tests preceden al cambio correspondiente. US1 puede probarse por cliente; US2 por controlador/worker; US3 por contrato/estado/UI. Se requiere el conjunto para entregar la recuperación completa, no se despliega un incremento parcial.

Trabajo paralelizable sin delegación: casos de transporte y controlador se pueden ejecutar en suites separadas después de crear ambos. No se modifican dos veces simultáneamente agents.py/orchestrator.py. Se mantienen modelos, presupuesto de salida y evidencias guardadas.

## Phase 7: Convergence

- [x] T018 Completar el presupuesto durable de intentos de revisión adicional en backend/app/modules/calificaciones/orchestrator.py y pruebas en backend/tests/unit/test_grading_recovery.py; conservar el fallback seguro de dos notas válidas si el árbitro no termina, sin repetir valoración/verificación, según FR-004 y plan: presupuesto por etapa (partial, HIGH).
- [x] T019 Conservar el identificador de ejecución entre reinicios y distinguir espera de capacidad/resultados reutilizados en backend/app/modules/calificaciones/orchestrator.py, recovery.py y backend/tests/unit/test_grading_recovery.py, según FR-008 y plan: observabilidad de recuperación (partial, MEDIUM).
