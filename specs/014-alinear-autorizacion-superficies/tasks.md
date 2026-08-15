# Tareas: Alineación de autorización efectiva

## Fase 1: Preparación

- [X] T001 Crear helpers reutilizables de usuarios y clientes autenticados para pruebas de autorización en `backend/tests/unit/authorization_helpers.py`
- [X] T002 [P] Añadir fixtures de propiedad, matrícula, publicación y objeto ajeno en `backend/tests/unit/authorization_helpers.py`
- [X] T003 [P] Fijar en una prueba la matriz canónica de diez superficies de `specs/014-alinear-autorizacion-superficies/contracts/authorization-matrix.md` en `backend/tests/unit/test_authorization_contracts.py`

## Fase 2: Fundamentos

- [X] T004 Crear utilidades de aserción para acceso permitido, denegado y ausencia de mutación en `backend/tests/unit/authorization_helpers.py`
- [X] T005 Incorporar el modelo validado de evidencia para overrides en `scripts/system_inventory/config.py` y `scripts/system_inventory/ownership.py`
- [X] T006 [P] Añadir fixtures de override con evidencia válida e inválida en `tests/spec_governance/fixtures/system_inventory/`
- [X] T007 Añadir pruebas base de carga, rutas de evidencia y duplicados de overrides en `tests/spec_governance/test_system_inventory_foundation.py`

## Fase 3: Historia 1 — Impedir accesos fuera del rol o ámbito

**Meta**: ninguna cuenta puede consultar o modificar objetos docentes ajenos mediante las diez superficies.

**Prueba independiente**: estudiante, usuario sin sesión y profesor ajeno reciben denegación sin datos ni cambios; profesor propietario conserva acceso.

- [X] T008 [P] [US1] Añadir pruebas de estudiante y profesor ajeno para GET/PUT asistencia en `backend/tests/unit/test_authorization_contracts.py`
- [X] T009 [P] [US1] Añadir pruebas de no matriculado y profesor ajeno para GET DBA combinado en `backend/tests/unit/test_authorization_contracts.py`
- [X] T010 [P] [US1] Añadir pruebas de material no publicado, no asignado y profesor ajeno en `backend/tests/unit/test_authorization_contracts.py`
- [X] T011 [P] [US1] Añadir pruebas de presentación no publicada, no matriculada y profesor ajeno en `backend/tests/unit/test_presentaciones_router.py`
- [X] T012 [P] [US1] Completar pruebas de estudiante y profesor ajeno al resolver incidencias en `backend/tests/unit/test_student_review_request.py`
- [X] T013 [US1] Añadir en `backend/tests/unit/test_authorization_contracts.py` aserciones que demuestren que cada superficie autoriza mediante el helper canónico antes de devolver contenido o persistir cambios
- [X] T014 [US1] Preservar los códigos públicos heredados y ajustar únicamente cuerpos que expongan contenido, propietario o estado interno; probar además ausencia de escrituras parciales en `backend/tests/unit/test_authorization_contracts.py` y, si corresponde, en `backend/app/modules/materias/service.py`, `backend/app/modules/herramientas/service.py`, `backend/app/modules/presentaciones/service.py` y `backend/app/modules/calificaciones/router.py`
- [X] T015 [US1] Ejecutar y estabilizar el contrato negativo completo en `backend/tests/unit/test_authorization_contracts.py`

## Fase 4: Historia 2 — Conservar las acciones legítimas

**Meta**: el refuerzo no rompe asistencia, DBA, recursos, presentaciones ni resolución de reclamos autorizados.

**Prueba independiente**: profesor propietario y administrador según capacidad completan sus recorridos; estudiantes matriculados conservan lecturas publicadas.

- [X] T016 [P] [US2] Añadir casos positivos de profesor propietario para asistencia y DBA en `backend/tests/unit/test_authorization_contracts.py`
- [X] T017 [P] [US2] Añadir casos positivos y límites administrativos de recursos en `backend/tests/unit/test_authorization_contracts.py`
- [X] T018 [P] [US2] Añadir listado, estado y preview autorizados de presentaciones en `backend/tests/unit/test_presentaciones_router.py`
- [X] T019 [P] [US2] Añadir resolución auditable por profesor responsable y administrador habilitado en `backend/tests/unit/test_student_review_request.py`
- [X] T020 [US2] Fijar en `backend/tests/unit/test_authorization_contracts.py` los códigos y cuerpos exitosos actuales de asistencia, DBA, recursos, presentaciones e incidencias; registrar con `$speckit-converge` cualquier implementación adicional descubierta
- [X] T021 [US2] Ejecutar la matriz positiva y comprobar que no cambia el contrato de respuesta exitoso en `backend/tests/unit/test_authorization_contracts.py`

