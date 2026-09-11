# Tareas: Administración efectiva de herramientas e IA

## Fase 1: Preparación

- [x] T001 Registrar aprobación de plan y estado de 034 en `specs/034-administracion-herramientas-ia/{spec,plan}.md` e issue #70
- [x] T002 Auditar identificadores, consumidores y aliases actuales de IA/herramientas en `backend/app/services/`, `backend/app/modules/` y `frontend/src/modules/herramientas/meta.ts`
- [x] T003 Verificar ignores de Git, Docker, Python y frontend sin añadir exclusiones que oculten código o migraciones en `.gitignore`, `backend/.dockerignore` y `frontend/.dockerignore`

## Fase 2: Fundamentos

- [x] T004 [P] Escribir pruebas del registro canónico de capacidades y cobertura de consumidores en `backend/tests/unit/test_ai_capability_registry.py`
- [x] T005 [P] Escribir pruebas del catálogo canónico, alias y pausa de herramientas en `backend/tests/unit/test_tool_control.py`
- [x] T006 [P] Escribir contratos frontend del centro y catálogo en `frontend/src/modules/admin/api.test.ts` y `frontend/src/modules/herramientas/api.test.ts`
- [x] T007 Crear registro de funciones/etapas/consumidores en `backend/app/services/ai_capability_registry.py` (FR-003, FR-004, FR-013)
- [x] T008 Crear registro canónico de herramientas y alias en `backend/app/modules/herramientas/tool_registry.py`
- [x] T009 Crear migración segura de `ai_tool_settings`, semillas y rutas de etapa en `backend/alembic/versions/*_admin_tool_ai_control.py` (FR-015)
- [x] T010 Ampliar esquemas sanitizados y borrador versionado en `backend/app/modules/admin_ai_config/schemas.py`

## Fase 3: Historia 1 — Entender qué IA utiliza cada función

- [x] T011 [P] [US1] Escribir pruebas de configurado/efectivo/observado y etapas deterministas en `backend/tests/integration/test_admin_ai_control_center.py` (FR-002)
- [x] T012 [US1] Implementar proyección del centro con registro y ledger en `backend/app/modules/admin_ai_config/control_center_service.py` y `backend/app/modules/admin_ai_config/usage_service.py` (FR-002, FR-004)
- [x] T013 [US1] Exponer lectura administrativa protegida en `backend/app/modules/admin_ai_config/router.py`
- [x] T014 [P] [US1] Escribir pruebas de navegación y estados de funciones en `frontend/src/modules/admin/AdminAIConfigPage.test.tsx`
- [x] T015 [US1] Reorganizar el panel por funciones y etapas en `frontend/src/modules/admin/AdminAIConfigPage.tsx` y `frontend/src/modules/admin/ai/sections/FunctionsSection.tsx` (FR-001, FR-002, FR-013)

## Fase 4: Historia 2 — Cambiar modelos con seguridad

- [x] T016 [P] [US2] Escribir pruebas de validación sin consumo, publicación atómica, conflicto y restauración en `backend/tests/integration/test_admin_ai_routing.py` (FR-005, FR-006)
- [x] T017 [US2] Extender resolución y aliases por etapa sin cambiar rutas efectivas en `backend/app/services/ai_config_service.py` y `backend/app/services/ai_configuration_resolver.py` (FR-003)
- [x] T018 [US2] Implementar validación/diff/publicación atómica y adaptación de `teacher_override_allowed` en `backend/app/modules/admin_ai_config/control_center_service.py` y `backend/app/modules/admin_ai_config/router.py` (FR-005, FR-006)
- [x] T019 [US2] Fijar snapshots por etapa al admitir y reutilizarlos en reintentos en `backend/app/modules/jobs/service.py`, `backend/app/modules/calificaciones/orchestrator.py`, `backend/app/modules/evaluaciones/digitalize_service.py` y `backend/app/modules/presentaciones/service.py` (FR-003, FR-007)
- [x] T020 [P] [US2] Escribir pruebas de borrador, diff, 409 y restauración en `frontend/src/modules/admin/ai/hooks/useAISettingsDraft.test.ts` y `frontend/src/modules/admin/AdminAIConfigPage.test.tsx`
- [x] T021 [US2] Implementar editor por etapa, impacto y confirmación en `frontend/src/modules/admin/ai/sections/FunctionsSection.tsx` y `frontend/src/modules/admin/ai/hooks/useAIMutations.ts` (FR-006)

## Fase 5: Historia 3 — Administrar herramientas existentes

