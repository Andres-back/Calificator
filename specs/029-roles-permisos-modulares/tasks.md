# Tareas: Usuarios, roles y permisos modulares

## Fase 1: Preparación

- [x] T001 Inventariar rutas backend, acciones frontend y permisos históricos en specs/029-roles-permisos-modulares/permission-inventory.md
- [x] T002 [P] Definir fixtures de usuarios, roles y permisos sin datos reales en backend/tests/fixtures/authorization.py
- [x] T003 [P] Crear contratos unitarios para catálogo, precedencia, propiedad y protección principal en backend/tests/unit/test_modular_authorization.py
- [x] T004 [P] Crear contratos de API permitida y denegada para roles y usuarios en backend/tests/integration/test_admin_roles_api.py y backend/tests/integration/test_admin_users_rbac.py

## Fase 2: Fundamentos

- [x] T005 Implementar migración compatible de roles, permisos, asignaciones y Administrador principal en backend/alembic/versions/202608300001_modular_roles_permissions.py
- [x] T006 Crear modelos de autorización y relaciones de usuario en backend/app/modules/authorization/models.py y backend/app/modules/users/models.py
- [x] T007 Crear esquemas tipados de catálogo, rol, asignación, impacto y permiso efectivo en backend/app/modules/authorization/schemas.py y backend/app/modules/users/schemas.py
- [x] T008 Implementar catálogo controlado, matrices predeterminadas y niveles de riesgo en backend/app/modules/authorization/catalog.py
- [x] T009 Implementar resolución efectiva, invalidación por auth_version y dependencias por permiso en backend/app/core/permissions.py y backend/app/modules/authorization/service.py
- [x] T010 Registrar modelos y router de autorización en backend/app/db/base.py y backend/app/api.py

## Fase 3: Historia 1 - Crear roles por funciones

**Objetivo**: crear roles combinables, comprensibles y protegidos contra escalamiento.
**Prueba independiente**: crear Auxiliar académico con recursos y presentaciones, revisar su resumen y comprobar que no concede calificación.

- [x] T011 [P] [US1] Crear pruebas de catálogo agrupado, nombre normalizado, dependencias, duplicación y conflicto de versión, consolidadas en backend/tests/unit/test_modular_authorization.py
- [x] T012 [P] [US1] Crear pruebas de interacción del editor modular, resumen y estados responsive, consolidadas en frontend/src/modules/admin/AdminUsersPage.test.tsx
- [x] T013 [US1] Implementar creación, edición versionada, duplicación, archivo y reactivación de roles en backend/app/modules/authorization/service.py
- [x] T014 [US1] Implementar endpoints de catálogo y roles con alcance del actor en backend/app/modules/authorization/router.py
- [x] T015 [US1] Crear cliente tipado y claves de caché para autorización en frontend/src/modules/admin/authorizationApi.ts y frontend/src/config/queryKeys.ts
- [x] T016 [US1] Implementar matriz agrupada, selección por módulo, dependencias y vista previa en frontend/src/modules/admin/AdminRolesPage.tsx
- [x] T017 [US1] Integrar ruta y navegación administrativa de roles en frontend/src/router.tsx, frontend/src/config/routes.ts y frontend/src/config/nav.ts

## Fase 4: Historia 2 - Gestionar usuarios completamente

**Objetivo**: crear, editar, asignar, retirar o eliminar cuentas sin perder historial académico.
**Prueba independiente**: crear una cuenta, cambiar datos y rol, invalidar la sesión y aplicar eliminación física o retiro seguro según impacto.

- [x] T018 [P] [US2] Crear pruebas de impacto de eliminación, cuenta protegida y preservación de referencias, consolidadas en backend/tests/unit/test_modular_authorization.py
- [x] T019 [P] [US2] Crear pruebas de formulario de alta, edición, asignación, retiro y confirmación destructiva en frontend/src/modules/admin/AdminUsersPage.test.tsx
- [x] T020 [US2] Implementar análisis transaccional de impacto, retiro seguro y eliminación de cuentas vacías en backend/app/modules/users/service.py
- [x] T021 [US2] Ampliar CRUD administrativo, filtros y asignación versionada en backend/app/modules/users/router.py y backend/app/modules/users/schemas.py
- [x] T022 [US2] Ampliar contratos de usuarios, roles e impacto en frontend/src/types/api.ts y frontend/src/modules/admin/usersApi.ts
- [x] T023 [US2] Implementar creación y edición completa con rol personalizado e impacto visible en frontend/src/modules/admin/AdminUsersPage.tsx

## Fase 5: Historia 3 - Navegar y operar según permisos

**Objetivo**: aplicar la misma matriz en backend y navegación sin sustituir las reglas de propiedad.
**Prueba independiente**: un usuario mixto usa solo las capacidades concedidas y recibe 403 antes de acceder a datos de una capacidad ausente.

