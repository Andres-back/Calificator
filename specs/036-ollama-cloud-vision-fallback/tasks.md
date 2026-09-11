# Tareas: Respaldo visual con Ollama Cloud

## Fase 1: Fundamentos

- [x] T001 Registrar issue, especificación, plan, checklist e índice en `specs/036-ollama-cloud-vision-fallback/` y `specs/README.md` (FR-001–FR-008)
- [x] T002 [P] [US1] Añadir regresión del selector Ollama visual en `frontend/src/modules/admin/AdminAIConfigPage.test.tsx` (FR-001, FR-002)
- [x] T003 [P] [US2] Añadir regresiones de transporte y extracción Ollama en `backend/tests/unit/test_ollama_cloud_provider.py` y `backend/tests/unit/test_vision_extractor.py` (FR-003–FR-006, FR-008)

## Fase 2: Historia 1 — Configuración real

- [x] T004 [US1] Admitir Ollama Cloud en la etapa visual en `backend/app/services/ai_capability_registry.py` (FR-001)
- [x] T005 [US1] Verificar selección y validación por capacidad en `backend/app/modules/admin_ai_config/control_center_service.py` y `frontend/src/modules/admin/ai/sections/FunctionsSection.tsx` (FR-002)

## Fase 3: Historia 2 — Recuperación de extracción

- [x] T006 [US2] Ampliar el transporte multimodal JSON de Ollama en `backend/app/services/ollama_provider.py` (FR-004)
- [x] T007 [US2] Incorporar Ollama al contrato de extracción multipágina en `backend/app/services/vision_extractor.py` y `backend/app/modules/calificaciones/agents.py` (FR-004–FR-006)
- [x] T008 [US2] Ejecutar el respaldo configurado y registrar proveedor efectivo en `backend/app/modules/calificaciones/orchestrator.py` (FR-003, FR-006–FR-008)

## Fase final

- [x] T009 Ejecutar pruebas focales, tipos, lint y gobernanza; documentar evidencia en `specs/036-ollama-cloud-vision-fallback/quickstart.md`
- [ ] T010 Abrir PR enlazado al issue #74 y someter el hotfix a CI antes de fusionar

## Dependencias

T001–T003 preceden la implementación. T004–T005 habilitan la configuración. T006 precede T007 y T008. T009–T010 cierran el hotfix.
