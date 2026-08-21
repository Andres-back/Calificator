# Tareas: Calificación explicable y auditable

## Fase 1: Preparación

- [X] T001 Registrar banderas separadas de generación y autoridad del desglose en `backend/app/core/config.py` y `backend/.env.example` (FR-035)
- [X] T002 [P] Definir tipos TypeScript del contrato de desglose, fórmula, componente, versión y ajuste en `frontend/src/types/api.ts` (FR-003, FR-012, FR-020)
- [X] T003 [P] Crear fixtures de blueprint, respuestas online, visión multihoja, rúbrica y nota manual en `backend/tests/fixtures/explainable_grading.py` (FR-002, FR-029)

## Fase 2: Fundamentos bloqueantes

- [X] T004 [P] Escribir pruebas de cálculo Decimal, límites, distribución, redondeo y claves canónicas en `backend/tests/unit/test_calificacion_breakdown.py` (FR-002, FR-012–FR-015)
- [X] T005 [P] Escribir pruebas de sanitización que rechacen razonamiento privado, prompts y campos desconocidos en `backend/tests/unit/test_breakdown_sanitizer.py` (FR-011)
- [X] T006 Implementar modelos versionados de desglose, componentes y ajustes en `backend/app/modules/calificaciones/breakdown_models.py` (FR-001, FR-020, FR-023)
- [X] T007 Crear migración aditiva, índices únicos e integración nullable con incidencias en `backend/alembic/versions/202608210001_calificacion_desgloses.py` (FR-023, FR-027, FR-035)
- [X] T008 Implementar estados, claves canónicas, cálculo Decimal, validación de cobertura y sanitización allowlist en `backend/app/modules/calificaciones/breakdown_policy.py` (FR-002–FR-015)
- [X] T009 Definir esquemas Pydantic separados para docente, estudiante, edición e historial en `backend/app/modules/calificaciones/schemas.py` (FR-003, FR-020, FR-024–FR-026)
- [X] T010 Implementar creación idempotente, lectura activa, versionado inmutable y serialización por rol en `backend/app/modules/calificaciones/breakdown_service.py` (FR-016–FR-025, FR-031–FR-032)

## Fase 3: Historia 1 — Comprender la nota sugerida (P1)

**Objetivo**: producir una nota automática explicada por todos sus componentes y una fórmula exacta.

**Prueba independiente**: una entrega de varias preguntas genera componentes únicos; dos evaluadores con totales iguales pero distribución distinta dejan la pregunta discrepante visible.

- [X] T011 [P] [US1] Escribir pruebas de validación objetiva, consenso por componente y discrepancias compensadas en `backend/tests/unit/test_grading_component_consensus.py` (FR-008, FR-016–FR-017)
- [X] T012 [P] [US1] Escribir prueba de persistencia automática e idempotencia por `pipeline_run_id` en `backend/tests/unit/test_breakdown_persistence.py` (FR-001, FR-023, FR-031)
- [X] T013 [US1] Cambiar el contrato de `AgentResult` y prompts para puntuar claves suministradas y explicaciones verificables en `backend/app/modules/calificaciones/agents.py` (FR-002–FR-011)
- [X] T014 [US1] Construir el esqueleto canónico, aplicar la validación objetiva y consolidar por componente en `backend/app/modules/calificaciones/orchestrator.py` (FR-002, FR-008–FR-017)
- [X] T015 [US1] Persistir el desglose sanitizado en la misma transacción de la calificación y proteger decisiones docentes en `backend/app/workers/tasks_grading.py` y `backend/app/modules/calificaciones/photo_service.py` (FR-011, FR-023, FR-031)
- [X] T016 [US1] Añadir el desglose docente y estado heredado al detalle existente en `backend/app/modules/calificaciones/service.py` y `backend/app/modules/calificaciones/router.py` (FR-018, FR-028)
- [X] T017 [P] [US1] Crear componentes accesibles `GradeFormula` y `GradeBreakdown` en `frontend/src/modules/calificaciones/components/GradeFormula.tsx` y `frontend/src/modules/calificaciones/components/GradeBreakdown.tsx` (FR-003, FR-012, FR-033)
- [X] T018 [US1] Integrar respuesta, referencia, evidencia, discrepancias y fórmula en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` (FR-005–FR-006, FR-016, FR-018)
- [X] T019 [P] [US1] Cubrir visualización docente y estados incompletos en `frontend/src/modules/calificaciones/components/GradeBreakdown.test.tsx` (SC-001–SC-006)

## Fase 4: Historia 2 — Ajustar con trazabilidad (P1)

**Objetivo**: editar puntos o ajuste global sin romper la fórmula y conservar una versión auditable.

**Prueba independiente**: cambiar un componente crea una nueva versión, recalcula la nota y un segundo guardado con versión antigua recibe 409 sin sobrescribir.

- [X] T020 [P] [US2] Escribir pruebas de edición atómica, concurrencia, historial y bloqueos de publicación en `backend/tests/unit/test_breakdown_teacher_adjustment.py` (FR-019–FR-023)
- [X] T021 [US2] Implementar copia de versión, ajustes antes/después y control optimista en `backend/app/modules/calificaciones/breakdown_service.py` (FR-019–FR-023)
- [X] T022 [US2] Exponer GET/PUT de desglose e historial y extender confirmar/publicar con guardas en `backend/app/modules/calificaciones/router.py` y `backend/app/modules/calificaciones/service.py` (FR-018–FR-023)
- [X] T023 [US2] Añadir métodos de consulta, edición y manejo de 409 en `frontend/src/modules/calificaciones/api.ts` (FR-019–FR-022)
- [X] T024 [P] [US2] Crear editor móvil por componente con motivo interno y explicación estudiantil en `frontend/src/modules/calificaciones/components/GradeComponentEditor.tsx` (FR-019–FR-021, FR-033)
- [X] T025 [US2] Integrar edición, recálculo previo, bloqueos y resolución de conflicto en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` (FR-019–FR-022)
- [X] T026 [P] [US2] Cubrir edición, validaciones y conflicto de versión en `frontend/src/modules/calificaciones/components/GradeComponentEditor.test.tsx` (SC-004, SC-007, SC-011)

