# Tareas: Asistencia con guardado automático

**Issue**: #176 | **Rama**: `codex/085-asistencia-autoguardado` | **Fecha**: 2026-10-06

Alcance y plan aprobados; checklist final revisado 8/8 con autorización humana. Implementación y regresiones locales completadas. Cierre de inventario/CI en curso; no fusionar ni desplegar sin autorización separada.

## Fase 1: Preparación

- [x] T001 Resolver gate de revisión previa en `specs/085-asistencia-autoguardado/checklists/autoguardado.md`, registrar análisis y aprobaciones en `spec.md`/`plan.md`.
- [x] T002 Verificar exclusiones existentes en `.gitignore`, `.dockerignore`, `backend/.dockerignore`, `frontend/eslint.config.js` y dependencias sin alterar archivos ajenos; confirmar esquema único en base aislada para `backend/tests/integration/test_attendance_autosave.py`.

## Fase 2: Fundamentos

- [x] T003 [P] Añadir regresiones PATCH permitido/denegado, schema parcial y PUT histórico en `backend/tests/unit/test_asistencia_service.py` y `backend/tests/unit/test_authorization_contracts.py`.
- [x] T004 [P] Añadir regresiones de cambios parciales e instantáneas conservando el builder completo en `frontend/src/modules/materias/attendanceModel.test.ts`.

## Fase 3: Historia 1 — marcar y guardar

**Prueba independiente**: un alumno guardado con otros pendientes, recarga/reporte fieles y búsqueda sin alterar alumnos ocultos.

- [x] T005 [US1] Añadir esquema PATCH no vacío sin duplicados y ruta protegida en `backend/app/modules/asistencia/schemas.py` y `router.py` (FR-001, FR-002, FR-010).
- [x] T006 [US1] Implementar validación de subconjunto y upsert atómico reutilizado por PUT, conservando validación de roster completo, ID/creación/omitidos en `backend/app/modules/asistencia/service.py` (FR-002, FR-011).
- [x] T007 [US1] Implementar cliente PATCH y diferencias parciales sin eliminar contrato completo en `frontend/src/modules/materias/asistenciaApi.ts` y `attendanceModel.ts` (FR-001, FR-002).
- [x] T008 [US1] Añadir pruebas diferidas de primer guardado y marcado masivo en `frontend/src/modules/materias/useAttendanceAutosave.test.tsx` antes del hook (FR-001, FR-003, FR-006).
- [x] T009 [US1] Implementar cola básica y estados de guardado por alumno en `frontend/src/modules/materias/useAttendanceAutosave.ts` (FR-001, FR-003, FR-006).
- [x] T010 [US1] Conectar selección/marcado masivo y retirar guardado manual/textos contradictorios en `frontend/src/modules/materias/MateriaAsistencia.tsx` (FR-001, FR-003, FR-006, FR-012).
- [x] T011 [US1] Añadir integración real de guardado parcial, omitidos, autorización, validación atómica y PUT completo/incompleto en `backend/tests/integration/test_attendance_autosave.py` (FR-002, FR-010, FR-011, SC-001, SC-004, SC-006).

## Fase 4: Historia 2 — correcciones y recuperación

**Prueba independiente**: última selección de 30 cambios queda persistida, errores se recuperan sin duplicados y ninguna respuesta afecta otro día.

- [x] T012 [US2] Añadir tests diferidos de corrección/retorno al estado previo, 30 cambios, refetch, error/reintento y cambio de contexto en `frontend/src/modules/materias/useAttendanceAutosave.test.tsx` (FR-004, FR-005, FR-008, SC-002, SC-003).
- [x] T013 [US2] Implementar revisiones/instantáneas, conciliación de refetch, errores no bloqueantes y reintento de últimas versiones en `frontend/src/modules/materias/useAttendanceAutosave.ts` (FR-004, FR-005).
- [x] T014 [US2] Conservar blocker/beforeunload, advertencia de fecha, aislamiento de caché y actualización de reportes en `frontend/src/modules/materias/MateriaAsistencia.tsx` y `useAttendanceAutosave.ts` (FR-008, FR-009).
- [x] T015 [US2] Probar concurrencia primera inserción y PATCH/PUT, IDs/actor/timestamps preservados y omitidos intactos en `backend/tests/integration/test_attendance_autosave.py`; habilitar `SPEC085_TEST_DATABASE_URL` en `.github/workflows/ci.yml` sin fallback a producción (FR-005, FR-011, SC-003).

