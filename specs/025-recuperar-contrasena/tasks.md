# Tareas: Recuperación segura de contraseña

## Fase 1: Preparación

- [X] T001 Registrar el nuevo módulo y las tablas en `backend/app/db/schema_ownership.py` y `specs/README.md`
- [X] T002 Crear migración compatible desde `202608260002` para `auth_version`, `password_reset_requests` y `mail_global_config` en `backend/alembic/versions/202608270001_password_recovery_mail.py`

## Fase 2: Fundamentos y pruebas previas

- [X] T003 [P] Crear pruebas de firma, vencimiento, consumo único y versión de sesión en `backend/tests/unit/test_password_recovery.py`
- [X] T004 [P] Crear pruebas de cifrado, lectura enmascarada y rotación SMTP en `backend/tests/unit/test_mail_configuration.py`
- [X] T005 [P] Crear pruebas de autorización y respuesta neutral de los contratos HTTP en `backend/tests/integration/test_password_recovery_api.py` y `backend/tests/integration/test_admin_mail_config.py`
- [X] T006 [P] Crear pruebas de formularios públicos y panel admin en `frontend/src/modules/auth/PasswordRecovery.test.tsx` y `frontend/src/modules/admin/AdminMailPage.test.tsx`

## Fase 3: Historia 1 — solicitar recuperación

- [X] T007 [US1] Añadir modelos de recuperación y configuración SMTP en `backend/app/modules/auth/models.py` y cargar metadata en `backend/app/db/base.py`
- [X] T008 [US1] Añadir esquemas públicos neutrales en `backend/app/modules/auth/schemas.py`
- [X] T009 [US1] Implementar creación idempotente, token HMAC reconstruible y límites por cuenta/origen en `backend/app/modules/auth/password_recovery_service.py`
- [X] T010 [US1] Implementar resolución cifrada de SMTP con respaldo de entorno en `backend/app/services/mail_service.py` y `backend/app/core/config.py`
- [X] T011 [US1] Implementar tarea de envío reintentable por ID en `backend/app/workers/tasks_password_recovery.py` y registrarla en `backend/app/workers/worker.py`
- [X] T012 [US1] Exponer solicitud neutral en `backend/app/modules/auth/router.py`
- [X] T013 [US1] Crear acceso “Olvidé mi contraseña” y formulario accesible en `frontend/src/modules/auth/LoginPage.tsx`, `frontend/src/modules/auth/RequestPasswordResetPage.tsx`, `frontend/src/modules/auth/api.ts` y `frontend/src/router.tsx`

## Fase 4: Historia 2 — restablecer contraseña

- [X] T014 [US2] Versionar access/refresh JWT de forma compatible en `backend/app/core/security.py`, `backend/app/core/permissions.py`, `backend/app/modules/auth/service.py` y `backend/app/modules/users/models.py`
- [X] T015 [US2] Implementar validación y consumo atómico con incremento de `auth_version` en `backend/app/modules/auth/password_recovery_service.py`
- [X] T016 [US2] Exponer validación y restablecimiento en `backend/app/modules/auth/router.py`
- [X] T017 [US2] Crear formulario de nueva contraseña con estados válido, vencido y consumido en `frontend/src/modules/auth/ResetPasswordPage.tsx`, `frontend/src/modules/auth/api.ts`, `frontend/src/config/routes.ts` y `frontend/src/router.tsx`

## Fase 5: Historia 3 — configuración administrativa

- [X] T018 [US3] Crear contratos seguros de lectura, actualización y prueba SMTP en `backend/app/modules/admin_mail/schemas.py`
- [X] T019 [US3] Implementar endpoints exclusivos de administrador y auditoría sin secretos en `backend/app/modules/admin_mail/router.py`, `backend/app/api.py` y `backend/app/services/mail_service.py`
- [X] T020 [US3] Crear cliente API y panel “Correo y recuperación” sin lectura del secreto en `frontend/src/modules/admin/mailApi.ts` y `frontend/src/modules/admin/AdminMailConfigPage.tsx`
- [X] T021 [US3] Registrar ruta y navegación exclusiva de administrador en `frontend/src/config/routes.ts`, `frontend/src/config/nav.ts` y `frontend/src/router.tsx`

## Fase 6: Integración y operación

- [X] T022 Añadir variables SMTP no secretas y documentación de secretos a `.env.example`, `backend/.env.example` y `DEPLOYMENT.md`
- [X] T023 Integrar limpieza de solicitudes vencidas y señales de entrega en `backend/app/workers/tasks_password_recovery.py` y `backend/app/workers/worker.py`
- [X] T024 Actualizar contratos e inventario vivo en `specs/003-usuarios-materias-matriculas/inventory.md`, `specs/012-ia-jobs-produccion/inventory.md` y `specs/system-inventory/current.json`

## Fase final: Validación

- [X] T025 Ejecutar pruebas backend dirigidas, frontend typecheck/lint/pruebas dirigidas y builds aplicables según `specs/025-recuperar-contrasena/quickstart.md`
- [X] T026 Ejecutar `$speckit-converge`, completar brechas y dejar todas las tareas marcadas
- [X] T027 Abrir PR enlazado al issue #37 y dejar documentado que producción se configura solo después del merge aprobado

## Dependencias

- T002 bloquea persistencia y T007–T021.
- T003–T006 se escriben antes de su implementación correspondiente.
- La Historia 1 depende de T007–T012; Historia 2 reutiliza el token de Historia 1; Historia 3 puede desarrollarse tras T007/T010.
- T022–T024 dependen de los contratos implementados.
- T025–T027 requieren todas las historias completas.

## Estrategia de implementación

El MVP completo exige las historias 1 y 2. La historia 3 forma parte de esta entrega porque permite instalar y rotar la credencial autorizada sin acceso al servidor.
## Phase 7: Convergence

- [X] T028 Bloquear la cuenta al emitir una recuperación y añadir el índice compuesto para garantizar un solo enlace vigente bajo concurrencia per FR-012, SC-007 y plan: concurrencia e índices (partial)
- [X] T029 Incrementar auth_version e invalidar recuperaciones pendientes cuando una contraseña cambie por administración per FR-010 y caso límite administrativo (partial)
- [X] T030 Registrar eventos operativos no sensibles de limitación y consumo per FR-013 (partial)
- [X] T031 Completar pruebas de acceso permitido para admin y denegado para profesor/estudiante en la configuración SMTP per Constitución I y VII (partial)
- [X] T032 Añadir verificación dirigida del flujo público a 360 px en claro y oscuro per FR-015 y SC-006 (partial)

## Trazabilidad de requisitos

- T005 y T012 cubren FR-001, FR-002, FR-003 y FR-004.
- T003, T009 y T015 cubren FR-005, FR-006, FR-008, FR-009, FR-010, FR-011 y FR-012.
- T010, T011, T023 y T030 cubren FR-007, FR-013 y FR-016.
- T013, T017, T025 y T032 cubren FR-014 y FR-015.
- T018, T019, T020, T021 y T031 cubren FR-017, FR-018, FR-019, FR-020 y FR-021.