## Fase 5: Historia 3 — Explicación publicada y revisión estudiantil (P1)

**Objetivo**: mostrar al estudiante su desglose publicado sin filtrar claves y permitir reclamos por componente.

**Prueba independiente**: una nota publicada se ve desde “Ver entrega”; con entregas abiertas la referencia no está en el payload y un reclamo queda ligado a una pregunta.

- [X] T027 [P] [US3] Escribir pruebas de autorización, publicación, redacción de claves y legado en `backend/tests/unit/test_breakdown_visibility.py` (FR-024–FR-028, FR-032)
- [X] T028 [US3] Implementar endpoint `mi-desglose` y extender solicitud de revisión con componente/versión en `backend/app/modules/calificaciones/router.py`, `backend/app/modules/calificaciones/service.py` y `backend/app/modules/calificaciones/incidencia_models.py` (FR-024–FR-028)
- [X] T029 [US3] Añadir API estudiantil de desglose y reclamo específico en `frontend/src/modules/evaluaciones/api.ts` (FR-024, FR-027)
- [X] T030 [US3] Mostrar fórmula y componentes publicados y permitir seleccionar pregunta en `frontend/src/modules/evaluaciones/ResolverEvaluacionPage.tsx` (FR-024–FR-027, FR-033)
- [X] T031 [P] [US3] Cubrir clave oculta/liberada, detalle heredado y reclamo por pregunta en `frontend/src/modules/evaluaciones/ResolverEvaluacionPage.test.tsx` (SC-008–SC-011)

## Fase 6: Historia 4 — Consistencia entre modalidades (P2)

**Objetivo**: aplicar el mismo contrato a online, visión, mixto, rúbrica, DBA contextual y nota manual.

**Prueba independiente**: cada modalidad crea una sola nota explicada; DBA no suma y una rúbrica ponderada participa una vez.

- [X] T032 [P] [US4] Escribir pruebas de online, multihoja, mixto, rúbrica, DBA no puntuable y manual en `backend/tests/unit/test_breakdown_modalities.py` (FR-014, FR-029–FR-031)
- [X] T033 [US4] Adaptar calificación online y mixta al desglose canónico en `backend/app/modules/calificaciones/service.py` y `backend/app/modules/calificaciones/orchestrator.py` (FR-029, FR-031)
- [X] T034 [US4] Crear componente manual auditable para nota directa, ausencia y fuera de plazo en `backend/app/modules/calificaciones/service.py` (FR-029–FR-030)
- [X] T035 [US4] Mapear rúbrica puntuable y DBA contextual sin doble conteo en `backend/app/modules/calificaciones/breakdown_policy.py` (FR-014, FR-029)
- [X] T036 [P] [US4] Ejecutar flujo integrado por modalidad y autorización en `backend/tests/integration/test_explainable_grading_flow.py` (SC-001–SC-005, SC-013)

## Fase 7: Validación, adopción progresiva y cierre

