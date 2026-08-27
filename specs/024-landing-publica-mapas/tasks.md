# Tareas: landing pública, solicitudes docentes y mapas conceptuales

## Fase 1: Preparación

- [x] T001 Confirmar aprobaciones, contratos y trazabilidad del issue #35 en `specs/024-landing-publica-mapas/`

## Fase 2: Fundamentos

- [x] T002 [FR-005, FR-008, FR-009] Añadir migración y modelo de estados para solicitudes docentes en `backend/alembic/versions/`, `backend/app/shared/enums.py` y `backend/app/modules/users/models.py`
- [x] T003 [FR-005, FR-006] Extender contratos y servicios de autenticación/usuarios con registro siempre estudiantil, solicitud docente auditable y bloqueo de cuentas inactivas en `backend/app/modules/auth/` y `backend/app/modules/users/`

## Fase 3: Historia 1 — Landing y registro público

- [x] T004 [US1] [FR-001, FR-002, FR-003, FR-015] Crear landing pública responsive y rutas públicas explícitas en `frontend/src/modules/auth/LandingPage.tsx`, `frontend/src/router.tsx` y `frontend/src/config/routes.ts`
- [x] T005 [US1] [FR-004, FR-005, FR-006, FR-015] Crear registro con selección estudiante/solicitud docente y enlaces coherentes desde login en `frontend/src/modules/auth/RegisterPage.tsx`, `frontend/src/modules/auth/LoginPage.tsx` y `frontend/src/stores/auth.ts`
- [x] T006 [US1] [FR-016] Añadir pruebas focalizadas de landing y registro en `frontend/src/modules/auth/*.test.tsx`

## Fase 4: Historia 2 — Administración de solicitudes docentes

- [x] T007 [US2] [FR-007, FR-008, FR-009] Implementar listado filtrable y decisión aprobar/rechazar con auditoría, idempotencia y protección del administrador en `backend/app/modules/users/service.py`, `schemas.py` y `router.py`
- [x] T008 [US2] [FR-007, FR-015] Crear gestión administrativa de usuarios/roles y solicitudes en `frontend/src/modules/admin/AdminUsersPage.tsx`, `frontend/src/modules/admin/usersApi.ts`, `frontend/src/types/api.ts`, `frontend/src/config/nav.ts` y `frontend/src/router.tsx`
- [x] T009 [US2] [FR-010] Mostrar al estudiante el estado de su solicitud docente sin conceder permisos anticipados en `frontend/src/modules/dashboard/DashboardEstudiante.tsx`
- [x] T010 [US2] [FR-006, FR-008, FR-009, FR-016] Añadir pruebas backend focalizadas de registro, decisiones y controles de rol en `backend/tests/unit/test_user_teacher_requests.py`
- [x] T011 [US2] [FR-007, FR-015, FR-016] Añadir pruebas frontend focalizadas del panel administrativo en `frontend/src/modules/admin/AdminUsersPage.test.tsx`

## Fase 5: Historia 3 — Mapas conceptuales útiles

- [x] T012 [US3] [FR-011, FR-012] Fortalecer prompt y normalizar nodos, niveles y relaciones en `backend/app/modules/herramientas/generators/mapa_conceptual.py`
- [x] T013 [US3] [FR-013, FR-015] Renderizar un diagrama jerárquico conectado, responsive y accesible en `frontend/src/modules/herramientas/views/ContenidoView.tsx`
- [x] T014 [US3] [FR-014, FR-015] Mejorar el mapa exportado a PDF y la orientación del formulario en `backend/app/modules/herramientas/pdf_render.py` y `frontend/src/modules/herramientas/forms/tools.tsx`
- [x] T015 [US3] [FR-012, FR-013, FR-014, FR-016] Añadir pruebas focalizadas de normalización y renderización en `backend/tests/unit/test_concept_map_normalization.py` y `frontend/src/modules/herramientas/views/ContenidoView.test.tsx`

## Fase final: Validación y trazabilidad

- [x] T016 Actualizar inventario y responsabilidad del módulo en `specs/README.md` y artefactos de Spec Kit
- [x] T017 [FR-016] Ejecutar solo pruebas focalizadas durante el desarrollo y una pasada final de tipos, lint y build; dejar la suite completa a CI
- [x] T018 Ejecutar `$speckit-converge`, cerrar tareas restantes y preparar commit/PR sin push directo a `main`

## Convergencia

La revisión final no encontró brechas funcionales pendientes entre `spec.md`, `plan.md`, `tasks.md` y la implementación.

## Dependencias

- T002 y T003 bloquean T007–T011.
- T004 y T005 deben completarse juntas para que el recorrido público sea navegable.
- T012 define el contrato que consumen T013–T015.
- T017 depende de todas las historias; T018 depende de T017.