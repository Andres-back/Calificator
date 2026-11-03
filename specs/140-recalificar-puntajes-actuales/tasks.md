# Tareas: Recalificar con puntajes actuales

## Fase 1: Preparación

- [x] T001 Registrar aprobación, issue #299 y diseño en specs/140-recalificar-puntajes-actuales/spec.md y plan.md.
- [x] T002 Crear y revisar maqueta sintética384px previa al código funcional en output/playwright/spec140-maqueta.html y documentar reducción visual en specs/140-recalificar-puntajes-actuales/quickstart.md.

## Fase 2: Fundamentos

- [x] T003 Ejecutar análisis cruzado de specs/140-recalificar-puntajes-actuales/{spec,plan,tasks}.md y puerta de requisitos antes de implementar.
- [x] T004 [P] Crear pruebas unitarias de comparación, privacidad y versión en backend/tests/unit/test_reprocessing_context.py; demostrar fallo previo.
- [x] T005 [P] Crear fixture y regresiones PostgreSQL sin IA en backend/tests/integration/test_regrading_score_context.py; demostrar fallo previo.

## Fase 3: Historia 1 — Puntajes actuales (P1)

- [x] T006 [US1] Implementar consulta autorizada y comparador/huella en backend/app/modules/calificaciones/reprocessing_context.py, revision_router.py y schemas.py (FR001–004, FR006, FR010).
- [x] T007 [US1] Validar aceptación bajo locks, archivar contexto anterior y adoptar referencia exacta antes de encolar en backend/app/modules/calificaciones/revision_service.py (FR004–008).
- [x] T008 [P] [US1] Añadir contrato, consulta y comparación/aceptación en frontend/src/modules/calificaciones/api.ts y components/GradeReprocessing.tsx, con sus pruebas unitarias (FR001, FR003, FR009–011).

## Fase 4: Historia 2 — Protección de versiones (P1)

- [x] T009 [US2] Probar cambios de contenido/escala, referencias obsoletas, permisos, clientes antiguos y ausencia de versión en backend/tests/integration/test_regrading_score_context.py y unit/test_reprocessing_context.py (FR002, FR004, FR006–008).
- [x] T010 [US2] Probar repetición, conflicto concurrente, rollback, trabajos activos y reemplazo de evidencia, conservando ajustes/historial, en backend/tests/integration/test_regrading_score_context.py (FR005, FR008–010, FR012).

## Fase 5: Historia 3 — Experiencia e historial (P2)

- [x] T011 [US3] Comprobar consulta fallida/reintento, 409, fotos/motivo conservados y aceptación retirada en frontend/src/modules/calificaciones/components/GradeReprocessing.test.tsx (FR009–011).
- [x] T012 [US3] Añadir y ejecutar flujo E2E384/1440 claro/oscuro con capturas reales en frontend/e2e/regrading-score-context.spec.ts; incluir proyecto WebKit acotado en frontend/playwright.config.ts (FR011, SC004).

## Fase final: Validación

- [x] T013 Ejecutar regresiones de backend, reparto, versiones y evidencia; frontend unit/type/lint/build y seguridad aplicable, registrando resultados reales en specs/140-recalificar-puntajes-actuales/quickstart.md (SC001–003).
- [x] T014 Actualizar inventario técnico specs/system-inventory/current.json y verificar gobernanza con scripts/build_system_inventory.py y scripts/check_spec_governance.py.
- [x] T015 Ejecutar convergencia, cerrar tareas y preparar PR con CI, sin fusión ni despliegue, desde specs/140-recalificar-puntajes-actuales/tasks.md.

## Dependencias

T001 → T002 → T003 → T004/T005 → T006/T007 y T008 → T009–T012 → T013/T014 → T015.
Backend y frontend pueden desarrollarse en paralelo tras fijar contrato; pruebas
de integración editan archivos distintos. La misma sesión PostgreSQL no se comparte
entre operaciones concurrentes. Ningún resultado remoto se presupone verde.

## Estrategia

MVP US1; después proteger casos US2 y validar US3 sin ampliar el alcance. Los 12 FR
y cuatro SC están cubiertos por las tareas anteriores. No hay pruebas con IA ni
modificación académica real, ni comparación adicional de modelos.

## Cobertura explícita

| Requisito | Tareas |
| --- | --- |
| FR-001 | T006, T008 |
| FR-002 | T006, T009 |
| FR-003 | T006, T008 |
| FR-004 | T007, T009, T010 |
| FR-005 | T007, T010 |
| FR-006 | T006, T009 |
| FR-007 | T007, T009 |
| FR-008 | T007, T009, T010 |
| FR-009 | T008, T011 |
| FR-010 | T006, T010, T011 |
| FR-011 | T008, T011, T012 |
| FR-012 | T010, T013 |

## Estado de entrega

Implementación y validación local aplicable completas. El PR se prepara como
borrador: CI Linux completo es obligatorio antes de declararlo fusionable.
La regresión WebKit25 local fue interrumpida por una caída del motor Docker;
no se registra como aprobada ni se eluden controles. Véase quickstart.md.