- [x] T024 [P] [US3] Crear matriz de regresión permitida y denegada para todos los permisos en backend/tests/integration/test_permission_matrix.py
- [x] T025 [P] [US3] Crear pruebas de guardas, menú, rutas y sesión desactualizada, consolidadas en RouteGuards.test.tsx, studentNavigation.test.ts y lib/api.test.ts
- [x] T026 [US3] Añadir permiso efectivo y versión de autorización a la sesión en backend/app/modules/users/router.py y backend/app/modules/users/schemas.py
- [x] T027 [US3] Adoptar dependencias por permiso en backend/app/modules/materias/router.py, backend/app/modules/dba/router.py, backend/app/modules/asistencia/router.py, backend/app/modules/evaluaciones/router.py, backend/app/modules/herramientas/router.py y backend/app/modules/presentaciones/router.py
- [x] T028 [US3] Adoptar dependencias por permiso y conservar propiedad contextual en backend/app/modules/entregas/router.py, backend/app/modules/calificaciones/router.py, backend/app/modules/reportes/router.py, backend/app/modules/xali/router.py, backend/app/modules/users/router.py, backend/app/modules/admin_ai_config/router.py y backend/app/core/permissions.py
- [x] T029 [US3] Guardar permisos efectivos y reaccionar a 401 o 403 por cambio de acceso en frontend/src/stores/auth.ts y frontend/src/lib/api.ts
- [x] T030 [US3] Implementar guarda por permiso y filtrado declarativo de navegación en frontend/src/components/auth/RequirePermission.tsx, frontend/src/router.tsx y frontend/src/config/nav.ts
- [x] T031 [US3] Aplicar capacidades a acciones en frontend/src/modules/admin/AdminUsersPage.tsx, frontend/src/modules/materias/MateriaLayout.tsx, frontend/src/modules/evaluaciones/EvaluacionesPage.tsx, frontend/src/modules/herramientas/ListPage.tsx, frontend/src/modules/presentaciones/PresentacionesPage.tsx, frontend/src/modules/calificaciones/CalificacionesPage.tsx, frontend/src/modules/reportes/ReportesPage.tsx y frontend/src/modules/xali/XaliPage.tsx

## Fase 6: Historia 4 - Comprender y auditar accesos

**Objetivo**: explicar el acceso efectivo, las asignaciones y los cambios sin revelar secretos.
**Prueba independiente**: el detalle de un rol muestra permisos, usuarios e historial y explica por qué un usuario tiene una capacidad.

- [x] T032 [P] [US4] Crear pruebas de auditoría sanitizada y explicación de acceso, consolidadas en backend/tests/unit/test_modular_authorization.py
- [x] T033 [P] [US4] Crear pruebas de detalle de rol, usuarios asignados e historial, consolidadas en frontend/src/modules/admin/AdminUsersPage.test.tsx
- [x] T034 [US4] Registrar eventos de rol, permiso, asignación, usuario y Administrador principal en backend/app/services/audit_service.py y backend/app/modules/authorization/service.py
- [x] T035 [US4] Exponer detalle de rol, asignados, auditoría y explicación de permiso en backend/app/modules/authorization/router.py
- [x] T036 [US4] Implementar detalle y explicación accesible del rol en frontend/src/modules/admin/AdminRolesPage.tsx y frontend/src/modules/admin/AdminUsersPage.tsx

## Fase final: Validación

- [x] T037 Ejecutar upgrade, downgrade y upgrade de Alembic con usuarios existentes y documentar evidencia en specs/029-roles-permisos-modulares/quickstart.md
- [x] T038 Ejecutar pytest unitario e integración para RBAC y regresiones académicas en backend/tests
- [x] T039 Ejecutar TypeScript, lint, Vitest y build de producción en frontend
- [x] T040 Ejecutar E2E de usuarios, roles, acceso denegado y viewports 360, 390, 768 y escritorio en frontend/e2e/admin-authorization.spec.ts
- [x] T041 Actualizar inventario de rutas y tablas responsables en specs/system-inventory/current.json y specs/README.md
- [x] T042 Ejecutar convergencia y cerrar tareas restantes en specs/029-roles-permisos-modulares/tasks.md
- [x] T043 Medir resolución de permisos menor a 50 ms p95 y listado paginado de 10.000 usuarios, consolidado en backend/tests/integration/test_permission_matrix.py

## Dependencias

- Fase 1 define cobertura antes de tocar autorización.
- Fase 2 bloquea todas las historias y debe preservar la matriz histórica sin asignaciones manuales.
- Historia 1 y Historia 2 pueden avanzar en paralelo después de Fase 2.
- Historia 3 depende de roles, asignaciones y CRUD de usuarios; su adopción por módulos debe ser progresiva.
- Historia 4 depende de los eventos producidos por Historias 1 y 2.
- La validación completa se ejecutará cuando el usuario autorice la fase de pruebas y publicación.

## Estrategia incremental

1. Migrar sin cambiar permisos efectivos de cuentas existentes.
2. Activar catálogo, roles y administración de usuarios solo para Administrador principal.
3. Adoptar permisos por módulo conservando los controles históricos como defensa adicional.
4. Habilitar administración delegada después de aprobar la matriz permitida y denegada.
5. Mantener rollback de la migración y recuperación del Administrador principal antes del despliegue.
