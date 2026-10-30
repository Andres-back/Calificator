# Tareas: reparto seguro de puntos

## Fase1: preparación

- [x] T001 Registrar issue292 y aprobación del plan/rangos en specs/137-puntajes-reparto-seguro/spec.md, plan.md y research.md.
- [x] T002 Revisar calidad16/16, contratos y conservación en specs/137-puntajes-reparto-seguro/checklists/requirements.md, contracts/reparto.md y data-model.md.

## Fase2: fundamentos

- [x] T003 Escribir regresiones RED de grupos, coma/precisión/restos y valores fijados en backend/tests/unit/test_score_allocation.py y frontend/src/modules/evaluaciones/components/scoreAllocation.test.ts.
- [x] T004 Implementar política y contratos estrictos en backend/app/modules/evaluaciones/score_allocation.py y score_schemas.py; reflejar la presentación en frontend/src/modules/evaluaciones/components/scoreAllocation.ts sin sustituir la validación del servidor.
- [x] T005 Añadir recibos, registro ORM y migración aditiva con pruebas de conservación/repetición en backend/app/modules/evaluaciones/score_models.py, backend/alembic/versions/202610300001_evaluation_score_operations.py y backend/tests/integration/test_score_allocation_persistence.py.

## Fase3: historia1 — reparto

- [x] T006 [US1] Añadir editor de total/tipo/rangos/secciones, miembros y fijar/liberar con mensajes de total/restante en frontend/src/modules/evaluaciones/components/EvaluationScoreDialog.tsx y pruebas; FR-001, FR-002, FR-003, FR-010/SC-001, SC-004.
- [x] T007 [US1] Integrar acceso visible «Repartir puntos» en frontend/src/modules/evaluaciones/EvaluacionesPage.tsx y frontend/src/modules/materias/MateriaEvaluaciones.tsx (ruta usada por el docente), API/tipos en frontend/src/modules/evaluaciones/scoreApi.ts; no cambiar contenido al navegar.

## Fase4: historia2 — guardado seguro

- [x] T008 [US2] Guardar plan compilado, preservar snapshots/contextos anteriores y conflictos/procesos activos en backend/app/modules/evaluaciones/score_service.py y score_router.py; registro autorizado en backend/app/api.py, incluido por main.py; FR-004, FR-009/SC-002.
- [x] T009 [US2] Reconocer cambios solo de máximos del editor existente en backend/app/modules/evaluaciones/service.py y probar datos antiguos/versionados sin eludir bloqueos documentales en backend/tests/integration/test_score_allocation_persistence.py.

## Fase5: historia3 — notas anteriores

- [x] T010 [US3] Implementar propuesta proporcional y exclusiones de manuales/pendientes/ambiguas con fingerprints en backend/app/modules/evaluaciones/score_service.py y score_notes.py; pruebas unitarias y de persistencia; FR-005, FR-006, FR-009/SC-003.
- [x] T011 [US3] Aplicar selección confirmada con bloqueo, versiones/auditoría/contexto de pesos y recibo idempotente por caso en backend/app/modules/evaluaciones/score_service.py y score_notes.py, reutilizando backend/app/modules/calificaciones/breakdown_service.py; probar respuesta perdida, concurrencia,20/100 notas y repetición; FR-007, FR-008, FR-009/SC-003.
- [x] T012 [US3] Añadir vista previa, confirmación, resultados parciales y recuperación separadas en frontend/src/modules/evaluaciones/components/EvaluationScoreDialog.tsx y pruebas; preservar ajustes, permisos, borrador y cambio de cuenta; FR-005, FR-007, FR-008, FR-010.

## Fase final: validación

- [x] T013 Probar recorridos360/390/768/1440px, dos temas, grupos/rangos, confirmación y permisos en frontend/e2e/evaluation-score-allocation.spec.ts, sin IA ni producción; FR-010/SC-004.
- [x] T014 Ejecutar unidades, integración PostgreSQL aislada/migración, tipos/lint/build/E2E y gobernanza/inventario; registrar resultados reales y límites en specs/137-puntajes-reparto-seguro/quickstart.md.
- [x] T015 Actualizar specs/README.md e inventario, ejecutar Converge y revisar diff para preparar PR enlazado al issue292 únicamente con tareas verificadas; publicación después del commit gobernado, no antes. No fusionar/desplegar automáticamente.

## Dependencias y estrategia

T001–T002→Analyze→T003→T004. T005 y T008 preceden T009/T010/T011; T006/T007 pueden desarrollarse con DTO sintético tras la política, pero T012 requiere el recibo y contratos reales. T013–T015 cierran todas las historias.

Trabajo independiente posible: matemática frontend/backend y sus unidades; se ejecuta con un solo agente, sin delegación. MVP técnico: reparto y guardado versionado sin cambios de notas; no declarar el alcance completo hasta implementar y verificar también la actualización confirmada.

Cobertura: FR-001–FR-003→T003/T004/T006/T007; FR-004→T008/T009; FR-005–FR-008→T010/T011/T012; FR-009→T005/T008–T012; FR-010→T006/T012/T013; SC-001–SC-004→T003/T009/T011/T013/T014.

## Phase 6: Convergence

- [x] T016 Integrar la base136 ya aprobada, conservando navegación compacta/foco/scroll y componentPoints del reparto; comprobar la apertura/copia de enlaces en WebKit, unidades, tipos/build e inventario/gobernanza y preparar la actualización de PR294. La entrega posterior al commit mantiene la fusión bloqueada hasta CI vigente verde. FR-003, FR-010/SC-004, Constitución VII–VIII (hallazgo F1 de CI, severidad HIGH; integración comprobada localmente, CI remoto separado).