## Fase 5: Historia 3 — Mantener la experiencia estudiantil segura

**Meta**: el estudiante consulta sus asignaciones y reclamos propios sin recibir capacidades docentes.

**Prueba independiente**: estudiante matriculado abre contenido publicado y su solicitud; no ve soluciones, objetos ajenos ni acciones de resolución.

- [X] T022 [P] [US3] Añadir pruebas de recurso de apoyo publicado y actividad saneada para estudiante en `backend/tests/unit/test_authorization_contracts.py`
- [X] T023 [P] [US3] Añadir pruebas de presentación publicada para matrícula activa y revocada en `backend/tests/unit/test_presentaciones_router.py`
- [X] T024 [P] [US3] Completar pruebas de creación/consulta propia y resolución denegada de reclamos en `backend/tests/unit/test_student_review_request.py`
- [X] T025 [P] [US3] Añadir regresión visual/funcional del acceso estudiantil a recursos en `frontend/e2e/student-activity-delivery.spec.ts`
- [X] T026 [US3] Fijar mediante pruebas en `backend/tests/unit/test_authorization_contracts.py` el filtrado de publicación, matrícula y saneamiento estudiantil vigente en `backend/app/modules/herramientas/service.py` y `backend/app/modules/presentaciones/service.py`
- [X] T027 [US3] Ejecutar el recorrido estudiantil independiente y documentar el resultado en `specs/014-alinear-autorizacion-superficies/quickstart.md`

## Fase 6: Historia 4 — Registrar analítica sin suplantación

**Meta**: la telemetría solo persiste eventos permitidos, atribuibles a la sesión y a referencias bajo su ámbito.

**Prueba independiente**: eventos válidos persisten; nombre, rol, referencia, metadata o coherencia inválidos se rechazan y el cliente no bloquea la acción principal.