- [X] T037 Implementar modo controlado y autoridad configurable sin alterar notas oficiales en `backend/app/modules/calificaciones/breakdown_service.py` y `backend/app/core/config.py` (FR-035)
- [X] T038 [P] Añadir regresiones de endpoints actuales y comparación vigente/nuevo en `backend/tests/unit/test_breakdown_compatibility.py` (FR-035)
- [X] T039 [P] Añadir recorrido E2E docente-estudiante y vistas 360/390/768 en `frontend/e2e/explainable-grading.spec.ts` (SC-006–SC-011)
- [X] T040 Medir diez ejecuciones equivalentes e idempotencia y documentar resultados en `specs/016-calificacion-explicable/validation.md` (SC-012–SC-013)
- [X] T041 Ejecutar migración upgrade/downgrade/upgrade y suites backend unitarias e integración según `specs/016-calificacion-explicable/quickstart.md`
- [X] T042 Ejecutar typecheck, lint, Vitest, build, Playwright y builds Docker según `specs/016-calificacion-explicable/quickstart.md`
- [X] T043 Actualizar `specs/008-calificaciones/spec.md`, `specs/README.md` y documentación API con el contrato vigente (FR-034)
- [X] T044 Ejecutar `$speckit-converge`, completar cualquier tarea añadida y dejar todas las tareas marcadas (FR-034)
- [X] T045 Añadir política y control docente para liberar u ocultar referencias, con pruebas de no filtración mientras las entregas estén abiertas, en `backend/app/modules/calificaciones/breakdown_service.py`, `backend/app/modules/calificaciones/router.py` y `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` (FR-025–FR-026, SC-009)

## Mapa explícito de requisitos para CI

Los rangos anteriores incluyen de forma expresa FR-004, FR-005, FR-007, FR-009, FR-010, FR-013 y FR-019.

## Dependencias

- Fase 1 no tiene dependencias.
- Fase 2 bloquea todas las historias.
- US1 bloquea US2 porque la edición necesita un desglose canónico persistido.
- US1 permite comenzar US3 en backend, pero US3 debe esperar la publicación protegida de US2 para el recorrido completo.
- US4 depende de los fundamentos y reutiliza el contrato de US1; puede desarrollarse en paralelo con la UI de US2/US3.
- La fase 7 depende de US1–US4 completas.

## Oportunidades paralelas

- T002 y T003 pueden ejecutarse mientras se preparan pruebas de dominio T004/T005.
- Pruebas marcadas `[P]` pueden escribirse en paralelo por usar archivos independientes.
- T017/T019 pueden avanzar mientras se integra backend US1 después de fijar los esquemas.
- T024/T026 y T027 pueden avanzar en paralelo tras estabilizar el contrato.
- T038 y T039 son independientes una vez completadas las historias.

## Estrategia de implementación

1. Completar Fases 1–2 con pruebas rojas antes del dominio.
2. Entregar US1 como MVP interno en modo controlado: desglose visible al profesor sin autoridad sobre la nota oficial.
3. Añadir edición/versionado y publicación segura (US2).
4. Exponer la versión publicada al estudiante y reclamos específicos (US3).
5. Cerrar modalidades y activar autoridad solo tras regresiones (US4 + Fase 7).


## Fase 8: Convergencia final

- [X] T046 [US4] Persistir el desglose automático dentro de la misma transacción del modo salón y cubrirlo con regresión en `backend/app/modules/calificaciones/salon_mode_service.py` y `backend/tests/unit/test_breakdown_modalities.py` (FR-029, FR-031)
- [X] T047 [US2] Exponer en el espacio docente un ajuste global separado con vista previa, motivo interno y explicación estudiantil en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y sus componentes (FR-019–FR-021)
- [X] T048 [US2] Mostrar al docente el historial de versiones del desglose, diferenciando versión activa, origen, fecha y nota final en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y sus componentes (FR-020, FR-023)
- [X] T049 [P] Añadir regresiones de autorización servidor para impedir acceso cruzado a desgloses de profesor y estudiante en `backend/tests/unit/test_breakdown_authorization.py` (FR-024–FR-026, SC-013)
- [X] T050 [P] Completar los viewports 360×800, 390×844 y 768×1024 en `frontend/e2e/explainable-grading.spec.ts` y comprobar ausencia de desbordamiento horizontal (SC-006–SC-011)
- [X] T051 [US2] Persistir y serializar por rol el detalle del ajuste global, mostrando al estudiante su explicación pedagógica sin filtrar el motivo interno en `backend/app/modules/calificaciones/breakdown_service.py`, esquemas y frontend (FR-020–FR-021, FR-025)
- [X] T052 [US2] Resolver el nombre del actor en el historial versionado y cubrirlo con regresión de servicio en `backend/app/modules/calificaciones/breakdown_service.py` (FR-020, FR-023)- [X] T053 [US3] Impedir que el DTO estudiantil publique un desglose que no reproduzca la nota oficial mientras la autoridad permanezca en modo controlado, con regresión de compatibilidad en `backend/app/modules/calificaciones/breakdown_service.py` y `backend/app/modules/calificaciones/router.py` (FR-013, FR-024, FR-032, FR-035)