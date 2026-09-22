# Tareas: Importar estudiantes desde una lista fotografiada

## Fase 1: Preparación

- [X] T001 Actualizar el estado aprobado y la trazabilidad de la función en `specs/061-importar-estudiantes-lista/spec.md` y `specs/README.md`
- [X] T002 [P] Actualizar la especificación viva de usuarios y matrículas en `specs/003-usuarios-materias-matriculas/spec.md` y `specs/003-usuarios-materias-matriculas/contracts/interfaces.md`
- [X] T003 Verificar exclusiones de Git, Docker y ESLint para archivos temporales y secretos en `.gitignore`, `.dockerignore` y `frontend/eslint.config.js`

## Fase 2: Fundamentos

- [X] T004 [P] Validar la migración completa y los modelos de lote, filas y acceso inicial en PostgreSQL temporal, documentando el resultado en `quickstart.md`
- [X] T005 [P] Probar autorización, aislamiento entre docentes y restablecimiento de acceso en `backend/tests/integration/test_roster_import_flow.py`
- [X] T006 Crear migración aditiva de lotes/filas y banderas de usuario en `backend/alembic/versions/202609220001_roster_imports.py`
- [X] T007 Crear modelos y estados del dominio en `backend/app/modules/importacion_estudiantes/models.py`, `backend/app/modules/importacion_estudiantes/schemas.py` y `backend/app/db/base.py`
- [X] T008 Añadir correos internos y cambio obligatorio de contraseña al contrato de usuario en `backend/app/modules/users/models.py`, `backend/app/modules/users/schemas.py` y `frontend/src/types/api.ts`
- [X] T009 Registrar el router y la capacidad visual de importación en `backend/app/api.py`, `backend/app/services/ai_configuration_resolver.py` y `backend/app/modules/jobs/service.py`

## Fase 3: Historia 1 - Revisar lista antes de matricular

**Meta**: la foto produce un borrador editable y ninguna cuenta.

**Prueba independiente**: crear un lote, simular extracción y comprobar filas, advertencias, autorización y cero usuarios creados.

- [X] T010 [P] [US1] Escribir pruebas del extractor de nombres, exclusión de encabezados y resultado incierto en `backend/tests/unit/test_roster_vision_extractor.py`
- [X] T011 [P] [US1] Probar revisión, orden, eliminación y altas únicamente tras confirmación en `backend/tests/integration/test_roster_import_flow.py`
- [X] T012 [US1] Implementar extractor OpenCode con esquema exclusivo de nombres en `backend/app/modules/importacion_estudiantes/vision_service.py`
- [X] T013 [US1] Implementar almacenamiento privado, huella, borrador y limpieza en `backend/app/modules/importacion_estudiantes/service.py`
- [X] T014 [US1] Implementar trabajo persistente, reintento y recuperación en `backend/app/workers/tasks_roster_import.py`, `backend/app/workers/worker.py` y `backend/app/modules/jobs/service.py`
- [X] T015 [US1] Exponer crear, consultar, editar y cancelar importación en `backend/app/modules/importacion_estudiantes/router.py`
- [X] T016 [P] [US1] Crear cliente y tipos frontend de importación en `frontend/src/modules/materias/rosterImportApi.ts` y `frontend/src/types/api.ts`
- [X] T017 [US1] Crear selector de foto y monitor de procesamiento reutilizable en `frontend/src/modules/materias/RosterImportDialog.tsx`
- [X] T018 [US1] Crear editor responsive de filas y resolución de advertencias en `frontend/src/modules/materias/RosterReview.tsx`
- [X] T019 [US1] Integrar el mismo diálogo desde estudiantes y asistencia en `frontend/src/modules/materias/MateriaDetailPage.tsx` y `frontend/src/modules/materias/MateriaAsistencia.tsx`

## Fase 4: Historia 2 - Crear accesos y matrículas

**Meta**: confirmar crea cuentas y matrículas atómicas con claves de una sola visualización.

**Prueba independiente**: confirmar tres filas y comprobar tres usuarios, tres matrículas, claves no persistidas y reintento idempotente.

- [X] T020 [P] [US2] Probar correo único, clave temporal, idempotencia, concurrencia y restablecimiento en `backend/tests/integration/test_roster_import_flow.py`
- [X] T021 [P] [US2] Probar pantalla de cambio obligatorio de contraseña inicial en `frontend/src/modules/auth/InitialPasswordPage.test.tsx` y guard de rutas con regresión de frontend
- [X] T022 [US2] Implementar generación segura de correo/clave y confirmación transaccional en `backend/app/modules/importacion_estudiantes/service.py`
- [X] T023 [US2] Implementar emisión de nueva clave temporal limitada al titular en `backend/app/modules/importacion_estudiantes/router.py` y `backend/app/modules/importacion_estudiantes/service.py`
- [X] T024 [US2] Implementar cambio de clave inicial e invalidación de sesiones en `backend/app/modules/auth/router.py`, `backend/app/modules/auth/service.py` y `backend/app/core/permissions.py`
- [X] T025 [US2] Crear vista de credenciales de una sola sesión y acciones de copia/impresión en `frontend/src/modules/materias/RosterCredentials.tsx`
- [X] T026 [US2] Crear pantalla y guard de cambio inicial en `frontend/src/modules/auth/InitialPasswordPage.tsx`, `frontend/src/config/routes.ts` y `frontend/src/router.tsx`