## Fase 5: Historia 3 — observaciones y móvil

**Prueba independiente**: observación se guarda al terminar de escribir; sin estado espera selección; vista compacta accesible sin panel fijo.

- [x] T016 [US3] Añadir tests de observación sin estado, debounce/blur, foco y pendiente de salida en `frontend/src/modules/materias/useAttendanceAutosave.test.tsx` (FR-007, FR-008).
- [x] T017 [US3] Implementar debounce/blur de 500 ms y aviso sin estado en `frontend/src/modules/materias/useAttendanceAutosave.ts` y `MateriaAsistencia.tsx` (FR-007, FR-012).
- [x] T018 [US3] Actualizar únicamente bloques de asistencia a PATCH con mocks persistentes/reporte en `frontend/e2e/mock/grading-review.mock.spec.ts`, manteniendo intactas regresiones de calificaciones/libro de notas (FR-009, FR-011).
- [x] T019 [US3] Ampliar móvil claro/oscuro, teclado, scroll, reflujo 200 % y estados con errores en `frontend/e2e/p2-responsive.spec.ts` y `mock/grading-review.mock.spec.ts` (FR-012, SC-005).

## Fase final: Validación y trazabilidad

- [x] T020 Ejecutar pruebas enfocadas, tipos/lint y builds aplicables; registrar comandos, resultados y limitaciones en `specs/085-asistencia-autoguardado/quickstart.md`.
- [x] T021 Actualizar dominio canónico `specs/004-dba-asistencia-curriculo/spec.md`, `contracts/interfaces.md`, índice `specs/README.md` e inventario generado `specs/system-inventory/current.json` con PATCH y comportamiento vigente sin duplicar responsabilidad.
- [x] T022 Ejecutar Converge, completar evidencia/tareas y abrir PR enlazado a #176 con `specs/085-asistencia-autoguardado/{spec,plan,tasks}.md`; verificar CI completo sin fusionar ni desplegar sin autorización.

## Dependencias

T001–T002 bloquean implementación. T003–T004 son pruebas independientes antes de sus cambios. Backend T005–T006 precede integración T011; cliente T007 y tests T008 preceden hook T009 y vista T010. US2 amplía el hook sobre US1; US3 agrega observaciones/matriz sobre ambas. T020–T022 solo después de las tres historias. MVP: US1, pero no entregar sin protección US2/US3.

## Oportunidades paralelas

- US1: pruebas backend T003 y frontend T004 no comparten archivos.
- US2: integración PostgreSQL T015 y tests frontend T012 no comparten archivos.
- US3: pruebas backend ya estabilizadas pueden ejecutarse mientras se validan matrices T019; no editar hook/vista por dos vías simultáneas.

No implica autorización para subagentes nuevos. Las fases se ejecutan progresivamente y las tareas se marcan solo con evidencia.

## Trazabilidad

FR-001: T005,T007–T010; FR-002: T005–T007,T011; FR-003: T008–T010; FR-004: T012–T013; FR-005: T012–T013,T015; FR-006: T008–T010; FR-007: T016–T017; FR-008: T012,T014,T016; FR-009: T014,T018; FR-010: T003,T005,T011; FR-011: T006,T011,T015,T018; FR-012: T010,T017,T019.

SC-001/SC-004/SC-006: T011; SC-002: T012; SC-003: T012,T015; SC-005: T019. T001,T002,T020–T022 corresponden a gates y controles transversales de constitución.

## Fase 7: Convergencia

- [x] T023 Registrar `085-asistencia-autoguardado` en el listado activo de `tests/spec_governance/test_spec_baseline.py` y comprobar pruebas de gobernanza e inventario según Constitución VII y plan: trazabilidad (partial, HIGH).

## Cierre de repositorio y gate externo

Implementación/tareas documentales completadas; PR #177 creado y controles completos lanzados. Los marcadores no certifican el resultado remoto ni autorizan fusión. El gate de CI permanece abierto hasta todos los checks verdes del HEAD final; autorización humana recibida exclusivamente bajo esa condición. El resultado remoto y commit desplegado se registrarán en el PR/issue para no disparar otra ejecución con cada actualización de estado.