- [x] T022 [P] [US3] Escribir pruebas de API directa pausada, conservación de materiales y alias histórico en `backend/tests/integration/test_resource_assignment_access.py` y `backend/tests/unit/test_tool_control.py` (FR-009, FR-010)
- [x] T023 [US3] Implementar servicio de disponibilidad y guardia central de generación en `backend/app/modules/herramientas/tool_control_service.py`, `backend/app/modules/herramientas/router.py` y `backend/app/modules/herramientas/service.py` (FR-009, FR-010)
- [x] T024 [US3] Incluir herramientas y excepciones de ruta en publicación/versionado/auditoría en `backend/app/modules/admin_ai_config/control_center_service.py` y `backend/app/services/ai_config_service.py`
- [x] T025 [P] [US3] Escribir pruebas UI de pausa, herencia y catálogo sin duplicados en `frontend/src/modules/admin/AdminAIConfigPage.test.tsx` y `frontend/e2e/resources-creation.spec.ts`
- [x] T026 [US3] Implementar administración de herramientas en `frontend/src/modules/admin/ai/sections/ToolsSection.tsx` y contratos en `frontend/src/modules/admin/api.ts` (FR-009, FR-010)
- [x] T027 [US3] Consumir catálogo/estado en generación docente y ocultar alias duplicado en `frontend/src/modules/herramientas/GeneratePage.tsx`, `frontend/src/modules/herramientas/api.ts` y `frontend/src/modules/herramientas/meta.ts`

## Fase 6: Historia 4 — Distinguir configuración institucional y docente

- [x] T028 [P] [US4] Escribir pruebas de resolución docente sanitizada y permisos en `backend/tests/integration/test_ai_configuration_api.py` y `backend/tests/integration/test_ai_configuration_secret_safety.py` (FR-008)
- [x] T029 [US4] Exponer vista efectiva opcional por docente sin secretos en `backend/app/modules/admin_ai_config/control_center_service.py` y `backend/app/modules/admin_ai_config/router.py`
- [x] T030 [US4] Renombrar semántica visual de preferencias personales y mostrar procedencia en `frontend/src/modules/admin/ai/sections/FunctionsSection.tsx` y `frontend/src/modules/admin/ai/sections/ProvidersSection.tsx` (FR-008, FR-012)

## Fase 7: Historia 5 — Consultar uso y tiempos entendibles

- [x] T031 [P] [US5] Escribir pruebas de filtros, nulos, muestras, solapamiento y divergencias en `backend/tests/unit/test_admin_ai_usage_service.py` y `backend/tests/unit/test_admin_ai_model_performance.py` (FR-011)
- [x] T032 [US5] Implementar agregados 7/30/90 días por función/etapa/modelo en `backend/app/modules/admin_ai_config/usage_service.py` y `backend/app/modules/admin_ai_config/router.py`
- [x] T033 [P] [US5] Escribir pruebas de filtros y estados sin datos en `frontend/src/modules/admin/AdminAIConfigPage.test.tsx`
- [x] T034 [US5] Implementar explorador de uso y auditoría filtrable en `frontend/src/modules/admin/ai/sections/AuditSection.tsx` (FR-011)

## Fase final: Validación y promoción

- [x] T035 Ejecutar migración upgrade/downgrade/upgrade, suites focalizadas y suites completas, incluida medición p95 menor a 2 segundos con el volumen acordado, descritas en `specs/034-administracion-herramientas-ia/quickstart.md` (FR-015)
- [x] T036 Validar accesibilidad, scroll y responsive en cinco resoluciones y ambos temas mediante `frontend/e2e/admin-ai-control-center.spec.ts` (FR-014)
- [x] T037 Actualizar propiedad documental e inventario en `specs/README.md`, `specs/system-inventory/` y `specs/034-administracion-herramientas-ia/quickstart.md`
- [x] T038 Ejecutar `$speckit-converge`, completar brechas y dejar evidencia final en `specs/034-administracion-herramientas-ia/tasks.md` y `quickstart.md`
- [x] T039 Preparar la promoción mediante PR enlazado a #70; el CI y la verificación de despliegue se registran en el PR sin cambiar configuración ni datos en producción

## Dependencias

- T001–T003 preparan la rama. T004–T010 son fundamentos y bloquean todas las historias.
- US1 establece la proyección; US2 depende de US1 para editarla.
- US3 depende de publicación atómica de US2, pero sus pruebas de catálogo pueden avanzar tras fundamentos.
- US4 depende del resolver por etapas de US2.
- US5 depende del registro de US1, pero no de la edición de US2/US3.
- La validación final depende de todas las historias; Converge se ejecuta después del primer pase de implementación.

## Paralelización segura

- T004, T005 y T006 pueden escribirse en paralelo por afectar suites distintas.
- T011/T014, T016/T020, T022/T025, T028 y T031/T033 separan backend/frontend.
- No paralelizar cambios concurrentes a `control_center_service.py`, `router.py` o `AdminAIConfigPage.test.tsx`.

## Estrategia incremental

MVP: fundamentos + US1 ofrecen visibilidad real sin mutación. US2 habilita cambios seguros. US3 agrega control de herramientas. US4 explica preferencias docentes y US5 agrega decisión basada en observación. Cada etapa conserva compatibilidad hasta que su regresión esté verde.
