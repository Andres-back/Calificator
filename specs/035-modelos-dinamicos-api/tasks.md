# Tareas: Catálogo dinámico de modelos IA

## Fase 1: Fundamentos

- [x] T001 Registrar hotfix #72 y propiedad documental en `specs/035-modelos-dinamicos-api/` y `specs/README.md` (FR-008)
- [x] T002 [P] Escribir regresiones de descubrimiento y persistencia atómica en `backend/tests/unit/test_ai_model_discovery.py` (FR-001–FR-005)
- [x] T003 [P] Escribir regresiones de actualización visual en `frontend/src/modules/admin/AdminAIConfigPage.test.tsx` (FR-004, FR-006, FR-007)

## Fase 2: Historia 1 — Sincronizar cada proveedor

- [x] T004 [US1] Implementar descubrimiento normalizado en `backend/app/services/ai_model_discovery.py` (FR-001, FR-002, FR-003, FR-004, FR-005)
- [x] T005 [US1] Exponer actualización administrativa protegida en `backend/app/modules/admin_ai_config/router.py` (FR-001, FR-002, FR-005, FR-008)
- [x] T006 [US1] Implementar API y acción por proveedor en `frontend/src/modules/admin/api.ts`, `AdminAIConfigPage.tsx` y `ai/sections/ProvidersSection.tsx` (FR-004, FR-007)

## Fase 3: Historia 2 — Actualizar al cambiar credencial

- [x] T007 [US2] Sincronizar proveedores modificados desde `frontend/src/modules/admin/AICredentialsPanel.tsx` sin confundir guardado con descubrimiento y verificar respaldos en `frontend/src/modules/admin/ai/sections/FunctionsSection.tsx` (FR-006, FR-009)

## Fase final

- [x] T008 Ejecutar pruebas focales, tipos, lint e inventario; registrar evidencia en `specs/035-modelos-dinamicos-api/quickstart.md`
- [ ] T009 Abrir PR, obtener CI verde y verificar producción en lectura

## Dependencias

T001–T003 preceden la implementación. T004 precede T005 y T006. T007 reutiliza T005. T008–T009 cierran el hotfix.