- [X] T028 [P] [US4] Añadir pruebas del catálogo, roles, límites y claves prohibidas en `backend/tests/unit/test_analytics_events.py`
- [X] T029 [P] [US4] Añadir pruebas de evaluación/calificación propia, ajena e incoherente en `backend/tests/unit/test_analytics_events.py`
- [X] T030 [P] [US4] Añadir pruebas del contrato tipado y comportamiento fire-and-forget en `frontend/src/lib/analytics.test.ts`
- [X] T031 [US4] Implementar políticas y saneamiento del catálogo de `contracts/analytics-event-catalog.md` en `backend/app/modules/analytics/event_policy.py`
- [X] T032 [US4] Validar rol, referencias y metadata antes de persistir en `backend/app/modules/analytics/router.py` y `backend/app/modules/analytics/service.py`
- [X] T033 [US4] Tipar eventos y transformar referencias canónicas sin identidad declarada en `frontend/src/lib/analytics.ts`
- [X] T034 [US4] Ajustar emisores docentes al contrato canónico en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`
- [X] T035 [US4] Emitir el evento transversal permitido desde navegación autenticada sin duplicados en `frontend/src/components/layout/AppShell.tsx`
- [X] T036 [US4] Ejecutar pruebas backend/frontend de analítica y confirmar que un fallo de telemetría no altera calificaciones en `backend/tests/unit/test_analytics_events.py` y `frontend/src/lib/analytics.test.ts`

## Fase 7: Historia 5 — Eliminar la ambigüedad del inventario

**Meta**: las diez decisiones quedan auditadas y los mismos falsos positivos no reaparecen.

**Prueba independiente**: el inventario muestra actores efectivos, evidencia y issue para cada decisión y reporta cero hallazgos incluidos.

- [X] T037 [P] [US5] Añadir pruebas de evidencia inexistente, no-test, vacía y válida para overrides en `tests/spec_governance/test_system_inventory_foundation.py`
- [X] T038 [P] [US5] Añadir prueba de los diez hallazgos resueltos y de una regresión simulada en `tests/spec_governance/test_system_inventory_findings.py`
- [X] T039 [US5] Registrar las diez decisiones con issue #17 y evidencia en `specs/system-inventory/permission-overrides.json`
- [X] T040 [US5] Exponer evidencia y motivo de override en la salida canónica mediante `scripts/system_inventory/ownership.py`, `scripts/system_inventory/model.py` y `scripts/system_inventory/render.py`
- [X] T041 [US5] Regenerar `specs/system-inventory/current.json` y los inventarios de `specs/004-dba-asistencia-curriculo/`, `specs/006-recursos-actividades/`, `specs/008-calificaciones/`, `specs/010-presentaciones-imagenes/` y `specs/011-reportes-analitica-impacto/`
- [X] T042 [US5] Ejecutar dos generaciones consecutivas y validar cero diferencias incluidas con `scripts/build_system_inventory.py`

## Fase final: Validación y cierre

- [X] T043 [P] Actualizar contratos y quickstart si la implementación final ajusta límites en `specs/014-alinear-autorizacion-superficies/contracts/` y `specs/014-alinear-autorizacion-superficies/quickstart.md`
- [X] T044 [P] Ejecutar las pruebas completas de gobernanza en `tests/spec_governance/`
- [X] T045 Ejecutar compilación y pruebas unitarias/integración del backend en `backend/tests/`
- [X] T046 Ejecutar typecheck, lint estricto, unitarias, build y E2E aplicables desde `frontend/package.json`
- [X] T047 Validar configuración y construcción de imágenes mediante `docker-compose.yml`, `backend/Dockerfile` y `frontend/Dockerfile`
- [X] T048 Solicitar revisión humana de los 24 criterios sin modificar automáticamente `specs/014-alinear-autorizacion-superficies/checklists/security.md`
- [X] T049 Ejecutar `$speckit-converge` y añadir cualquier brecha real a `specs/014-alinear-autorizacion-superficies/tasks.md`
- [X] T050 Ejecutar gobernanza final, abrir PR enlazado a #17 y registrar evidencia de CI en `specs/014-alinear-autorizacion-superficies/tasks.md`

## Dependencias

- Fase 1 → Fase 2: los helpers de prueba preceden contratos por historia.
- Fase 2 → US1/US2/US3/US5: fixtures y validación base de overrides son compartidos.
- US1 y US2 pueden avanzar en paralelo después de Fundamentos, pero ambos preceden la validación integral de US3.
- US4 es funcionalmente independiente de US1–US3 después de Preparación.
- US5 requiere evidencia producida por US1–US4 antes de registrar overrides definitivos.
- Validación final requiere US1–US5 completas.

## Oportunidades de paralelismo

- T008–T012 se distribuyen por dominio sin compartir archivos salvo el contrato común.
- T016–T019 cubren módulos distintos.
- T022–T025 separan backend de E2E frontend.
- T028–T030 permiten escribir pruebas backend y frontend antes de implementar US4.
- T037–T038 pueden desarrollarse en paralelo sobre suites distintas.
- T043 y T044 pueden ejecutarse en paralelo antes de las suites completas.

## Estrategia de implementación

1. MVP: US1 con pruebas negativas y controles existentes demostrados.
2. Continuidad: US2 y US3 protegen recorridos legítimos del profesor y estudiante.
3. Endurecimiento: US4 corrige el único vacío funcional confirmado.
4. Trazabilidad: US5 elimina falsos positivos mediante decisiones auditadas.
5. Cierre: suites completas, checklist humano, convergencia, PR y CI.


## Trazabilidad de requisitos

- T001–T007: FR-001, FR-002, FR-003, FR-015, FR-016, FR-017.
- T008–T019: FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010.
- T020–T027: FR-011, FR-012, FR-013, FR-014.
- T028–T036: FR-018, FR-019, FR-020.
- T037–T050: verificación transversal de FR-001 a FR-020.

## Evidencia de cierre

- Backend: compilación completa; 435 unitarias aprobadas; integración con 1 aprobada y 1 omitida por condición declarada.
- Frontend: TypeScript y lint estricto aprobados; 180 unitarias; build de producción; 34 E2E aprobadas.
- Contenedores: `docker compose config --quiet`, imágenes backend/worker/beat/migrate/storage-init y Dockerfile frontend construidos.
- Inventario: 373 superficies vigentes, 10 decisiones auditadas y dos generaciones consecutivas determinísticas.
- Convergencia: cero brechas accionables; no se añadieron tareas.
- Revisión/CI: PR [#18](https://github.com/Andres-back/Calificator/pull/18), enlazado al issue #17; evidencia de checks en la pestaña del PR.