## Fase 5: Historia 3 - Resolver duplicados

**Meta**: nunca fusionar homónimos automáticamente ni duplicar una matrícula.

**Prueba independiente**: dos nombres iguales y una matrícula previa exigen decisiones distintas y el reintento conserva conteos.

- [X] T027 [P] [US3] Probar homónimos, matrícula única y confirmación concurrente en `backend/tests/integration/test_roster_import_flow.py`
- [X] T028 [US3] Implementar advertencias por coincidencia dentro del ámbito y bloqueo de filas ambiguas en `backend/app/modules/importacion_estudiantes/service.py`
- [X] T029 [US3] Mostrar conflictos y decisiones explícitas sin selección automática en `frontend/src/modules/materias/RosterReview.tsx`

## Fase 6: Historia 4 - Reutilizar alumnos en otras materias

**Meta**: matricular cuentas existentes conservando identidad y credenciales.

**Prueba independiente**: seleccionar un alumno de otra materia propia y comprobar una nueva matrícula sin crear usuario.

- [X] T030 [P] [US4] Probar búsqueda limitada al docente y matrícula de cuenta existente en `backend/tests/integration/test_roster_import_flow.py`
- [X] T031 [US4] Implementar búsqueda segura y matrícula masiva de cuentas seleccionadas en `backend/app/modules/importacion_estudiantes/service.py` y `backend/app/modules/importacion_estudiantes/router.py`
- [X] T032 [US4] Crear selector responsive de estudiantes existentes en `frontend/src/modules/materias/ExistingStudentsDialog.tsx` y `frontend/src/modules/materias/rosterImportApi.ts`
- [X] T033 [US4] Integrar el selector junto a importar lista en `frontend/src/modules/materias/MateriaDetailPage.tsx` y `frontend/src/modules/materias/MateriaAsistencia.tsx`

## Fase final: validación

- [X] T034 [P] Añadir pruebas frontend de revisión, confirmación y cambio inicial en `frontend/src/modules/materias/RosterReview.test.tsx`, `frontend/src/modules/auth/InitialPasswordPage.test.tsx` y `frontend/e2e/roster-import.spec.ts`
- [X] T035 Añadir E2E móvil/escritorio del recorrido principal y reutilización en `frontend/e2e/roster-import.spec.ts`
- [X] T036 Ejecutar migraciones PostgreSQL, pruebas focales backend/frontend, tipos, lint y build; registrar resultados en `specs/061-importar-estudiantes-lista/quickstart.md`
- [X] T037 Regenerar inventario y gobernanza en `specs/system-inventory/current.json`, `specs/system-inventory/ownership.json` y `tests/spec_governance/test_spec_baseline.py`
- [X] T038 Ejecutar convergencia, cerrar tareas y abrir PR #122 vinculado a #121 para validación en CI

## Dependencias

### Trazabilidad de requisitos

- FR-001, FR-003, FR-004, FR-005, FR-016, FR-018 → T012–T019 y T034–T035.
- FR-002, FR-014, FR-017 → T005, T011, T013–T015 y T036.
- FR-006, FR-007, FR-008, FR-009, FR-010, FR-013, FR-015 → T020–T026 y T036.
- FR-011, FR-012 → T027–T029 y T035.
- FR-019, FR-020 → T030–T033 y T035.

- Fase 2 bloquea todas las historias.
- US1 bloquea US2 porque la confirmación parte del borrador revisado.
- US2 y US3 comparten la transacción de confirmación y se ejecutan en ese orden.
- US4 reutiliza Usuario/Matrícula, pero puede validarse independientemente tras Fase 2.
- La fase final requiere US1–US4 completas.

## Estrategia

1. Entregar primero US1 sin mutaciones para validar calidad de extracción.
2. Añadir US2 con transacción y credenciales efímeras.
3. Endurecer duplicados con US3.
4. Habilitar reutilización entre materias con US4.
5. Ejecutar pruebas de regresión completas y publicar solo mediante PR.

## Phase 7: Convergence

- [X] T039 Expirar borradores de listas abandonados, cancelar sus trabajos y borrar la fotografía privada mediante una tarea periódica, con prueba de regresión, per FR-017 y Constitución VI (partial)
